import type { Action, DecisionEntry, LText, MissionDefinition, MissionId, MissionState, StageId } from './types';
import { baselineDesign, computeMetrics, evaluateRules, blockingFailures, isLaunchReady, optionById, MODEL } from './evaluate';
import { scoreQuiz } from './quizEngine';
import { predictRoute, simulateActivity, SPEED, ARRIVAL_RADIUS, MAX_WAYPOINTS } from './ops';
import { observationAvailability, observationDataMb, observationPowerW, observationQuality, downlinkCapacityMb } from './science';
import { computeOutcome } from './outcome';
import { PUZZLE_CLUES } from '../content/puzzle';
import { round } from './rng';

/**
 * GameState = reduce(initialState, actions). Pure and deterministic:
 * the same mission + seed + action log always produces the same state.
 * Invalid actions are ignored (and noted) so a modified log can always be replayed (What-If machine).
 */

const ALLOWED: Partial<Record<StageId, StageId[]>> = {
  briefing: ['workshop'],
  review: ['workshop'],
  launch: ['orbit'],
  orbit: ['landingSite'],
  surface: ['evidence'],
  evidence: ['report'],
  debrief: ['quizPost'],
};

export function initialState(mission: MissionDefinition, seed: number): MissionState {
  return {
    missionId: mission.id,
    seed,
    stage: mission.stages[0] ?? 'quizPre',
    quiz: { preSkipped: false },
    design: baselineDesign(mission),
    reviewAttempts: 0,
    failedReviews: 0,
    launched: false,
    orbit: { matched: [], mistakes: 0, explored: [] },
    ops: {
      sol: 0,
      batteryWh: 0,
      batteryCapWh: 0,
      wheelHealth: 100,
      electronicsHealth: 100,
      pos: [0, 0],
      path: [],
      drives: 0,
      arrived: false,
      opsReserveM: 0,
      disabledCaps: [],
      energyUsedWh: 0,
      incidents: 0,
      dataStoredMb: 0,
    },
    events: {},
    evidence: { observations: [], alertShown: false, downlinked: [] },
    log: [],
    flags: { unsafeChoices: [], overclaimed: false, notes: [] },
    archiveUnlocked: [],
  };
}

const t = (en: string, vars?: LText['vars']): LText => (vars ? { en, vars } : { en });

function log(s: MissionState, idx: number, entry: Omit<DecisionEntry, 'actionIndex' | 'stage'>) {
  s.log.push({ actionIndex: idx, stage: s.stage, ...entry });
}

function unlock(s: MissionState, id: string) {
  if (!s.archiveUnlocked.includes(id)) s.archiveUnlocked.push(id);
}

function triggerNextEvent(mission: MissionDefinition, s: MissionState) {
  if (s.pendingEvent) return;
  if (s.ops.drives >= 1 && !s.events['ev-power'] && mission.events.some((e) => e.id === 'ev-power')) {
    s.pendingEvent = 'ev-power';
    s.events['ev-power'] = {};
    return;
  }
  if (s.ops.arrived && !s.events['ev-solar'] && mission.events.some((e) => e.id === 'ev-solar')) {
    s.pendingEvent = 'ev-solar';
    s.events['ev-solar'] = {};
  }
}

export function step(mission: MissionDefinition, prev: MissionState, action: Action, idx: number): MissionState {
  const s: MissionState = structuredClone(prev);
  const metrics = computeMetrics(mission, s.design);

  switch (action.type) {
    case 'ANSWER_PRE_QUIZ': {
      if (s.stage !== 'quizPre') return prev;
      s.quiz.pre = scoreQuiz(mission.quizPre, action.answers);
      log(s, idx, { kind: 'quiz', title: t('Baseline knowledge check saved'), detail: t('Your answers were recorded before any teaching began.') });
      s.stage = 'briefing';
      return s;
    }
    case 'SKIP_PRE_QUIZ': {
      if (s.stage !== 'quizPre') return prev;
      s.quiz.preSkipped = true;
      log(s, idx, { kind: 'quiz', title: t('Knowledge check skipped'), detail: t('No before/after learning comparison will be available for this mission.') });
      s.stage = 'briefing';
      return s;
    }
    case 'SET_PRIORITY': {
      if (s.stage !== 'briefing' && s.stage !== 'workshop') return prev;
      if (!mission.hypotheses.some((h) => h.id === action.hypothesisId)) return prev;
      s.sciencePriority = action.hypothesisId;
      return s;
    }
    case 'ADVANCE': {
      const ok = ALLOWED[s.stage]?.includes(action.to);
      if (!ok) return prev;
      if (s.stage === 'briefing' && !s.sciencePriority) return prev;
      if (s.stage === 'surface' && (!s.ops.arrived || s.pendingEvent)) return prev;
      if (s.stage === 'evidence' && (s.evidence.observations.length === 0 || (s.evidence.alertShown && !s.evidence.alertChoice))) return prev;
      if (s.stage === 'briefing') {
        const h = mission.hypotheses.find((x) => x.id === s.sciencePriority);
        log(s, idx, { kind: 'science', title: t('Science priority chosen'), detail: t('Main question: {h}', { h: h?.name ?? '' }) });
      }
      s.stage = action.to;
      return s;
    }
    case 'SELECT_COMPONENT': {
      if (s.stage !== 'workshop') return prev;
      const slot = mission.slots.find((x) => x.id === action.slot);
      if (!slot || slot.multi || !slot.options.some((o) => o.id === action.optionId)) return prev;
      s.design.selections[action.slot] = action.optionId;
      return s;
    }
    case 'TOGGLE_ADDON': {
      if (s.stage !== 'workshop') return prev;
      const o = optionById(mission, action.optionId);
      if (!o || o.slot !== 'instruments') return prev;
      s.design.addons = s.design.addons.includes(o.id) ? s.design.addons.filter((x) => x !== o.id) : [...s.design.addons, o.id];
      return s;
    }
    case 'REQUEST_REVIEW': {
      if (s.stage !== 'workshop') return prev;
      s.reviewAttempts++;
      const rules = evaluateRules(mission, s.design, s.sciencePriority);
      const fails = blockingFailures(rules);
      if (fails.length) {
        s.failedReviews++;
        log(s, idx, { kind: 'design', title: t('Readiness review: not ready'), detail: fails[0].message });
      }
      s.stage = 'review';
      return s;
    }
    case 'CONFIRM_LAUNCH': {
      if (s.stage !== 'review') return prev;
      if (!isLaunchReady(evaluateRules(mission, s.design, s.sciencePriority))) return prev;
      s.launched = true;
      s.ops.batteryCapWh = metrics.batteryWh;
      s.ops.batteryWh = metrics.batteryWh;
      s.ops.opsReserveM = metrics.reserveRemainingM;
      const p = optionById(mission, s.design.selections.power);
      const c = optionById(mission, s.design.selections.camera);
      log(s, idx, {
        kind: 'design',
        checkpoint: true,
        title: t('Mission design locked'),
        detail: t('{power}, {camera}, {n} extra instruments. Cost ${cost}M, reserve ${res}M, rover {mass} kg.', {
          power: p?.name ?? '',
          camera: c?.name ?? '',
          n: s.design.addons.length,
          cost: metrics.costM,
          res: metrics.reserveRemainingM,
          mass: metrics.roverMassKg,
        }),
      });
      s.stage = 'launch';
      return s;
    }
    case 'EXPLORE': {
      if (!s.orbit.explored.includes(action.cardId)) s.orbit.explored.push(action.cardId);
      return s;
    }
    case 'PUZZLE_MATCH': {
      if (s.stage !== 'orbit') return prev;
      const clue = PUZZLE_CLUES.find((c) => c.id === action.clueId);
      if (!clue || s.orbit.matched.includes(clue.id)) return prev;
      if (clue.answer === action.missionKey) s.orbit.matched.push(clue.id);
      else s.orbit.mistakes++;
      return s;
    }
    case 'CHOOSE_LANDING_SITE': {
      if (s.stage !== 'landingSite') return prev;
      let site = mission.landingSites.find((x) => x.id === action.siteId);
      if (!site) return prev;
      if (metrics.ellipseKm > site.maxEllipseKm) {
        // Replays with a less precise landing system fall back to the closest reachable site.
        const reachable = mission.landingSites.filter((x) => metrics.ellipseKm <= x.maxEllipseKm).sort((a, b) => a.maxEllipseKm - b.maxEllipseKm);
        if (!reachable.length) return prev;
        s.flags.notes.push(t('{a} needs a more precise landing system; the mission landed at {b} instead.', { a: site.name, b: reachable[0].name }));
        site = reachable[0];
      }
      s.landingSite = site.id;
      s.ops.pos = [...site.start];
      s.ops.path = [[...site.start]];
      s.ops.sol = 1;
      unlock(s, 'arch-jezero');
      log(s, idx, { kind: 'operation', checkpoint: true, title: t('Landed at {site}', { site: site.name }), detail: t('Landing ellipse {e} km. Sol 1 begins.', { e: metrics.ellipseKm }) });
      s.stage = 'surface';
      return s;
    }
    case 'EXECUTE_ROUTE': {
      if (s.stage !== 'surface' || s.pendingEvent || s.ops.arrived) return prev;
      const wps = action.waypoints.slice(0, MAX_WAYPOINTS);
      if (!wps.length) return prev;
      const pred = predictRoute(metrics, s.ops.pos, wps, action.speed, mission.target);
      if (pred.blocked) {
        s.flags.notes.push(t('A planned route was rejected: a slope is too steep for this chassis.'));
        return s;
      }
      const powerW = pred.hours > 0 ? pred.energyWh / pred.hours : metrics.drivePowerW;
      const act = simulateActivity(s.ops, metrics, pred.hours, powerW, MODEL.driveHoursPerSol);
      s.ops.sol += act.sols;
      s.ops.batteryWh = act.batteryEnd;
      s.ops.energyUsedWh += act.energyUsed;
      s.ops.wheelHealth = Math.max(0, s.ops.wheelHealth - (pred.distanceM / 1000) * 4 * (1.2 - metrics.wheelDurability) * SPEED[action.speed].wear);
      let incidentText = '';
      if (pred.incidentSegment !== null) {
        s.ops.incidents++;
        s.ops.sol += 1;
        s.ops.wheelHealth = Math.max(0, s.ops.wheelHealth - 15 * (1.5 - metrics.wheelDurability));
        s.ops.batteryWh = Math.max(s.ops.batteryCapWh * MODEL.batteryFloor, s.ops.batteryWh - 150);
        incidentText = ' Wheel slip on a risky slope: one sol lost freeing the rover.';
      }
      s.ops.pos = [...wps[wps.length - 1]];
      s.ops.path.push(...wps.map((w) => [...w] as [number, number]));
      s.ops.drives++;
      const tgt = mission.target;
      if (Math.hypot(s.ops.pos[0] - tgt[0], s.ops.pos[1] - tgt[1]) <= ARRIVAL_RADIUS) {
        s.ops.arrived = true;
        unlock(s, 'arch-cheyava');
      }
      log(s, idx, {
        kind: pred.incidentSegment !== null ? 'safety' : 'operation',
        checkpoint: true,
        title: t('Drive {n} ({mode})', { n: s.ops.drives, mode: action.speed }),
        detail: t('{d} m in {sols} sols using {e} Wh.' + incidentText, { d: round(pred.distanceM), sols: round(act.sols, 1), e: round(act.energyUsed) }),
      });
      triggerNextEvent(mission, s);
      return s;
    }
    case 'EVENT_CHOICE': {
      if (s.pendingEvent !== action.eventId) return prev;
      const ev = mission.events.find((e) => e.id === action.eventId);
      const opt = ev?.options.find((o) => o.id === action.optionId);
      if (!ev || !opt) return prev;
      let choice = opt.id;
      if (ev.id === 'ev-power') {
        if (choice === 'reserve' && s.ops.opsReserveM < 40) {
          s.flags.notes.push(t('Not enough reserve left for the engineering fix, so reduced capacity was accepted.'));
          choice = 'accept';
        }
        if (choice === 'shed') {
          s.ops.batteryCapWh *= 0.9;
          s.ops.disabledCaps.push('environment', 'subsurface');
        } else if (choice === 'reserve') {
          s.ops.opsReserveM -= 40;
          s.ops.batteryCapWh *= 0.97;
          s.ops.sol += 1;
        } else {
          s.ops.batteryCapWh *= 0.8;
        }
        s.ops.batteryWh = Math.min(s.ops.batteryWh, s.ops.batteryCapWh);
      } else if (ev.id === 'ev-solar') {
        const exposure = 1 - metrics.radiationHardness;
        if (choice === 'safe') s.ops.sol += 1;
        else if (choice === 'replan') {
          s.ops.sol += 0.5;
          s.ops.electronicsHealth = Math.max(0, s.ops.electronicsHealth - exposure * 10);
        } else {
          s.ops.electronicsHealth = Math.max(0, s.ops.electronicsHealth - exposure * 60);
          s.flags.unsafeChoices.push('ev-solar');
          if (s.ops.electronicsHealth < 60 && !s.ops.disabledCaps.includes('organics')) {
            s.ops.disabledCaps.push('organics');
            s.flags.notes.push(t('Radiation damaged the organics spectrometer. It is offline for the rest of the mission.'));
          }
        }
      }
      const finalOpt = ev.options.find((o) => o.id === choice) ?? opt;
      s.events[ev.id] = { choice };
      log(s, idx, { kind: finalOpt.unsafe ? 'safety' : 'event', checkpoint: true, title: ev.title, detail: t('{label}: {effects}', { label: finalOpt.label, effects: finalOpt.effects }) });
      s.pendingEvent = undefined;
      triggerNextEvent(mission, s);
      return s;
    }
    case 'RUN_OBSERVATION': {
      if (s.stage !== 'evidence') return prev;
      if (s.evidence.alertShown && !s.evidence.alertChoice) return prev;
      const obs = mission.observations.find((o) => o.id === action.observationId);
      if (!obs || !observationAvailability(mission, s, metrics, obs).ok) return prev;
      const act = simulateActivity(s.ops, metrics, obs.hours, observationPowerW(mission, s.design, obs), MODEL.scienceHoursPerSol);
      if (!act.completed) {
        s.flags.notes.push(t('Not enough energy to complete {o}.', { o: obs.name }));
        return s;
      }
      s.ops.sol += act.sols;
      s.ops.batteryWh = act.batteryEnd;
      s.ops.energyUsedWh += act.energyUsed;
      const quality = observationQuality(mission, s, obs);
      s.evidence.observations.push({ id: obs.id, quality, sol: s.ops.sol });
      s.ops.dataStoredMb += observationDataMb(mission, s.design, obs);
      log(s, idx, { kind: 'science', title: obs.name, detail: t('Quality: {q}. {sols} sols, {e} Wh.', { q: quality, sols: round(act.sols, 1), e: round(act.energyUsed) }) });
      if ((obs.id === 'obs-xrf' || obs.id === 'obs-raman') && !s.evidence.alertShown) s.evidence.alertShown = true;
      return s;
    }
    case 'ALERT_CHOICE': {
      if (s.stage !== 'evidence' || !s.evidence.alertShown || s.evidence.alertChoice) return prev;
      s.evidence.alertChoice = action.choice;
      if (action.choice === 'announce') s.flags.overclaimed = true;
      const titles = {
        announce: t('Announced a discovery immediately'),
        gather: t('Chose to gather independent measurements'),
        cautious: t('Chose a cautious interpretation'),
      };
      log(s, idx, {
        kind: action.choice === 'announce' ? 'safety' : 'science',
        checkpoint: true,
        title: titles[action.choice],
        detail: action.choice === 'announce' ? t('A claim was made before the evidence could support it.') : t('Evidence before certainty.'),
      });
      return s;
    }
    case 'SET_DOWNLINK': {
      if (s.stage !== 'report') return prev;
      const cap = downlinkCapacityMb(mission, s, metrics);
      let used = 0;
      const chosen: string[] = [];
      for (const id of action.observationIds) {
        const obs = mission.observations.find((o) => o.id === id);
        if (!obs || !s.evidence.observations.some((r) => r.id === id) || chosen.includes(id)) continue;
        const mb = observationDataMb(mission, s.design, obs);
        if (used + mb > cap) continue;
        used += mb;
        chosen.push(id);
      }
      s.evidence.downlinked = chosen;
      return s;
    }
    case 'SUBMIT_REPORT': {
      if (s.stage !== 'report') return prev;
      s.evidence.report = action.statementIds.filter((id) => mission.statements.some((x) => x.id === id));
      unlock(s, 'arch-perseverance');
      unlock(s, 'arch-instruments');
      s.outcome = computeOutcome(mission, s);
      log(s, idx, { kind: 'science', checkpoint: true, title: t('Science report sent to Earth'), detail: t('{n} statements, {d} data products downlinked.', { n: s.evidence.report.length, d: s.evidence.downlinked.length }) });
      s.stage = 'debrief';
      return s;
    }
    case 'ANSWER_POST_QUIZ': {
      if (s.stage !== 'quizPost') return prev;
      s.quiz.post = scoreQuiz(mission.quizPost, action.answers);
      s.stage = 'results';
      return s;
    }
  }
  return prev;
}

export function replay(mission: MissionDefinition, seed: number, actions: Action[]): MissionState {
  return actions.reduce((st, a, i) => step(mission, st, a, i), initialState(mission, seed));
}

/* ------------------------------------------------------------------ */
/* What-If machine                                                     */
/* ------------------------------------------------------------------ */

export interface WhatIfResult {
  original: MissionState;
  alternative: MissionState;
  passedReview: boolean;
  failures: LText[];
}

/**
 * Re-run the same mission rules with a different Earth design. Every later decision
 * (landing site, routes, event choices, observations, downlink, report) is re-applied;
 * those that no longer make sense are skipped. The outcome is genuinely recomputed.
 */
export function whatIfDesign(mission: MissionDefinition, seed: number, actions: Action[], changes: Action[]): WhatIfResult {
  const original = replay(mission, seed, actions);
  const launchIdx = actions.findIndex((a) => a.type === 'CONFIRM_LAUNCH');
  if (launchIdx < 0) return { original, alternative: original, passedReview: false, failures: [] };
  const alt: Action[] = [...actions.slice(0, launchIdx), { type: 'ADVANCE', to: 'workshop' }, ...changes, { type: 'REQUEST_REVIEW' }];
  const atReview = replay(mission, seed, alt);
  const rules = evaluateRules(mission, atReview.design, atReview.sciencePriority);
  if (!isLaunchReady(rules)) {
    return { original, alternative: atReview, passedReview: false, failures: blockingFailures(rules).map((r) => r.message) };
  }
  // The original quiz/post stages after the report are not replayed.
  const rest = actions.slice(launchIdx).filter((a) => a.type !== 'ANSWER_POST_QUIZ' && !(a.type === 'ADVANCE' && a.to === 'quizPost'));
  const alternative = replay(mission, seed, [...alt, ...rest]);
  if (!alternative.outcome) alternative.outcome = computeOutcome(mission, alternative);
  return { original, alternative, passedReview: true, failures: [] };
}

export const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
export type { MissionId };
