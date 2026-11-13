import type { LText, MissionDefinition, MissionState, Outcome } from './types';
import { gradeReport, scienceScore } from './science';
import { computeMetrics } from './evaluate';

export const ACHIEVEMENTS = {
  'careful-investigator': { en: 'Careful Investigator', desc: 'Interpreted a possible Martian biosignature without claiming certainty.' },
  'scientific-pioneer': { en: 'Scientific Pioneer', desc: 'Completed valuable scientific observations with a sound, safe plan.' },
  'redesign-required': { en: 'Mission Redesign Required', desc: 'Found a critical design weakness on Earth and corrected it before launch.' },
} as const;
export type AchievementId = keyof typeof ACHIEVEMENTS;

/** Outcome is always recomputed from state — never a prewritten ending. Unsafe choices never earn an advantage. */
export function computeOutcome(mission: MissionDefinition, state: MissionState): Outcome {
  const grade = gradeReport(mission, state.evidence.report ?? [], state.evidence.downlinked);
  const sci = scienceScore(state);
  const safetyIssues = state.flags.unsafeChoices.length + state.ops.incidents;
  const metrics = computeMetrics(mission, state.design);
  const beforeConjunction = state.ops.sol < mission.conjunctionSol;
  const overclaimed = state.flags.overclaimed || grade.overclaim;
  const reportSubmitted = !!state.evidence.report;

  let tier: Outcome['tier'];
  if (safetyIssues >= 2 || (overclaimed && grade.score < 30)) tier = 'compromised';
  else if (!state.ops.arrived || !reportSubmitted) tier = 'incomplete';
  else if (sci >= 65 && grade.score >= 70 && safetyIssues === 0 && beforeConjunction && !overclaimed) tier = 'exemplary';
  else if (sci >= 40 && grade.score >= 40) tier = 'solid';
  else tier = 'incomplete';

  const achievements: AchievementId[] = [];
  const dismissive = (state.evidence.report ?? []).some((id) => mission.statements.find((s) => s.id === id)?.kind === 'dismissive');
  if (reportSubmitted && !overclaimed && !dismissive && grade.hasCaution && state.evidence.alertChoice !== 'announce') achievements.push('careful-investigator');
  if (reportSubmitted && sci >= 65 && safetyIssues === 0 && !overclaimed) achievements.push('scientific-pioneer');
  if (state.failedReviews >= 1 && state.launched) achievements.push('redesign-required');

  return {
    scienceScore: sci,
    reportScore: grade.score,
    safetyIssues,
    solsUsed: Math.round(state.ops.sol * 10) / 10,
    energyMarginPct: metrics.batteryWh > 0 ? Math.round((state.ops.batteryCapWh / metrics.batteryWh) * 100) : 0,
    observationsDone: state.evidence.observations.length,
    downlinkedCount: state.evidence.downlinked.length,
    tier,
    achievements,
    beforeConjunction,
  };
}

export interface Consequence {
  kind: 'good' | 'warn' | 'bad';
  text: LText;
}

/** Plain-language "because you…" lines for the debrief — every line is derived from the player's own design and decisions. */
export function consequences(mission: MissionDefinition, state: MissionState): Consequence[] {
  const out: Consequence[] = [];
  const m = computeMetrics(mission, state.design);
  const did = (id: string) => state.evidence.observations.some((o) => o.id === id);
  const total = state.evidence.observations.length;
  const sent = state.evidence.downlinked.length;
  if (total) {
    out.push(
      sent === total
        ? { kind: 'good', text: { en: 'Your antenna sent all {n} measurements to Earth.', vars: { n: total } } }
        : { kind: 'warn', text: { en: 'Only {s} of {n} measurements fit in your downlink — a stronger antenna would have sent more.', vars: { s: sent, n: total } } },
    );
  }
  if (!did('obs-xrf') && !did('obs-raman')) {
    const can = m.capabilities.includes('elemental-chemistry') || m.capabilities.includes('organics');
    out.push({ kind: 'bad', text: can ? { en: 'You never ran the chemistry or organics tests, so the rock’s key question stayed open.' } : { en: 'Without chemistry or organics instruments, your rover could not test the rock’s key question.' } });
  } else if (did('obs-abrasion')) {
    out.push({ kind: 'good', text: { en: 'Abrading the rock first gave your contact instruments clean, high-quality data.' } });
  }
  if (state.ops.rests > 0) {
    out.push({ kind: state.ops.rests >= 4 ? 'warn' : 'good', text: { en: 'You stopped to recharge {n} times — battery size and power output decide how far you can go each sol.', vars: { n: state.ops.rests } } });
  }
  if (state.events['ev-dust']?.choice === 'continue' && m.powerSource === 'solar') out.push({ kind: 'warn', text: { en: 'Driving through the dust storm cut your solar power to about a third for 3 sols.' } });
  if (state.events['ev-dust'] && m.powerSource !== 'solar') out.push({ kind: 'good', text: { en: 'Your radioisotope power kept working through the dust storm.' } });
  if (state.flags.unsafeChoices.includes('ev-solar')) out.push({ kind: 'bad', text: { en: 'Ignoring the radiation warning exposed your electronics — a safety violation.' } });
  if (state.ops.wheelHealth < 70) out.push({ kind: 'warn', text: { en: 'Rough or fast driving wore your wheels down to {n}%.', vars: { n: Math.round(state.ops.wheelHealth) } } });
  if (state.flags.overclaimed) out.push({ kind: 'bad', text: { en: 'Claiming life went beyond what the evidence could show.' } });
  else if (state.evidence.report?.includes('st-potential')) out.push({ kind: 'good', text: { en: 'You reported a potential biosignature and kept other explanations open — evidence before certainty.' } });
  const sites = mission.sites?.length ?? 0;
  if (sites) out.push({ kind: state.ops.sitesFound.length === sites ? 'good' : 'warn', text: { en: 'You discovered {n} of {t} sites.', vars: { n: state.ops.sitesFound.length, t: sites } } });
  if (state.ops.sol >= mission.conjunctionSol) out.push({ kind: 'bad', text: { en: 'Your report reached Earth after solar conjunction began — late.' } });
  return out;
}
