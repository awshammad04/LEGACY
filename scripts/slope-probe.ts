import { slopeDeg, heightAt } from '../src/core/terrain';
const segs: [number, number, number, number][] = [[-210, 60, -100, -40], [-100, -40, -90, -170]];
for (const [ax, az, bx, bz] of segs) {
  const len = Math.hypot(bx - ax, bz - az); const steps = Math.ceil(len / 2);
  let max = 0, at = [0, 0];
  for (let s = 0; s < steps; s++) {
    const x1 = ax + (bx - ax) * s / steps, z1 = az + (bz - az) * s / steps, x2 = ax + (bx - ax) * (s + 1) / steps, z2 = az + (bz - az) * (s + 1) / steps;
    const sl = slopeDeg(x1, z1, x2, z2); if (sl > max) { max = sl; at = [x1, z1]; }
  }
  console.log('seg', ax, az, '->', bx, bz, 'max', max.toFixed(1), 'at', at.map(v => v.toFixed(0)).join(','), 'h', heightAt(at[0], at[1]).toFixed(1));
}
