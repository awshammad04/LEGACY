import type { MissionDefinition, MissionState, Outcome } from './types';
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
