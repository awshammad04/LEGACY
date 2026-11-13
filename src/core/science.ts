import type { Design, DesignMetrics, MissionDefinition, MissionState, ObservationDef, ObservationResult, ReportStatement } from './types';
import { MODEL, installed, tierOf } from './evaluate';

/** Instruments (installed options) that provide the capabilities an observation needs. */
export function providers(mission: MissionDefinition, design: Design, obs: ObservationDef) {
  return installed(mission, design).filter((o) => (o.capabilities ?? []).some((c) => obs.requires.includes(c)));
}

export function observationPowerW(mission: MissionDefinition, design: Design, obs: ObservationDef) {
  return providers(mission, design, obs).reduce((a, o) => a + o.powerW, 0) + MODEL.opsOverheadW;
}

export function observationDataMb(mission: MissionDefinition, design: Design, obs: ObservationDef) {
  // The primary capability's instrument determines data volume.
  const primary = obs.requires[0];
  const inst = installed(mission, design).find((o) => (o.capabilities ?? []).includes(primary));
  return (inst?.dataMb ?? 0) + obs.dataMb;
}

export type Availability = { ok: true } | { ok: false; reason: 'missing-instrument' | 'disabled' | 'done' };

export function observationAvailability(_mission: MissionDefinition, state: MissionState, metrics: DesignMetrics, obs: ObservationDef): Availability {
  if (state.evidence.observations.some((o) => o.id === obs.id)) return { ok: false, reason: 'done' };
  if (!obs.requires.every((c) => metrics.capabilities.includes(c))) return { ok: false, reason: 'missing-instrument' };
  if (obs.requires.some((c) => state.ops.disabledCaps.includes(c))) return { ok: false, reason: 'disabled' };
  return { ok: true };
}

const LEVELS = ['low', 'good', 'high'] as const;

export function observationQuality(mission: MissionDefinition, state: MissionState, obs: ObservationDef): ObservationResult['quality'] {
  let idx = 1; // good
  if (obs.qualityFrom === 'camera') {
    const t = tierOf(mission, state.design, 'camera');
    idx = t === 'basic' ? 0 : t === 'advanced' ? 2 : 1;
  }
  if (obs.enhancedBy) {
    idx = state.evidence.observations.some((o) => o.id === obs.enhancedBy) ? 2 : 0;
  }
  const sensitive = obs.id === 'obs-xrf' || obs.id === 'obs-raman';
  if (sensitive && state.ops.electronicsHealth < 70) idx = Math.max(0, idx - 1);
  return LEVELS[idx];
}

export const QUALITY_FACTOR: Record<ObservationResult['quality'], number> = { none: 0, low: 0.5, good: 0.85, high: 1 };

export type SupportLevel = 'not-assessed' | 'weakened' | 'consistent' | 'supported' | 'strongly-supported';

/** Evidence board: how well the collected observations support each hypothesis. Never "proven". */
export function evidenceBoard(mission: MissionDefinition, state: MissionState): Record<string, { level: SupportLevel; score: number; lines: number }> {
  const out: Record<string, { level: SupportLevel; score: number; lines: number }> = {};
  for (const h of mission.hypotheses) {
    let score = 0;
    let lines = 0;
    let assessed = false;
    for (const r of state.evidence.observations) {
      const def = mission.observations.find((o) => o.id === r.id);
      if (!def) continue;
      const s = def.support[h.id] ?? 0;
      if (s !== 0) {
        assessed = true;
        score += s * QUALITY_FACTOR[r.quality];
        if (s > 0) lines++;
      }
    }
    let level: SupportLevel = 'not-assessed';
    if (assessed) {
      if (score < -0.2) level = 'weakened';
      else if (score < 0.6) level = 'consistent';
      else if (score < 1.6) level = 'supported';
      else level = 'strongly-supported';
    }
    out[h.id] = { level, score, lines };
  }
  return out;
}

export function downlinkCapacityMb(mission: MissionDefinition, state: MissionState, metrics: DesignMetrics) {
  const solsLeft = mission.conjunctionSol - state.ops.sol;
  const sols = Math.max(1, Math.min(3, Math.floor(solsLeft)));
  return metrics.downlinkMbPerSol * sols;
}

export function statementSupported(st: ReportStatement, downlinked: string[]): boolean {
  if (st.kind === 'overclaim' || st.kind === 'dismissive') return false;
  if (st.kind === 'caution') return true;
  if (st.requiresAll && !st.requiresAll.every((id) => downlinked.includes(id))) return false;
  if (st.requiresAny && !st.requiresAny.some((id) => downlinked.includes(id))) return false;
  return true;
}

export interface ReportGrade {
  score: number;
  perStatement: { id: string; verdict: 'supported' | 'unsupported' | 'overclaim' | 'dismissive' | 'caution'; points: number }[];
  hasCaution: boolean;
  overclaim: boolean;
}

export function gradeReport(mission: MissionDefinition, statementIds: string[], downlinked: string[]): ReportGrade {
  const per: ReportGrade['perStatement'] = [];
  let pts = 0;
  let max = 0;
  for (const st of mission.statements) {
    if (st.kind === 'supported-claim') max += 15;
    if (st.kind === 'caution') max += 10;
  }
  let hasCaution = false;
  let overclaim = false;
  for (const id of statementIds) {
    const st = mission.statements.find((s) => s.id === id);
    if (!st) continue;
    if (st.kind === 'overclaim') {
      per.push({ id, verdict: 'overclaim', points: -30 });
      pts -= 30;
      overclaim = true;
    } else if (st.kind === 'dismissive') {
      per.push({ id, verdict: 'dismissive', points: -20 });
      pts -= 20;
    } else if (st.kind === 'caution') {
      per.push({ id, verdict: 'caution', points: 10 });
      pts += 10;
      hasCaution = true;
    } else if (statementSupported(st, downlinked)) {
      per.push({ id, verdict: 'supported', points: 15 });
      pts += 15;
    } else {
      per.push({ id, verdict: 'unsupported', points: -10 });
      pts -= 10;
    }
  }
  const score = Math.max(0, Math.min(100, Math.round((pts / Math.max(1, max)) * 100)));
  return { score, perStatement: per, hasCaution, overclaim };
}

/** Science value of the data that actually reached Earth. */
export const OBS_VALUE: Record<string, number> = {
  'obs-context': 10, 'obs-zoom': 10, 'obs-abrasion': 7, 'obs-xrf': 25, 'obs-raman': 25, 'obs-radar': 8, 'obs-weather': 2, 'obs-cache': 15, 'obs-delta-pano': 8, 'obs-dust-devil': 3, 'obs-depot': 10,
};

/** Live "science points" for the HUD: value of everything collected so far (before downlink limits). */
export function sciencePoints(state: MissionState): number {
  return Math.round(state.evidence.observations.reduce((a, r) => a + (OBS_VALUE[r.id] ?? 0) * QUALITY_FACTOR[r.quality], 0));
}

export function pointsFor(id: string, quality: ObservationResult['quality']): number {
  return Math.round((OBS_VALUE[id] ?? 0) * QUALITY_FACTOR[quality]);
}

export function scienceScore(state: MissionState): number {
  const total = Object.values(OBS_VALUE).reduce((a, b) => a + b, 0);
  let v = 0;
  for (const r of state.evidence.observations) {
    if (!state.evidence.downlinked.includes(r.id)) continue;
    v += (OBS_VALUE[r.id] ?? 0) * QUALITY_FACTOR[r.quality];
  }
  return Math.round((v / total) * 100);
}
