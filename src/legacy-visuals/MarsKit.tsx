import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { createMarsMaterials, type MarsMaterials } from './portable/materials.js';
import { createMarsLighting, type MarsLighting } from './portable/lighting.js';
import { heightAt } from '../core/terrain';
import { useLive } from '../game/live';
import { asset } from '../scenes/models';

/* ------------------------------------------------------------------ */
/* Graphics-kit visual layer for the Mars surface (M2, M3).             */
/* Visual only: terrain heights, colliders, input, camera, resources    */
/* and saves stay with the game. Everything here is created on mount    */
/* and disposed on unmount through the scene's own lifecycle.           */
/* ------------------------------------------------------------------ */

/** Host scale: one world unit is 1.5 m. */
const UNIT_M = 1.5;
/** Same sand texel size relative to the rover as the reference (≈ six rover lengths per tile). */
export const GROUND_REPEAT = 44;
/** Reference fog is 0.0032 per metre over a 480 m map; lighter here so this 1350 m map keeps its far relief. */
const FOG_DENSITY = 0.0016 * UNIT_M;
const FOG_DENSITY_STORM = 0.006 * UNIT_M;

const KitMaterialsContext = createContext<MarsMaterials | null>(null);
/** Kit materials once their maps have loaded; null before that (classic materials stay in place). */
export const useKitMaterials = () => useContext(KitMaterialsContext);

export function MarsKitMaterials({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const [mats, setMats] = useState<MarsMaterials | null>(null);
  useEffect(() => {
    const m = createMarsMaterials(THREE, {
      assetBaseURL: new URL(asset('legacy-visuals/assets/'), location.href),
      vertexColors: true, // the host terrain carries an intentional (softened) colour attribute
      anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()),
    });
    // Adapt to this terrain's UV layout (0..1 across the whole map) and keep the reference sand tint.
    for (const t of [m.ground.map, m.ground.normalMap, m.ground.roughnessMap]) t?.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
    m.ground.color.set('#bc9273');
    let live = true;
    m.ready
      .then(() => live && setMats(m))
      .catch((err) => console.warn('[LEGACY] kit textures failed to load; keeping classic materials', err));
    return () => {
      live = false;
      setMats(null);
      m.dispose();
    };
  }, [gl]);
  return <KitMaterialsContext.Provider value={mats}>{children}</KitMaterialsContext.Provider>;
}

/** Warm sun + cool hemisphere fill + exponential fog from the kit, following the rover. */
export function MarsKitLighting({ storm, lowQuality }: { storm: boolean; lowQuality: boolean }) {
  const scene = useThree((s) => s.scene);
  const ref = useRef<MarsLighting | null>(null);
  useEffect(() => {
    // The game's post-processing already applies ACES tone mapping: do not configure the renderer twice.
    const l = createMarsLighting(THREE, { scene, configureRenderer: false });
    Object.assign(l.sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 240 });
    l.sun.shadow.camera.updateProjectionMatrix();
    ref.current = l;
    return () => {
      l.dispose();
      ref.current = null;
    };
  }, [scene]);
  useEffect(() => {
    ref.current?.setQuality(lowQuality);
  }, [lowQuality]);
  useEffect(() => {
    const f = scene.fog as THREE.FogExp2 | null;
    if (!f || !(f as THREE.FogExp2).isFogExp2) return;
    f.density = storm ? FOG_DENSITY_STORM : FOG_DENSITY;
    f.color.set(storm ? '#a17252' : '#bd9574');
  }, [storm, scene]);
  useFrame(() => {
    const [x, z] = useLive.getState().pos;
    ref.current?.updateFocus({ x, y: heightAt(x, z), z });
  });
  return null;
}

/** Soft contact shadow under the rover (kit technique); complements directional shadows. */
let blobTexture: THREE.CanvasTexture | null = null;
export function ContactShadow({ length, width }: { length: number; width: number }) {
  if (!blobTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 6, 32, 32, 32);
    grad.addColorStop(0, 'rgba(20,27,24,.5)');
    grad.addColorStop(1, 'rgba(20,27,24,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    blobTexture = new THREE.CanvasTexture(c);
  }
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} renderOrder={1}>
      <planeGeometry args={[length, width]} />
      <meshBasicMaterial map={blobTexture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

/** Softened copy of the terrain's colour attribute so the photographic sand map carries the look. */
export function softenTerrainColors(src: THREE.BufferGeometry) {
  const g = src.clone();
  const col = g.attributes.color as THREE.BufferAttribute;
  let mean = 0;
  for (let i = 0; i < col.count; i++) mean += 0.2126 * col.getX(i) + 0.7152 * col.getY(i) + 0.0722 * col.getZ(i);
  mean /= col.count;
  for (let i = 0; i < col.count; i++) {
    const l = (0.2126 * col.getX(i) + 0.7152 * col.getY(i) + 0.0722 * col.getZ(i)) / mean;
    const v = 0.5 + 0.5 * l; // keep ±~25% of the original light/dark structure
    col.setXYZ(i, v, v * 0.985, v * 0.97);
  }
  col.needsUpdate = true;
  return g;
}

