import { createNoise2D } from 'simplex-noise';
import { mulberry32 } from './rng';

/**
 * Stylized, illustrative Jezero-inspired terrain (NOT a real elevation model).
 * One analytic height function feeds both the 3D mesh and the mobility simulation,
 * so what the player sees is exactly what the rover "feels".
 *
 * Layout (world units): a low crater floor (positive z) rises over a scarp to the delta
 * plateau (negative z). A gentle ramp near x ≈ -90 lets any chassis climb. A river
 * valley inspired by Neretva Vallis cuts the plateau; the target rock sits in it.
 */

export const TERRAIN_SIZE = 900; // world units, square, centered on origin
/** Display distances are compressed: 1 world unit = 4 map metres ("not to scale"). */
export const MAP_SCALE = 4;

const noiseA = createNoise2D(mulberry32(20240721));
const noiseB = createNoise2D(mulberry32(20250910));

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  const dx = px - (ax + t * vx);
  const dz = pz - (az + t * vz);
  return Math.hypot(dx, dz);
}

export function heightAt(x: number, z: number): number {
  // Broad undulation
  let h = noiseA(x * 0.0035, z * 0.0035) * 5 + noiseB(x * 0.011, z * 0.011) * 1.5;

  // Delta scarp with a gentle ramp corridor around x = -90
  const scarpZ = -105 + 0.15 * x;
  const ramp = Math.exp(-(((x + 90) / 38) ** 2));
  const width = 34 + 150 * ramp;
  h += 13 * smoothstep(-0.5, 0.5, (scarpZ - z) / width);

  // River valley (Neretva Vallis-inspired) cutting into the plateau
  const dv = distToSegment(x, z, 175, -430, 20, -175);
  h -= 5.5 * Math.exp(-((dv / 26) ** 2));

  // Distant crater rim / boundary
  const r = Math.hypot(x + 40, z - 40);
  h += 30 * smoothstep(360, 470, r);

  // Fine roughness
  h += noiseB(x * 0.09, z * 0.09) * 0.16;
  return h;
}

/** Slope in degrees between two points (world units on both axes). */
export function slopeDeg(x1: number, z1: number, x2: number, z2: number): number {
  const d = Math.hypot(x2 - x1, z2 - z1);
  if (d < 1e-6) return 0;
  return (Math.atan(Math.abs(heightAt(x2, z2) - heightAt(x1, z1)) / d) * 180) / Math.PI;
}

export const inBounds = (x: number, z: number) => Math.abs(x) < TERRAIN_SIZE / 2 - 40 && Math.abs(z) < TERRAIN_SIZE / 2 - 40;
