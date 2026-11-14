import type * as THREE_NS from 'three';
export interface RoverPose {
  x: number;
  z: number;
  heading: number;
  speed?: number;
  steer?: number;
  paused?: boolean;
}
export interface RoverVisual {
  root: THREE_NS.Group;
  rover: THREE_NS.Group;
  wheels: THREE_NS.Group[];
  update(pose: RoverPose, dt: number): void;
  reset(pose: RoverPose): void;
  dispose(): void;
}
export function createRoverVisual(
  THREE: typeof THREE_NS,
  options: { heightAt: (x: number, z: number) => number; parkedCurvature?: number; maxCurvature?: number; makeCanvas?: () => HTMLCanvasElement },
): RoverVisual;
