import type { Action, DecisionEntry, LText, MissionDefinition, MissionId, MissionState, StageId } from './types';
import { baselineDesign, computeMetrics, evaluateRules, blockingFailures, isLaunchReady, optionById, MODEL } from './evaluate';
import { scoreQuiz } from './quizEngine';
import { predictRoute, simulateActivity, SPEED, ARRIVAL_RADIUS, MAX_WAYPOINTS } from './ops';
import { observationAvailability, observationDataMb, observationPowerW, observationQuality, downlinkCapacityMb, statementSupported } from './science';
import { computeOutcome } from './outcome';
import { PUZZLE_CLUES } from '../content/puzzle';
import { round } from './rng';
import { BOARD_RADIUS, DISCOVER_RADIUS, SOL_HOURS, batteryFloor, driveCost, hasBuggy, mobilityMetrics, netPerSol, siteDistance, stepOffPoint } from './explore';
import { OBS_VALUE } from './science';

/**
 * GameState = reduce(initialState, actions). Pure and deterministic:
 * the same mission + seed + action log always produces the same state.
 * Invalid actions are ignored (and noted) so a modified log can always be replayed (What-If machine).
 */

const ALLOWED: Partial<Record<StageId, StageId[]>> = {
  briefing: ['workshop'],
  review: ['workshop'],
  launch: ['orbit', 'opsPreview', 'observe'],
  orbit: ['landingSite', 'cruise', 'surface'],
  cruise: ['surface'],
  surface: ['evidence'],
  evidence: ['report'],
  debrief: ['quizPost'],
};

const clamp01 = (v: number) => Math.max(0, Math.min(100, v));
const landerSite = (mission: MissionDefinition) => mission.sites?.find((x) => x.kind === 'lander');
const mainSite = (mission: MissionDefinition) => mission.sites?.find((x) => x.kind === 'rock' || x.kind === 'heritage');
function evaLimit(mission: MissionDefinition, s: MissionState) {
  const base = mission.world?.evaHours ?? 7;
  const fatigue = s.crew?.vitals.fatigue ?? 0;
  return Math.max(2.5, base * (1 - fatigue / 220));
}
function startSurface(mission: MissionDefinition, s: MissionState) {
  const start = mission.world?.start ?? [0, 0];
  s.ops.pos = [start[0], start[1]];
  s.ops.path = [[start[0], start[1]]];
  s.ops.sol = Math.max(1, s.ops.sol);
  if (mission.type === 'crewed') {
    s.ops.evaMaxH = evaLimit(mission, s);
    s.ops.oxygenH = s.ops.evaMaxH;
  }
}
function endEva(mission: MissionDefinition, s: MissionState, restore = 25) {
  const l = landerSite(mission);
  if (l) s.ops.pos = [l.pos[0] + 6, l.pos[1] + 6];
  s.ops.sol = Math.floor(s.ops.sol) + 1;
  s.ops.rests++;
  if (s.crew) {
    const v = s.crew.vitals;
    v.fatigue = Math.max(5, v.fatigue - restore);
    v.hydration = clamp01(v.hydration + 15);
    v.sleepDebtH = 0;
  }
  s.ops.evaMaxH = evaLimit(mission, s);
  s.ops.oxygenH = s.ops.evaMaxH;
}
function spendEva(mission: MissionDefinition, s: MissionState, idx: number, hours: number) {
  s.ops.oxygenH -= hours;
  s.ops.evaUsedH += hours;
  if (s.crew) {
    s.crew.vitals.fatigue = clamp01(s.crew.vitals.fatigue + hours * 3);
    s.crew.vitals.hydration = clamp01(s.crew.vitals.hydration - hours * 2);
  }
  if (s.ops.oxygenH <= 0) {
    if (!s.flags.unsafeChoices.includes('eva-limit')) s.flags.unsafeChoices.push('eva-limit');
    log(s, idx, { kind: 'safety', title: t('EVA limit exceeded'), detail: t('Suit consumables ran out far from the lander. The crew was ordered straight back — a safety violation.') });
    endEva(mission, s, 10);
  }
}

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
      heading: 0,
      distanceU: 0,
      rests: 0,
      bumps: 0,
      sitesFound: [],
      solarFactor: 1,
      dustUntil: 0,
      oxygenH: 0,
      evaMaxH: 0,
      evaUsedH: 0,
      inKeepOut: false,
      keepOutViolations: 0,
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
  if (mission.eventTriggers) {
    for (const ev of mission.events) {
      if (s.events[ev.id]) continue;
      const tr = mission.eventTriggers[ev.id];
      if (!tr) continue;
      const ok =
        (tr.sol === undefined || s.ops.sol >= tr.sol) &&
        (tr.distance === undefined || s.ops.distanceU >= tr.distance) &&
        (!tr.arrive || s.ops.arrived) &&
        (tr.evaUsed === undefined || s.ops.evaUsedH >= tr.evaUsed) &&
        (tr.observations === undefined || s.evidence.observations.length >= tr.observations);
      if (ok) {
        s.pendingEvent = ev.id;
        s.events[ev.id] = {};
        return;
      }
    }
    return;
  }
  const open = !!mission.sites;
  if (open && s.ops.sol >= 4 && !s.events['ev-dust'] && mission.events.some((e) => e.id === 'ev-dust')) {
    s.pendingEvent = 'ev-dust';
    s.events['ev-dust'] = {};
    return;
  }
  if ((open ? s.ops.distanceU >= 120 : s.ops.drives >= 1) && !s.events['ev-power'] && mission.events.some((e) => e.id === 'ev-power')) {
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
      if (s.stage === 'cruise' && s.crew && s.crew.step < (mission.cruise?.length ?? 0)) return prev;
      if (action.to === 'surface' && (s.stage === 'orbit' || s.stage === 'cruise')) startSurface(mission, s);
      if (action.to === 'observe') {
        s.scope = { night: 1, hoursLeft: mission.telescope?.hoursPerNight ?? 6, pointed: false, images: [] };
        s.ops.sol = 1;
      }
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
      if (mission.crew) s.crew = { vitals: { fatigue: 20, hydration: 80, fitness: 80, stress: 25, doseMSv: 0, sleepDebtH: 1 }, step: 0, choices: {}, scienceBonus: 0 };
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
        incidentText = 'incident';
      }
      s.ops.pos = [...wps[wps.length - 1]];
      s.ops.path.push(...wps.map((w) => [...w] as [number, number]));
      s.ops.drives++;
      const tgt = mission.target;
      if (Math.hypot(s.ops.pos[0] - tgt[0], s.ops.pos[1] - tgt[1]) <= ARRIVAL_RADIUS) {
        s.ops.arrived = true;
        unlock(s, 'arch-cheyava');
      }
      const modeLabel = { cautious: t('Cautious'), standard: t('Standard'), fast: t('Fast') }[action.speed];
      const driveVars = { d: round(pred.distanceM), sols: round(act.sols, 1), e: round(act.energyUsed) };
      log(s, idx, {
        kind: pred.incidentSegment !== null ? 'safety' : 'operation',
        checkpoint: true,
        title: t('Drive {n} ({mode})', { n: s.ops.drives, mode: modeLabel }),
        detail: incidentText
          ? t('{d} m in {sols} sols using {e} Wh. Wheel slip on a risky slope: one sol lost freeing the rover.', driveVars)
          : t('{d} m in {sols} sols using {e} Wh.', driveVars),
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
      } else if (ev.id === 'ev-fatigue') {
        const v = s.crew?.vitals;
        if (choice === 'end') endEva(mission, s, 30);
        else if (choice === 'reorganize') {
          s.ops.oxygenH = Math.max(0.5, s.ops.oxygenH - 1);
          if (v) v.fatigue = clamp01(v.fatigue - 5);
        } else {
          if (v) v.fatigue = clamp01(v.fatigue + 15);
          if ((v?.fatigue ?? 0) >= 55) s.flags.unsafeChoices.push('ev-fatigue');
        }
      } else if (ev.id === 'ev-solar-crew') {
        const v = s.crew?.vitals;
        const exposure = 1 - metrics.radiationHardness;
        if (choice === 'shelter') {
          const l = landerSite(mission);
          if (l) s.ops.pos = [l.pos[0] + 6, l.pos[1] + 6];
          s.ops.sol += 0.5;
          if (v) v.doseMSv += 1;
        } else if (choice === 'postpone') {
          s.ops.oxygenH = Math.max(0.5, s.ops.oxygenH - 1.5);
          if (v) v.doseMSv += 4 * exposure + 1;
        } else {
          if (v) v.doseMSv += 40 * exposure + 5;
          s.flags.unsafeChoices.push('ev-solar-crew');
        }
      } else if (ev.id === 'ev-solar-scope') {
        const exposure = 1 - metrics.radiationHardness;
        if (choice === 'safe') {
          if (s.scope) s.scope.hoursLeft = Math.max(0, s.scope.hoursLeft - 2);
        } else {
          s.ops.electronicsHealth = Math.max(0, s.ops.electronicsHealth - exposure * 60);
          s.flags.unsafeChoices.push('ev-solar-scope');
        }
      } else if (ev.id === 'ev-dust') {
        if (choice === 'wait') {
          s.ops.sol += 2;
          s.ops.dustUntil = s.ops.sol;
          if (metrics.powerSource !== 'solar') s.ops.batteryWh = s.ops.batteryCapWh;
        } else {
          s.ops.dustUntil = s.ops.sol + 3;
        }
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
      if ((s.stage !== 'evidence' && s.stage !== 'surface') || !s.evidence.alertShown || s.evidence.alertChoice) return prev;
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
    case 'DRIVE': {
      if (s.stage !== 'surface' || s.pendingEvent) return prev;
      const dist = Math.max(0, Math.min(action.dist, 400));
      const cost = driveCost(mobilityMetrics(mission, metrics, s.ops), dist, action.slopeAvg, action.boostFrac);
      const floor = batteryFloor(s.ops);
      if (mission.type === 'crewed') {
        s.ops.distanceU += dist;
        s.ops.pos = [action.pos[0], action.pos[1]];
        s.ops.heading = action.heading;
        s.ops.sol += cost.hours / 24;
        const wk = s.ops.onFoot ? 0 : 1.2 - metrics.wheelDurability;
        s.ops.wheelHealth = Math.max(0, s.ops.wheelHealth - dist * 0.01 * wk - action.bumps * 2 * wk);
        s.ops.bumps += action.bumps;
        spendEva(mission, s, idx, cost.hours);
      } else {
      s.ops.sol += cost.hours / SOL_HOURS;
      s.ops.batteryWh = Math.min(s.ops.batteryCapWh, s.ops.batteryWh - cost.energyWh + (netPerSol(metrics, s.ops) * cost.hours) / SOL_HOURS);
      let forced = 0;
      while (s.ops.batteryWh < floor && forced < 10) {
        // Replays with a smaller battery: the rover must stop and recharge.
        const gain = netPerSol(metrics, s.ops);
        if (gain <= 0) break;
        s.ops.sol += 1;
        s.ops.rests++;
        s.ops.batteryWh = Math.min(s.ops.batteryCapWh, s.ops.batteryWh + gain);
        forced++;
      }
      if (forced) s.flags.notes.push(t('The battery ran down, so the rover had to stop and recharge for {n} sols.', { n: forced }));
      s.ops.energyUsedWh += cost.energyWh;
      const wearK = 1.2 - metrics.wheelDurability;
      s.ops.wheelHealth = Math.max(0, s.ops.wheelHealth - dist * 0.02 * wearK * (1 + action.boostFrac * 0.8) - action.bumps * 2.5 * wearK);
      s.ops.bumps += action.bumps;
      s.ops.distanceU += dist;
      s.ops.pos = [action.pos[0], action.pos[1]];
      s.ops.heading = action.heading;
      }
      const ko = mission.world?.keepOut;
      if (ko) {
        const site = mission.sites?.find((x) => x.id === ko.siteId);
        const inside = !!site && siteDistance(site, s.ops.pos) < ko.radius;
        if (inside && !s.ops.inKeepOut) {
          s.ops.keepOutViolations++;
          if (!s.flags.unsafeChoices.includes('keep-out')) s.flags.unsafeChoices.push('keep-out');
          log(s, idx, { kind: 'safety', title: t('Entered the protected heritage zone'), detail: t('Historic hardware and tracks can be damaged. Document from outside the boundary.') });
        }
        s.ops.inKeepOut = inside;
      }
      for (const site of mission.sites ?? []) {
        if (!s.ops.sitesFound.includes(site.id) && siteDistance(site, s.ops.pos) <= DISCOVER_RADIUS) {
          s.ops.sitesFound.push(site.id);
          log(s, idx, { kind: 'operation', title: t('Discovered: {site}', { site: site.name }), detail: site.hint });
        }
      }
      const rock = mainSite(mission);
      if (rock && !s.ops.arrived && siteDistance(rock, s.ops.pos) <= rock.radius + 6) {
        s.ops.arrived = true;
        if (rock.kind === 'rock') unlock(s, 'arch-cheyava');
      }
      triggerNextEvent(mission, s);
      return s;
    }
    case 'BUGGY': {
      if (s.stage !== 'surface' || s.pendingEvent || !hasBuggy(mission, s.design)) return prev;
      if (action.board) {
        const at = s.ops.buggyPos;
        if (!s.ops.onFoot || !at || Math.hypot(at[0] - s.ops.pos[0], at[1] - s.ops.pos[1]) > BOARD_RADIUS) return prev;
        s.ops.pos = [at[0], at[1]];
        s.ops.heading = s.ops.buggyHeading ?? s.ops.heading;
        s.ops.onFoot = false;
      } else {
        if (s.ops.onFoot) return prev;
        s.ops.onFoot = true;
        s.ops.buggyPos = [s.ops.pos[0], s.ops.pos[1]];
        s.ops.buggyHeading = s.ops.heading;
        s.ops.pos = stepOffPoint(s.ops.pos, s.ops.heading);
      }
      return s;
    }
    case 'REST': {
      if (s.stage !== 'surface' || s.pendingEvent) return prev;
      if (mission.type === 'crewed') {
        const l = landerSite(mission);
        if (!l || siteDistance(l, s.ops.pos) > l.radius + 8) return prev;
        endEva(mission, s);
        log(s, idx, { kind: 'operation', title: t('EVA ended at the lander'), detail: t('The crew rested, ate and slept. Suits refilled.') });
        triggerNextEvent(mission, s);
        return s;
      }
      s.ops.sol = Math.floor(s.ops.sol) + 1;
      s.ops.rests++;
      s.ops.batteryWh = Math.min(s.ops.batteryCapWh, Math.max(batteryFloor(s.ops), s.ops.batteryWh) + Math.max(0, netPerSol(metrics, s.ops)));
      triggerNextEvent(mission, s);
      return s;
    }
    case 'INVESTIGATE': {
      if (s.stage !== 'surface' || s.pendingEvent) return prev;
      if (s.evidence.alertShown && !s.evidence.alertChoice) return prev;
      const site = mission.sites?.find((x) => x.id === action.siteId);
      const obs = mission.observations.find((o) => o.id === action.observationId);
      if (!site || !obs || !site.observations.includes(obs.id)) return prev;
      if (siteDistance(site, s.ops.pos) > site.radius + 6) return prev;
      if (!observationAvailability(mission, s, metrics, obs).ok) return prev;
      if (obs.id === 'obs-depot' && !s.evidence.observations.some((o) => o.id === 'obs-cache')) return prev;
      if (mission.type === 'crewed') {
        const quality = observationQuality(mission, s, obs);
        s.evidence.observations.push({ id: obs.id, quality, sol: s.ops.sol, site: site.id });
        s.ops.dataStoredMb += observationDataMb(mission, s.design, obs);
        log(s, idx, { kind: 'science', title: obs.name, detail: t('{site} · quality: {q}', { site: site.name, q: quality }) });
        spendEva(mission, s, idx, obs.hours);
        triggerNextEvent(mission, s);
        return s;
      }
      const act = simulateActivity(s.ops, metrics, obs.hours, observationPowerW(mission, s.design, obs), MODEL.scienceHoursPerSol);
      if (!act.completed) {
        s.flags.notes.push(t('Not enough energy to complete {o}.', { o: obs.name }));
        return s;
      }
      s.ops.sol += act.sols;
      s.ops.batteryWh = act.batteryEnd;
      s.ops.energyUsedWh += act.energyUsed;
      const quality = observationQuality(mission, s, obs);
      s.evidence.observations.push({ id: obs.id, quality, sol: s.ops.sol, site: site.id });
      s.ops.dataStoredMb += observationDataMb(mission, s.design, obs);
      if (obs.id === 'obs-dust-devil' && metrics.powerSource === 'solar') {
        s.ops.solarFactor = Math.min(1.15, s.ops.solarFactor + 0.15);
        log(s, idx, { kind: 'science', title: t('A dust devil cleaned your solar panels'), detail: t('Solar power output increased by about 15%.') });
      }
      log(s, idx, { kind: 'science', title: obs.name, detail: t('{site} · quality: {q}', { site: site.name, q: quality }) });
      if ((obs.id === 'obs-xrf' || obs.id === 'obs-raman') && !s.evidence.alertShown) s.evidence.alertShown = true;
      triggerNextEvent(mission, s);
      return s;
    }
    case 'CREW_CHOICE': {
      if (s.stage !== 'cruise' || !s.crew || !mission.cruise) return prev;
      const stepDef = mission.cruise[s.crew.step];
      if (!stepDef || stepDef.id !== action.stepId) return prev;
      const opt = stepDef.options.find((o) => o.id === action.optionId);
      if (!opt) return prev;
      const v = s.crew.vitals;
      const e = opt.effects;
      if (e.fatigue) v.fatigue = clamp01(v.fatigue + e.fatigue);
      if (e.hydration) v.hydration = clamp01(v.hydration + e.hydration);
      if (e.fitness) v.fitness = clamp01(v.fitness + e.fitness);
      if (e.stress) v.stress = clamp01(v.stress + e.stress);
      if (e.doseMSv) v.doseMSv = Math.max(0, v.doseMSv + e.doseMSv * (1 - metrics.radiationHardness * 0.6));
      if (e.sleepDebtH) v.sleepDebtH = Math.max(0, v.sleepDebtH + e.sleepDebtH);
      if (e.science) s.crew.scienceBonus += e.science;
      if (opt.unsafe) s.flags.unsafeChoices.push('cruise-' + stepDef.id);
      s.crew.choices[stepDef.id] = opt.id;
      s.crew.step++;
      log(s, idx, { kind: opt.unsafe ? 'safety' : 'operation', title: stepDef.title, detail: opt.label });
      return s;
    }
    case 'SCOPE_POINT': {
      if (s.stage !== 'observe' || !s.scope || s.scope.pointed || s.pendingEvent) return prev;
      const h = metrics.capabilities.includes('fast-slew') ? 0.3 : 1.2;
      if (s.scope.hoursLeft < h) return prev;
      s.scope.hoursLeft -= h;
      s.scope.pointed = true;
      s.ops.arrived = true;
      return s;
    }
    case 'SCOPE_IMAGE': {
      if (s.stage !== 'observe' || !s.scope || !s.scope.pointed || s.pendingEvent) return prev;
      const need = action.filter === 'visible' ? 'visible' : action.filter === 'uv' ? 'uv' : 'infrared';
      if (!metrics.capabilities.includes(need) || s.scope.hoursLeft < action.exposure) return prev;
      const tel = mission.telescope!;
      const optics = optionById(mission, s.design.selections.optics)?.tier ?? 'basic';
      const ap = optics === 'advanced' ? 2.33 : optics === 'balanced' ? 1.67 : 1;
      const bright = tel.brightness[Math.min(tel.brightness.length - 1, s.scope.night - 1)];
      let snr = 10 * ap * Math.sqrt(action.exposure / 0.5) * Math.sqrt(bright) * (s.ops.electronicsHealth < 60 ? 0.6 : 1);
      const bus = optionById(mission, s.design.selections.platform)?.tier ?? 'basic';
      if (action.exposure >= 1 && bus === 'basic') snr *= 0.6;
      const quality = snr < 8 ? 'low' : snr < 16 ? 'good' : 'high';
      s.scope.hoursLeft -= action.exposure;
      s.scope.images.push({ night: s.scope.night, filter: action.filter, exposure: action.exposure, snr, quality });
      const addObs = (id: string) => {
        if (!s.evidence.observations.some((o) => o.id === id)) s.evidence.observations.push({ id, quality, sol: s.ops.sol });
      };
      addObs('obs-n' + s.scope.night);
      if (action.filter === 'uv') addObs('obs-uv');
      if (action.filter === 'infrared') addObs('obs-ir');
      log(s, idx, { kind: 'science', title: t('Night {n}: {f} image', { n: s.scope.night, f: action.filter }), detail: t('Signal-to-noise {snr} · quality: {q}', { snr: Math.round(snr), q: quality }) });
      triggerNextEvent(mission, s);
      return s;
    }
    case 'SCOPE_SPECTRUM': {
      if (s.stage !== 'observe' || !s.scope || !s.scope.pointed || s.pendingEvent || s.scope.spectrum) return prev;
      if (!metrics.capabilities.includes('spectrum') || s.scope.hoursLeft < 1.5) return prev;
      const optics = optionById(mission, s.design.selections.optics)?.tier ?? 'basic';
      const quality = optics === 'basic' ? 'low' : optics === 'balanced' ? 'good' : 'high';
      s.scope.hoursLeft -= 1.5;
      s.scope.spectrum = quality;
      s.evidence.observations.push({ id: 'obs-spectrum', quality, sol: s.ops.sol });
      log(s, idx, { kind: 'science', title: t('Spectrum taken'), detail: t('quality: {q}', { q: quality }) });
      return s;
    }
    case 'SCOPE_NEXT_NIGHT': {
      if (s.stage !== 'observe' || !s.scope || s.pendingEvent) return prev;
      const tel = mission.telescope!;
      if (s.scope.night >= tel.nights) return prev;
      s.scope.night++;
      s.scope.hoursLeft = tel.hoursPerNight;
      s.scope.pointed = false;
      s.ops.sol += 1;
      triggerNextEvent(mission, s);
      return s;
    }
    case 'SEND_REPORT': {
      if ((s.stage !== 'surface' && s.stage !== 'observe') || s.pendingEvent || s.evidence.observations.length === 0) return prev;
      if (s.evidence.alertShown && !s.evidence.alertChoice) return prev;
      // Automatic downlink: most valuable data first, within the capacity your antenna allows.
      const cap = downlinkCapacityMb(mission, s, metrics);
      const ranked = [...s.evidence.observations].sort((a, b) => (OBS_VALUE[b.id] ?? 0) - (OBS_VALUE[a.id] ?? 0));
      let used = 0;
      const sent: string[] = [];
      for (const r of ranked) {
        const o = mission.observations.find((x) => x.id === r.id);
        if (!o) continue;
        const mb = observationDataMb(mission, s.design, o);
        if (used + mb > cap) continue;
        used += mb;
        sent.push(r.id);
      }
      s.evidence.downlinked = sent;
      const did = (id: string) => s.evidence.observations.some((o) => o.id === id);
      const statements: string[] = [];
      if (action.conclusion === 'summary' || mission.reportStyle === 'summary' || mission.telescope) {
        for (const st of mission.statements) {
          if (st.kind === 'caution') statements.push(st.id);
          else if (st.kind === 'supported-claim' && statementSupported(st, sent)) statements.push(st.id);
        }
        if (action.conclusion === 'proven') statements.push(...mission.statements.filter((x) => x.kind === 'overclaim').map((x) => x.id));
        if (action.conclusion === 'nothing') statements.splice(0, statements.length, ...mission.statements.filter((x) => x.kind === 'dismissive').map((x) => x.id));
        if (action.conclusion === 'proven') s.flags.overclaimed = true;
        s.evidence.report = statements;
        s.outcome = computeOutcome(mission, s);
        log(s, idx, { kind: 'science', checkpoint: true, title: t('Mission summary sent to Earth'), detail: t('{d} of {n} data products fit in the downlink.', { d: sent.length, n: s.evidence.observations.length }) });
        s.stage = 'debrief';
        return s;
      }
      if (action.conclusion === 'proven') statements.push('st-proven');
      else if (action.conclusion === 'nothing') statements.push('st-unimportant');
      else {
        if (action.conclusion === 'potential') statements.push('st-potential');
        statements.push('st-abiotic');
        statements.push('st-next');
        if (did('obs-xrf')) statements.push('st-minerals');
        if (did('obs-raman')) statements.push('st-organics');
        if (did('obs-context') || did('obs-radar') || did('obs-delta-pano')) statements.push('st-water');
        if (did('obs-cache')) statements.push('st-sample');
      }
      if (action.conclusion === 'proven') s.flags.overclaimed = true;
      s.evidence.report = statements;
      unlock(s, 'arch-perseverance');
      unlock(s, 'arch-instruments');
      if (s.ops.sitesFound.includes('site-layers')) unlock(s, 'arch-jezero');
      s.outcome = computeOutcome(mission, s);
      log(s, idx, { kind: 'science', checkpoint: true, title: t('Science report sent to Earth'), detail: t('{d} of {n} data products fit in the downlink.', { d: sent.length, n: s.evidence.observations.length }) });
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
