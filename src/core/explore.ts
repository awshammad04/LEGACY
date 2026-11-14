import type { Design, DesignMetrics, ExploreSite, MissionDefinition, OpsState } from './types';
import { MODEL, tierOf } from './evaluate';
import { mulberry32 } from './rng';
import { TERRAIN_SIZE, heightAt } from './terrain';

/**
 * Open-world exploration model (simplified, declared assumptions; educational game values).
 * The player drives in real time; the scene commits DRIVE segments to the reducer, which
 * converts distance and slope into energy and time using the player's own design.
 */

/** Metres represented by one world unit for energy/time purposes (distances are compressed). */
export const UNIT_M = 1.5;
export const SOL_HOURS = 24.6;
export const DISCOVER_RADIUS = 46;
export const WORLD_LIMIT = TERRAIN_SIZE / 2 - 70;

/** Real-time top speed in world units per second (gameplay feel; fictional). */
export function roverTopSpeed(m: DesignMetrics, wheelHealth: number) {
  // Crewed Moon: walking astronauts or a Lunar Roving Vehicle; robotic rovers use their chassis tier.
  const base =
    m.maxSpeedMPerH >= 2000
      ? m.maxSpeedMPerH >= 12000 ? 16 : m.maxSpeedMPerH >= 10000 ? 13 : 6
      : m.maxSpeedMPerH >= 110 ? 17 : m.maxSpeedMPerH >= 80 ? 14 : 11;
  return base * (wheelHealth < 40 ? 0.6 : 1);
}

/** How close (world units) the crew must be to the parked rover to climb aboard. */
export const BOARD_RADIUS = 7;

/** Crewed Moon missions that brought a lunar rover can park it and walk. */
export function hasBuggy(mission: MissionDefinition, design: Design) {
  return mission.type === 'crewed' && mission.world?.vehicle === 'lrv' && (tierOf(mission, design, 'chassis') ?? 'basic') !== 'basic';
}

/** Mobility in effect right now: on foot the crew moves at walking pace, whatever rover they brought. */
export function mobilityMetrics(mission: MissionDefinition, m: DesignMetrics, ops: OpsState): DesignMetrics {
  if (!ops.onFoot) return m;
  const walk = mission.slots.find((x) => x.id === 'chassis')?.options.find((o) => o.tier === 'basic');
  return { ...m, maxSpeedMPerH: walk?.maxSpeedMPerH ?? 3000, slopeLimitDeg: Math.max(m.slopeLimitDeg, walk?.slopeLimitDeg ?? 15), drivePowerW: 0 };
}

/** Where the walking crew stands after stepping off the rover (beside it, not inside it). */
export function stepOffPoint(pos: [number, number], heading: number): [number, number] {
  return [pos[0] + Math.sin(heading) * 3, pos[1] + Math.cos(heading) * 3];
}

export function effectiveSpeedMPerH(m: DesignMetrics) {
  return Math.max(1, m.maxSpeedMPerH * (0.5 + 0.5 * m.autonomy));
}

/** Energy and game time for a driven stretch. */
export function driveCost(m: DesignMetrics, dist: number, slopeAvg: number, boostFrac: number) {
  const hours = (dist * UNIT_M) / effectiveSpeedMPerH(m) / (1 + boostFrac * 0.4);
  const energyWh = hours * m.drivePowerW * (1 + slopeAvg / 25) * (1 + boostFrac * 0.25) * (1 + boostFrac * 0.4);
  return { hours, energyWh };
}

/** Power generation right now: solar output drops with dusty panels and dust storms; radioisotope power does not. */
export function generationNow(m: DesignMetrics, ops: OpsState) {
  if (m.powerSource !== 'solar') return m.generationWhPerSol;
  const storm = ops.sol < ops.dustUntil ? 0.35 : 1;
  return m.generationWhPerSol * ops.solarFactor * storm;
}

export function netPerSol(m: DesignMetrics, ops: OpsState) {
  return generationNow(m, ops) - m.housekeepingWh;
}

export const batteryFloor = (ops: OpsState) => ops.batteryCapWh * MODEL.batteryFloor;

export function siteDistance(site: ExploreSite, pos: [number, number]) {
  return Math.hypot(site.pos[0] - pos[0], site.pos[1] - pos[1]);
}

export function nearestSite(mission: MissionDefinition, pos: [number, number]) {
  let best: { site: ExploreSite; d: number } | null = null;
  for (const s of mission.sites ?? []) {
    const d = siteDistance(s, pos);
    if (!best || d < best.d) best = { site: s, d };
  }
  return best;
}

export interface Rock {
  x: number;
  z: number;
  y: number;
  s: number;
  rx: number;
  ry: number;
  rz: number;
  sy: number;
  sz: number;
}

/** Deterministic rock field shared by rendering and collision. Keeps site centres clear. */
export function rockField(mission: MissionDefinition, count = 950): Rock[] {
  const rnd = mulberry32(42);
  const sites = mission.sites ?? [];
  const starts = mission.landingSites.map((l) => l.start);
  const rocks: Rock[] = [];
  for (let i = 0; i < count; i++) {
    let x = (rnd() - 0.5) * (TERRAIN_SIZE - 100);
    let z = (rnd() - 0.5) * (TERRAIN_SIZE - 100);
    if (i < 160 && sites.length) {
      const s = sites[i % sites.length];
      x = s.pos[0] + (rnd() - 0.5) * 80;
      z = s.pos[1] + (rnd() - 0.5) * 80;
    }
    const s = 0.25 + rnd() ** 3 * 2.6;
    const rx = rnd() * 3;
    const ry = rnd() * 3;
    const rz = rnd() * 3;
    const sy = 0.5 + rnd() * 0.5;
    const sz = 0.7 + rnd() * 0.6;
    if (sites.some((st) => Math.hypot(x - st.pos[0], z - st.pos[1]) < 9)) continue;
    if (starts.some((p) => Math.hypot(x - p[0], z - p[1]) < 12)) continue;
    rocks.push({ x, z, y: heightAt(x, z) + s * 0.25, s, rx, ry, rz, sy, sz });
  }
  return rocks;
}

/** Only big rocks block the rover. */
export const isObstacle = (r: Rock) => r.s > 1.1;
