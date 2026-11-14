import type * as THREE_NS from 'three';
export interface MarsMaterials {
  ground: THREE_NS.MeshStandardMaterial;
  rocks: THREE_NS.MeshStandardMaterial[];
  ready: Promise<unknown>;
  dispose(): void;
}
export function createMarsMaterials(
  THREE: typeof THREE_NS,
  options?: { assetBaseURL?: string | URL; textureLoader?: THREE_NS.TextureLoader; vertexColors?: boolean; anisotropy?: number },
): MarsMaterials;
