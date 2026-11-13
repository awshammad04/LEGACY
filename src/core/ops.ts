import type { DesignMetrics, DriveSegmentResult, OpsState, RoutePrediction, SpeedMode } from './types';
import { MODEL } from './evaluate';
import { MAP_SCALE, slopeDeg } from './terrain';

/**
 * Surface operations model (simplified, declared assumptions; values are educational game values).
 * - Mars commands travel minutes each way, so the rover drives waypoint sequences with onboard autonomy.
 * - Energy: each sol the power system adds (generation − baseline). Activities draw from the battery,
 *   which may not go below a 20% safety floor. Smaller batteries/arrays => fewer activity hours per sol.
 */

export const SPEED: Record<SpeedMode, { speed: number; risk: number; energy: number; wear: number }> = {
  cautious: { speed: 0.65, risk: 0.45, energy: 0.95, wear: 0.7 },
  standard: { speed: 1, risk: 1, energy: 1, wear: 1 },
  fast: { speed: 1.4, risk: 2.3, energy: 1.15, wear: 1.6 },
};

export const ARRIVAL_RADIUS = 14; // world units
export const MAX_WAYPOINTS = 6;
/** One-way light time used for gameplay (Mars–Earth varies roughly 4–24 minutes). */
export const ONE_WAY_LIGHT_MINUTES = 12.5;

export function effectiveSpeedMPerH(m: DesignMetrics, mode: SpeedMode) {
  return m.maxSpeedMPerH * (0.5 + 0.5 * m.autonomy) * SPEED[mode].speed;
}

export function netGenerationPerSol(m: DesignMetrics) {
  return m.generationWhPerSol - m.housekeepingWh;
}

export function predictRoute(
  m: DesignMetrics,
  start: [number, number],
  waypoints: [number, number][],
  mode: SpeedMode,
  target: [number, number],
): RoutePrediction {
  const pts: [number, number][] = [start, ...waypoints];
  const segments: DriveSegmentResult[] = [];
  const speed = effectiveSpeedMPerH(m, mode);
  const drivePower = m.drivePowerW * SPEED[mode].energy;
  let cumRisk = 0;
  let incidentSegment: number | null = null;
  let blocked = false;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(len / 2));
    let maxSlope = 0;
    let slopeSum = 0;
    let risk = 0;
    for (let s = 0; s < steps; s++) {
      const x1 = ax + ((bx - ax) * s) / steps;
      const z1 = az + ((bz - az) * s) / steps;
      const x2 = ax + ((bx - ax) * (s + 1)) / steps;
      const z2 = az + ((bz - az) * (s + 1)) / steps;
      const sl = slopeDeg(x1, z1, x2, z2);
      maxSlope = Math.max(maxSlope, sl);
      slopeSum += sl;
      const stepM = (len / steps) * MAP_SCALE;
      risk += (sl / Math.max(1, m.slopeLimitDeg)) ** 3 * (stepM / 100) * (1.6 - m.autonomy) * (1.5 - m.wheelDurability) * SPEED[mode].risk;
    }
    const distanceM = len * MAP_SCALE;
    const avgSlope = slopeSum / steps;
    const hours = speed > 0 ? distanceM / speed : Infinity;
    const energyWh = hours * drivePower * (1 + avgSlope / 25);
    const segBlocked = maxSlope > m.slopeLimitDeg;
    if (segBlocked) blocked = true;
    if (incidentSegment === null && cumRisk + risk >= 1) incidentSegment = i;
    cumRisk += risk;
    segments.push({ from: pts[i], to: pts[i + 1], distanceM, maxSlopeDeg: maxSlope, energyWh, hours, risk, blocked: segBlocked });
  }
  const distanceM = segments.reduce((a, s) => a + s.distanceM, 0);
  const energyWh = segments.reduce((a, s) => a + s.energyWh, 0);
  const hours = segments.reduce((a, s) => a + s.hours, 0);
  const end = pts[pts.length - 1];
  const endsAtTarget = Math.hypot(end[0] - target[0], end[1] - target[1]) <= ARRIVAL_RADIUS;
  // Sol estimate (without battery dynamics) for display; execution uses simulateActivity.
  const net = Math.max(1, netGenerationPerSol(m));
  const sols = Math.max(hours / MODEL.driveHoursPerSol, energyWh / net);
  return { segments, distanceM, energyWh, hours, sols, risk: cumRisk, blocked, blockedReason: blocked ? 'slope' : undefined, incidentSegment, endsAtTarget };
}

export interface ActivityResult {
  sols: number;
  batteryEnd: number;
  energyUsed: number;
  completed: boolean;
}

/** Run an activity of `hours` at `powerW` across as many sols as battery and time allow. */
export function simulateActivity(ops: OpsState, m: DesignMetrics, hours: number, powerW: number, hoursPerSol: number): ActivityResult {
  const net = netGenerationPerSol(m);
  const floor = ops.batteryCapWh * MODEL.batteryFloor;
  let battery = ops.batteryWh;
  let remaining = hours;
  let sols = 0;
  let energyUsed = 0;
  let guard = 0;
  while (remaining > 1e-6 && guard++ < 400) {
    const avail = Math.max(0, battery - floor) + Math.max(0, net);
    let h = Math.min(remaining, hoursPerSol, powerW > 0 ? avail / powerW : remaining);
    if (h < 0.02) {
      if (net <= 0) return { sols, batteryEnd: battery, energyUsed, completed: false };
      h = 0; // wait a sol to recharge
    }
    const use = h * powerW;
    remaining -= h;
    const frac = remaining > 1e-6 ? 1 : Math.max(0.05, h / hoursPerSol);
    battery = Math.min(ops.batteryCapWh, battery - use + net * frac);
    battery = Math.max(floor, battery);
    sols += frac;
    energyUsed += use;
  }
  return { sols, batteryEnd: battery, energyUsed, completed: remaining <= 1e-6 };
}

/** A stopping point `standoff` units short of the target along the approach (rover parks beside the rock, not on it). */
export function approachPoint(from: [number, number], target: [number, number], standoff = 7): [number, number] {
  const dx = target[0] - from[0];
  const dz = target[1] - from[1];
  const d = Math.hypot(dx, dz);
  if (d <= standoff + 0.5) return [...target];
  return [target[0] - (dx / d) * standoff, target[1] - (dz / d) * standoff];
}
