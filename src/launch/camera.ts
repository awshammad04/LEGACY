import { MathUtils, Vector3 } from 'three';
import type { CameraView } from './controller';

export function flightAt(t: number) {
  const flight = Math.max(0, t - 10);
  return {
    x: 0.026 * flight ** 2.8,
    y: 2.49 + 0.40 * flight ** 2.57,
    tilt: -Math.min(0.4, Math.max(0, flight-3)*0.033),
  };
}

type Shot = [time: number, eye: [number,number,number], target: [number,number,number], follow: number];
const wide: Shot = [0,[54,23,68],[-4,16,0],0];
const low: Shot = [3.7,[20,6,34],[-2,14.5,0],0];
const engine: Shot = [7.5,[9.5,4.2,14.6],[0,5.1,0],0];
const shots: Shot[] = [
  wide, [2,[49,22,62],[-4,16,0],0], low, [5.3,[19,6.5,33],[-2,14,0],0],
  engine, [9,[11,4.9,16],[0,6,0],0], [11.9,[26,11,42],[-2,20,0],0.55],
  [15.2,[40,17,56],[-2,20,0],0.99], [18.4,[33,12,48],[0,18,0],1],
  [21,[42,0,52],[0,12,0],1], [25,[99,-24,127],[0,15,0],1],
];

export class CameraDirector {
  private eye = new Vector3();
  private aim = new Vector3();
  private desiredEye = new Vector3();
  private desiredAim = new Vector3();
  private buffer = new Vector3();
  private initialized = false;

  update(t: number, delta: number, view: CameraView, reduced: boolean, angle: number, aspect: number) {
    const flight = flightAt(t);
    const index = shots.findIndex((shot) => t < shot[0]);
    let left = shots[Math.max(0, index - 1)];
    let right = shots[index < 0 ? shots.length - 1 : index];
    if (index < 0 && t > 0) left = right;
    if (reduced || view !== 'Director') {
      const fixed = view === 'Vehicle' ? low : view === 'Engines' ? engine : wide;
      left = right = [0, fixed[1], fixed[2], MathUtils.smoothstep(t, 10, 13)];
    }
    const s = left === right ? 0 : MathUtils.smoothstep(t,left[0],right[0]);
    const follow = MathUtils.lerp(left[3],right[3],s);
    this.desiredEye.set(...left[1]).lerp(this.buffer.set(...right[1]),s);
    this.desiredAim.set(...left[2]).lerp(this.buffer.set(...right[2]),s);
    this.desiredEye.x += flight.x*follow;
    this.desiredAim.x += flight.x*follow;
    this.desiredEye.y += (flight.y-2.49)*follow;
    this.desiredAim.y += (flight.y-2.49)*follow;
    if (view === 'Inspect') {
      this.desiredEye.set(Math.sin(angle+0.63)*53, 20, Math.cos(angle+0.63)*53);
      this.desiredAim.set(-1, 18, 0);
    }
    this.desiredEye.sub(this.desiredAim).multiplyScalar(Math.max(1,0.82/aspect)).add(this.desiredAim);
    if (!reduced && t > 8 && t < 14) {
      const shake = 0.19 * Math.sin((t-8)*Math.PI/6);
      this.desiredEye.x += Math.sin(t*68)*shake;
      this.desiredEye.y += Math.cos(t*57)*shake*0.63;
    }
    const blend = this.initialized ? 1-Math.exp(-delta*6.2) : 1;
    this.initialized = true;
    this.eye.lerp(this.desiredEye,blend);
    this.aim.lerp(this.desiredAim,blend);
    return { eye: this.eye, aim: this.aim };
  }
}
