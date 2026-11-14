import type * as THREE_NS from 'three';
export interface MarsLighting {
  root: THREE_NS.Group;
  sun: THREE_NS.DirectionalLight;
  updateFocus(p: { x: number; y?: number; z: number }): void;
  setQuality(low: boolean): void;
  dispose(): void;
}
export function createMarsLighting(
  THREE: typeof THREE_NS,
  options: { scene: THREE_NS.Scene; renderer?: THREE_NS.WebGLRenderer; configureRenderer?: boolean; pixelRatio?: number },
): MarsLighting;
