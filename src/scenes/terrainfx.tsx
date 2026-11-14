import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mulberry32 } from '../core/rng';
import { heightAt, TERRAIN_SIZE } from '../core/terrain';
import type { Rock } from '../core/explore';
import { useKitMaterials } from '../legacy-visuals/MarsKit';

/* ------------------------------------------------------------------ */
/* Planetary surface detail: varied rocks, pebbles, ground textures,    */
/* distant crater rim, airborne dust. All procedural (no downloads).    */
/* ------------------------------------------------------------------ */

type Theme = 'mars' | 'moon';

/** Smooth value noise on a wrapping grid, summed over octaves → tileable fBm. */
function fbmField(size: number, seed: number, octaves = 5) {
  const rnd = mulberry32(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = 4 << o;
    const grid = new Float32Array(cells * cells).map(() => rnd());
    const g = (x: number, y: number) => grid[((y + cells) % cells) * cells + ((x + cells) % cells)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
        const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

const texCache = new Map<string, { map: THREE.CanvasTexture; normal: THREE.CanvasTexture }>();

/** Tileable ground detail (albedo variation + normal map) for close-up surface grain. */
export function groundTextures(theme: Theme) {
  const hit = texCache.get(theme);
  if (hit) return hit;
  const N = 256;
  const h = fbmField(N, theme === 'mars' ? 11 : 23, 6);
  const grit = mulberry32(5);
  // Albedo: mostly near-white so the terrain's vertex colours dominate
  const c1 = document.createElement('canvas');
  c1.width = c1.height = N;
  const x1 = c1.getContext('2d')!;
  const img = x1.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = 175 + h[i] * 70 + (grit() - 0.5) * 26;
    img.data[i * 4] = Math.min(255, v * (theme === 'mars' ? 1.02 : 1));
    img.data[i * 4 + 1] = Math.min(255, v * (theme === 'mars' ? 0.97 : 1));
    img.data[i * 4 + 2] = Math.min(255, v * (theme === 'mars' ? 0.92 : 1));
    img.data[i * 4 + 3] = 255;
  }
  x1.putImageData(img, 0, 0);
  // Normal map from the height field (tileable central differences) + fine grit
  const c2 = document.createElement('canvas');
  c2.width = c2.height = N;
  const x2 = c2.getContext('2d')!;
  const nimg = x2.createImageData(N, N);
  const H = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)];
  const k = 6;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * k + (grit() - 0.5) * 0.25;
      const dy = (H(x, y + 1) - H(x, y - 1)) * k + (grit() - 0.5) * 0.25;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      nimg.data[i] = (-dx / len) * 127 + 128;
      nimg.data[i + 1] = (-dy / len) * 127 + 128;
      nimg.data[i + 2] = (1 / len) * 127 + 128;
      nimg.data[i + 3] = 255;
    }
  }
  x2.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(c1);
  map.colorSpace = THREE.SRGBColorSpace;
  const normal = new THREE.CanvasTexture(c2);
  for (const t of [map, normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(110, 110);
    t.anisotropy = 8;
  }
  const out = { map, normal };
  texCache.set(theme, out);
  return out;
}

/** A lumpy, irregular rock: noise-displaced icosahedron, flattened like weathered basalt. */
function rockGeometry(seed: number, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rnd = mulberry32(seed);
  const bumps = Array.from({ length: 7 }, () => ({ d: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), a: 0.12 + rnd() * 0.22 }));
  const v = new THREE.Vector3();
  const cut = 0.25 + rnd() * 0.35; // a flat facet like a fractured face
  const cutDir = new THREE.Vector3(rnd() - 0.5, rnd() * 0.4, rnd() - 0.5).normalize();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let r = 1;
    for (const b of bumps) r += b.a * Math.max(0, v.dot(b.d)) ** 3 - b.a * 0.25;
    v.multiplyScalar(r);
    const along = v.dot(cutDir);
    if (along > 1 - cut) v.addScaledVector(cutDir, (1 - cut) - along);
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.3; // seated base
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const ROCK_PALETTE: Record<Theme, string[]> = {
  mars: ['#7d4630', '#5e3424', '#94583a', '#4a2e24', '#a06a48', '#6b3f2c'],
  moon: ['#6e6f74', '#5a5b60', '#86878c', '#4b4c50', '#9a9ba0'],
};

/** Collidable rock field rendered as several distinct rock shapes with per-rock colour. */
export function VariedRocks({ rocks, theme }: { rocks: Rock[]; theme: Theme }) {
  const SHAPES = 4;
  const geos = useMemo(() => Array.from({ length: SHAPES }, (_, i) => rockGeometry(101 + i * 17, i === 0 ? 2 : 1)), []);
  const groups = useMemo(() => {
    const out: Rock[][] = Array.from({ length: SHAPES }, () => []);
    rocks.forEach((r, i) => out[i % SHAPES].push(r));
    return out;
  }, [rocks]);
  return (
    <>
      {groups.map((list, gi) => (
        <RockInstances key={gi} geo={geos[gi]} rocks={list} theme={theme} seed={gi} />
      ))}
    </>
  );
}

function RockInstances({ geo, rocks, theme, seed }: { geo: THREE.BufferGeometry; rocks: Rock[]; theme: Theme; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const kit = useKitMaterials();
  const kitMat = kit && theme === 'mars' ? kit.rocks[seed % kit.rocks.length] : null;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const pal = ROCK_PALETTE[theme];
    const rnd = mulberry32(31 + seed);
    const c = new THREE.Color();
    rocks.forEach((r, i) => {
      o.position.set(r.x, r.y - r.s * 0.18, r.z);
      o.rotation.set(r.rx * 0.4, r.ry, r.rz * 0.4);
      o.scale.set(r.s, r.s * r.sy, r.s * r.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // Kit materials carry their own colour: keep only a gentle per-rock brightness variation
      if (kitMat) c.setScalar(0.82 + rnd() * 0.3);
      else c.set(pal[Math.floor(rnd() * pal.length)]).offsetHSL(0, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.06);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [rocks, theme, seed, kitMat]);
  const { normal } = groundTextures(theme);
  return kitMat ? (
    <instancedMesh key="kit" ref={ref} args={[geo, kitMat, rocks.length]} castShadow receiveShadow />
  ) : (
    <instancedMesh key="classic" ref={ref} args={[geo, undefined, rocks.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.9} metalness={0.02} normalMap={normal} normalScale={new THREE.Vector2(0.6, 0.6)} flatShading={false} />
    </instancedMesh>
  );
}

/** Thousands of tiny non-colliding pebbles for ground-level scale and texture. */
export function Pebbles({ theme, count = 2600, radius = 260 }: { theme: Theme; count?: number; radius?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => rockGeometry(7, 0), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rnd = mulberry32(theme === 'mars' ? 77 : 78);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const pal = ROCK_PALETTE[theme];
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * radius;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const s = 0.06 + rnd() ** 3 * 0.32;
      o.position.set(x, heightAt(x, z) + s * 0.1, z);
      o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      o.scale.set(s, s * (0.5 + rnd() * 0.4), s * (0.7 + rnd() * 0.5));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      c.set(pal[Math.floor(rnd() * pal.length)]).offsetHSL(0, 0, (rnd() - 0.4) * 0.08);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [theme, count, radius]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]} receiveShadow>
      <meshStandardMaterial roughness={0.95} flatShading />
    </instancedMesh>
  );
}

/** Far crater rim / highlands silhouette beyond the playable area, softened by haze. */
export function CraterRim({ theme }: { theme: Theme }) {
  const geo = useMemo(() => {
    const seg = 220;
    const R = TERRAIN_SIZE * 0.62;
    const g = new THREE.CylinderGeometry(R, R * 1.08, 1, seg, 6, true);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rnd = mulberry32(theme === 'mars' ? 9 : 10);
    const peaks = Array.from({ length: 9 }, () => ({ a: rnd() * Math.PI * 2, w: 0.2 + rnd() * 0.5, h: 0.5 + rnd() * 0.9 }));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i) + 0.5; // 0..1
      const a = Math.atan2(z, x);
      let hgt = 0.35 + Math.sin(a * 3 + 1) * 0.12 + Math.sin(a * 11) * 0.05 + Math.sin(a * 29 + 2) * 0.025;
      for (const p of peaks) {
        const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a));
        hgt += p.h * Math.exp(-(d * d) / (p.w * p.w * 0.1));
      }
      pos.setY(i, y * hgt * (theme === 'mars' ? 46 : 60) - 8);
    }
    g.computeVertexNormals();
    return g;
  }, [theme]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={theme === 'mars' ? '#9a5f3e' : '#6a6b70'} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Fine airborne dust drifting around the camera (Mars only). Denser in a storm. */
export function DustMotes({ storm = false }: { storm?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const N = 700;
  const geo = useMemo(() => {
    const rnd = mulberry32(42);
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) p.set([(rnd() - 0.5) * 60, rnd() * 18, (rnd() - 0.5) * 60], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const off = useRef(0);
  useFrame((_, dt) => {
    const grp = ref.current;
    if (!grp) return;
    off.current += dt * (storm ? 4 : 0.8);
    // Keep the dust volume centred on the camera, wrapping so it never runs out
    const cx = Math.floor(camera.position.x / 60) * 60;
    const cz = Math.floor(camera.position.z / 60) * 60;
    grp.position.set(cx + (off.current % 60), camera.position.y - 6, cz + ((off.current * 0.4) % 60));
  });
  return (
    <group ref={ref}>
      {[-60, 0, 60].map((dx) =>
        [-60, 0, 60].map((dz) => (
          <points key={`${dx}:${dz}`} geometry={geo} position={[dx, 0, dz]}>
            <pointsMaterial color={storm ? '#d9a77a' : '#e8c39a'} size={storm ? 0.16 : 0.08} sizeAttenuation transparent opacity={storm ? 0.7 : 0.45} depthWrite={false} />
          </points>
        )),
      )}
    </group>
  );
}
