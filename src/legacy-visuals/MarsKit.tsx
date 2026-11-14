/**
 * React Three Fiber adapter for the LEGACY graphics integration kit (teammate's work).
 *
 * The kit's portable factories (./portable, byte-identical to the kit) are plain Three.js.
 * Here they run inside OUR canvas, OUR frame loop and OUR scene lifecycle:
 *  - one renderer, one camera authority, no extra requestAnimationFrame loop or key listeners;
 *  - our analytic terrain (heightAt) stays the only source of heights and collisions;
 *  - our controller stays the only authority for movement — the kit rover only reads a pose.
 * Everything the kit creates is disposed on unmount. `?visuals=classic` turns the layer off.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createMarsMaterials, type MarsMaterials } from './portable/materials.js';
import { createMarsLighting, type MarsLighting } from './portable/lighting.js';
import { createRoverVisual, type RoverVisual } from './portable/rover.js';
import { heightAt } from '../core/terrain';
import { tierOf } from '../core/evaluate';
import type { Design, MissionDefinition } from '../core/types';
import type { Rock } from '../core/explore';
import { useGame } from '../game/store';
import { useLive } from '../game/live';
import { kitVisualsEnabled } from './flag';

export { kitVisualsEnabled };

const ASSET_BASE = () => new URL(`${import.meta.env.BASE_URL}legacy-visuals/assets/`, location.href);

/** Kit sand/rock PBR materials for one scene lifetime. Ground repeat matches the kit's ~15 m tile. */
export function useKitMaterials(enabled: boolean, terrainSize: number): MarsMaterials | null {
  const gl = useThree((s) => s.gl);
  const mats = useMemo(() => {
    if (!enabled) return null;
    const m = createMarsMaterials(THREE, { assetBaseURL: ASSET_BASE(), vertexColors: true, anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()) });
    const repeat = terrainSize / 15; // kit: repeat 32 over 480 m
    for (const t of [m.ground.map, m.ground.normalMap, m.ground.roughnessMap]) t?.repeat.set(repeat, repeat);
    return m;
  }, [enabled, terrainSize, gl]);
  useEffect(() => () => mats?.dispose(), [mats]);
  return mats;
}

/** Kit lighting (warm sun 3.0, hemisphere fill 1.5, exponential haze, 2048² shadows) following the rover. */
export function KitLighting({ storm }: { storm: boolean }) {
  const { scene, gl } = useThree();
  const quality = useGame((s) => s.settings.quality);
  const ref = useRef<MarsLighting | null>(null);
  // Created in an effect (not during render) so it runs after the previous scene has released fog/background.
  useEffect(() => {
    const lighting = createMarsLighting(THREE, { scene, renderer: gl, configureRenderer: false });
    ref.current = lighting;
    // R3F already outputs sRGB with ACES filmic tone mapping; only the kit's exposure differs.
    const prevExposure = gl.toneMappingExposure;
    gl.toneMappingExposure = 1.08;
    if (new URLSearchParams(location.search).has('test')) (window as unknown as Record<string, unknown>).__kitDebug = { lighting, gl, scene };
    return () => {
      ref.current = null;
      lighting.dispose();
      gl.toneMappingExposure = prevExposure;
    };
  }, [scene, gl]);
  useEffect(() => ref.current?.setQuality(quality !== 'high'), [quality]);
  useFrame(() => {
    const lighting = ref.current;
    if (!lighting) return;
    const [x, z] = useLive.getState().pos;
    const y = heightAt(x, z);
    lighting.updateFocus({ x, y, z });
    lighting.sun.position.y = y + 48; // kit assumes ground near y=0; keep the same sun elevation on our hills
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog && 'density' in fog) fog.density = THREE.MathUtils.lerp(fog.density, storm ? 0.011 : 0.0032, 0.03);
  });
  return null;
}

const SKY_VERT = 'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SKY_FRAG =
  'varying vec3 dir;uniform vec3 sun;void main(){vec3 d=normalize(dir);float h=smoothstep(-.08,.65,d.y);vec3 c=mix(vec3(.69,.50,.37),vec3(.30,.27,.25),h);float s=max(dot(d,sun),0.);c+=vec3(.46,.35,.22)*pow(s,18.)+vec3(.8,.71,.54)*pow(s,1800.);gl_FragColor=vec4(c,1.);}';

/** The kit's sky dome shader (from createMarsLandscape's includeSky), sized to enclose our larger world. */
export function KitSky() {
  const uniforms = useMemo(() => ({ sun: { value: new THREE.Vector3(-0.65, 0.38, -0.45).normalize() } }), []);
  const g = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  useFrame(() => g.current?.position.copy(camera.position));
  return (
    <mesh ref={g} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1400, 40, 24]} />
      <shaderMaterial vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

/** The kit's boulder shape (displaced sphere), identical to createMarsLandscape. */
function kitRockShape(seed: number, lowPoly = false) {
  // lowPoly: same displacement on a coarse sphere, for tiny gravel (thousands of instances)
  const g = lowPoly ? new THREE.SphereGeometry(1, 7, 5) : new THREE.SphereGeometry(1, 24, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 0.84 + 0.07 * Math.sin(x * 9 + y * 7 + seed) + 0.06 * Math.sin(z * 11 - x * 4 + seed);
    p.setXYZ(i, x * f, y * f, z * f);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Our collidable rock field drawn with the kit's boulder shapes, rock PBR materials and
 * stratified caps. Positions and radii come from OUR collision data, so what you see is what you hit.
 */
export function KitRocks({ rocks, materials }: { rocks: Rock[]; materials: MarsMaterials }) {
  const shapes = useMemo(() => [kitRockShape(1), kitRockShape(3), kitRockShape(7)], []);
  useEffect(() => () => shapes.forEach((g) => g.dispose()), [shapes]);
  const sets = useMemo(() => {
    const body: Rock[][] = [[], [], []];
    const caps: { r: Rock; j: number; i: number }[][] = [[], [], []];
    rocks.forEach((r, i) => {
      body[i % 3].push(r);
      if (i % 3 === 0) for (let j = 0; j < 3; j++) caps[(i + 1) % 3].push({ r, j, i });
    });
    return { body, caps };
  }, [rocks]);
  return (
    <>
      {[0, 1, 2].map((k) => (
        <RockInstances key={`b${k}`} geo={shapes[k]} material={materials.rocks[k]} count={sets.body[k].length} version={sets} fill={(o, n) => {
          const r = sets.body[k][n];
          const s = r.s;
          o.position.set(r.x, heightAt(r.x, r.z) + s * 0.17, r.z);
          o.scale.set(s, s * (0.8 + k * 0.07), s);
          o.rotation.set(0, r.ry, 0);
        }} />
      ))}
      {[0, 1, 2].map((k) => (
        <RockInstances key={`c${k}`} geo={shapes[(k + 1) % 3]} material={materials.rocks[k]} count={sets.caps[k].length} version={sets} fill={(o, n) => {
          const { r, j } = sets.caps[k][n];
          o.position.set(r.x, heightAt(r.x, r.z) + r.s * (0.1 + j * 0.22), r.z);
          o.scale.set(r.s * 0.82, r.s * 0.12, r.s * 0.78);
          o.rotation.set(0, r.ry, 0);
        }} />
      ))}
    </>
  );
}

function RockInstances({ geo, material, count, fill, version }: { geo: THREE.BufferGeometry; material: THREE.Material; count: number; fill: (o: THREE.Object3D, i: number) => void; version: unknown }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      fill(o, i);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    // Recompute only when the rock data changes, not on every game-state render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, version]);
  if (!count) return null;
  return <instancedMesh ref={ref} args={[geo, material, count]} castShadow receiveShadow />;
}

/**
 * The kit's non-solid gravel (shape[0], rock material 1, same size distribution), laid out in
 * tiles that follow the rover so the dense look of the compact kit range works in our large world.
 */
export function KitGravel({ materials, perTile = 900 }: { materials: MarsMaterials; perTile?: number }) {
  const TILE = 60;
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => kitRockShape(1, true), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const pattern = useMemo(() => {
    let seed = 44391;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 4294967296);
    return Array.from({ length: perTile }, () => {
      const s = 0.025 + rand() ** 4 * 0.23;
      return { x: rand() * TILE, z: rand() * TILE, s: s * 1.6, rx: rand(), ry: rand() * 6, rz: rand() };
    });
  }, [perTile]);
  const tileKey = useRef('');
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const [px, pz] = useLive.getState().pos;
    const tx = Math.floor(px / TILE);
    const tz = Math.floor(pz / TILE);
    const key = `${tx}:${tz}`;
    if (key === tileKey.current) return;
    tileKey.current = key;
    const o = new THREE.Object3D();
    let i = 0;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const p of pattern) {
          const x = (tx + dx) * TILE + p.x;
          const z = (tz + dz) * TILE + p.z;
          o.position.set(x, heightAt(x, z) + p.s * 0.22, z);
          o.scale.set(p.s * 1.4, p.s * 0.6, p.s);
          o.rotation.set(p.rx, p.ry, p.rz);
          o.updateMatrix();
          m.setMatrixAt(i++, o.matrix);
        }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  });
  return <instancedMesh ref={ref} args={[geo, materials.rocks[1], perTile * 9]} receiveShadow frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Rover: the kit's LGC-01 visual, dressed with the player's design     */
/* ------------------------------------------------------------------ */

const near = (v: THREE.Vector3, x: number, y: number, z: number, e = 0.03) => Math.abs(v.x - x) < e && Math.abs(v.y - y) < e && Math.abs(v.z - z) < e;

/**
 * Applies workshop choices to the kit rover without editing the kit source:
 * solar wings vs radioisotope power, panel size, antenna, mast height, robotic arm, weather boom.
 */
function dressRover(v: RoverVisual, mission: MissionDefinition, design: Design) {
  const g = v.rover;
  const power = tierOf(mission, design, 'power') ?? 'basic';
  const comms = tierOf(mission, design, 'comms') ?? 'basic';
  const camera = tierOf(mission, design, 'camera') ?? 'balanced';
  const has = (part: string) => design.addons.some((id) => id.includes(part));
  const cream = new THREE.MeshStandardMaterial({ color: '#c9c5b6', metalness: 0.25, roughness: 0.6 });
  const trim = new THREE.MeshStandardMaterial({ color: '#3d4140', metalness: 0.65, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: '#ac8550', metalness: 0.7, roughness: 0.4 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  for (const child of [...g.children]) {
    const p = child.position;
    const isWing = (child as THREE.Mesh).isMesh && Math.abs(p.x) > 0.9 && Math.abs(p.x) < 1.75 && p.y > 1.5 && p.y < 1.6;
    if (isWing) {
      if (power === 'advanced') child.visible = false;
      else if (power === 'balanced') {
        const sign = Math.sign(p.x);
        p.x = sign * (0.845 + (Math.abs(p.x) - 0.845) * 1.3);
        child.scale.x *= 1.3;
      }
    }
    if (near(p, 0.6, 2.25, 0.86) || near(p, 0.6, 1.91, 0.86)) {
      if (comms === 'basic') child.visible = false;
      else if (comms === 'advanced' && near(p, 0.6, 2.25, 0.86)) child.scale.setScalar(1.4);
    }
    const mastDrop = camera === 'basic' ? -0.35 : camera === 'advanced' ? 0.15 : 0;
    if (mastDrop && (child as THREE.Group).isGroup && near(p, 0, 2.75, -0.64)) p.y += mastDrop;
    if (mastDrop && near(p, 0, 2.115, -0.64)) {
      child.scale.y = (1.07 + mastDrop) / 1.07;
      p.y += mastDrop / 2;
    }
  }
  if (power === 'advanced') {
    // Finned radioisotope power unit at the rear (+Z is aft for the kit rover)
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 16), trim, 0, 1.55, 1.42, 0.6);
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.03, 0.62, 0.5), trim, 0, 1.55, 1.42, 0.6, (i / 6) * Math.PI);
  }
  if (has('arm')) {
    // Stowed robotic arm across the front (-Z), with a tool turret
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), cream, 0.25, 1.05, -1.42, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 10), cream, -0.3, 0.88, -1.48, 0.4, 0, 0);
    add(new THREE.BoxGeometry(0.32, 0.3, 0.3), has('abrasion') ? gold : trim, -0.3, 0.62, -1.6);
  }
  if (has('weather')) add(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), trim, 0.35, 2.3, -0.64, 0, 0, Math.PI / 2);
  if (has('radar')) add(new THREE.BoxGeometry(0.5, 0.12, 0.3), trim, 0, 0.78, 1.15);
}

/** Our heading (h=0 → +X, counter-clockwise) to the kit's (0 → −Z, positive toward +X). */
export const kitHeading = (h: number) => Math.PI / 2 - h;

/** Create the dressed kit rover for the surface; the caller adds `root` to the scene and disposes it. */
export function createLegacyRover(mission: MissionDefinition, design: Design, height: (x: number, z: number) => number = heightAt) {
  const v = createRoverVisual(THREE, { heightAt: height });
  dressRover(v, mission, design);
  // Moving parts stay separate: wheel groups, suspension links (updated every frame) and the mast group.
  mergeStatic(v.rover, new Set(v.wheels.map((w) => w.userData.arm as THREE.Object3D)));
  for (const w of v.wheels) mergeStatic(w, new Set());
  return v;
}

/**
 * Merge the visible static meshes that are direct children of `parent` into one mesh per material.
 * Purely a draw-call optimisation (~300 → ~40): shapes, materials and transforms are unchanged,
 * and nothing that the kit animates is merged.
 */
function mergeStatic(parent: THREE.Object3D, keep: Set<THREE.Object3D>) {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Mesh[] = [];
  for (const c of parent.children) {
    const m = c as THREE.Mesh;
    if (!m.isMesh || keep.has(m) || Array.isArray(m.material)) continue;
    remove.push(m);
    if (!m.visible) continue;
    m.updateMatrix();
    let g = m.geometry.clone().applyMatrix4(m.matrix);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const mat = m.material as THREE.Material;
    byMat.set(mat, [...(byMat.get(mat) ?? []), g]);
  }
  for (const r of remove) {
    r.geometry.dispose();
    parent.remove(r);
  }
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mesh.receiveShadow = !mat.transparent;
    parent.add(mesh);
  }
}

/** Static, dressed kit rover for the build workshop turntable (same model the player then drives). */
export function KitRoverPreview({ mission, design }: { mission: MissionDefinition; design: Design }) {
  const key = JSON.stringify(design);
  const [v, setV] = useState<RoverVisual | null>(null);
  useEffect(() => {
    const r = createLegacyRover(mission, design, () => 0);
    r.reset({ x: 0, z: 0, heading: kitHeading(0) });
    setV(r);
    return () => {
      setV(null);
      r.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, key]);
  return v ? <primitive object={v.root} /> : null;
}
