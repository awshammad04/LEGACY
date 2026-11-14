import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { getMission } from '../content/missions';
import { computeMetrics } from '../core/evaluate';
import { ARRIVAL_RADIUS, MAX_WAYPOINTS, approachPoint, predictRoute } from '../core/ops';
import { TERRAIN_SIZE, heightAt } from '../core/terrain';
import { mulberry32 } from '../core/rng';
import { isTestMode, useGame, useT, useUi } from '../game/store';
import { sfx } from '../game/audio';
import { RoverModel } from './models';
import { groundTextures } from './terrainfx';

const SEG = 240;


export function spotsTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8a3a22';
  ctx.fillRect(0, 0, 512, 512);
  const rnd = mulberry32(7);
  // white calcium-sulfate veins
  ctx.strokeStyle = 'rgba(240,235,225,0.85)';
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 3 + rnd() * 6;
    ctx.beginPath();
    ctx.moveTo(rnd() * 512, 0);
    ctx.bezierCurveTo(rnd() * 512, 170, rnd() * 512, 340, rnd() * 512, 512);
    ctx.stroke();
  }
  // leopard spots: light cores, dark rims
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 5 + rnd() * 12;
    ctx.fillStyle = '#1f1410';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e3c9a0';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  // poppy seeds
  ctx.fillStyle = '#1a1210';
  for (let i = 0; i < 260; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * 512, rnd() * 512, 1 + rnd() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const KIT_ROUGH = new THREE.Color('#83634f');

const PALETTES = {
  mars: ['#6a341d', '#c98c5a', '#47261a', '#d9a273'],
  moon: ['#55575c', '#a7a8ac', '#3a3b3f', '#c4c5c8'],
} as const;

export function Terrain({ onPick, theme = 'mars', material }: { onPick: (p: [number, number]) => void; theme?: 'mars' | 'moon'; material?: THREE.Material }) {
  const kit = !!material;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const [cl, ch, cd, cp] = PALETTES[theme];
    const low = new THREE.Color(cl);
    const high = new THREE.Color(ch);
    const dark = new THREE.Color(cd);
    const pale = new THREE.Color(cp);
    const c = new THREE.Color();
    const rnd = mulberry32(3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i);
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (kit) {
        // Graphics-kit palette (createMarsLandscape): firm sand vs darker rough ground, low-frequency variation
        const steepK = 1 - nrm.getY(i);
        const patchK = Math.sin(x * 0.021 + Math.sin(z * 0.013) * 2) * Math.cos(z * 0.017 - x * 0.006);
        const rough = THREE.MathUtils.clamp(steepK * 6 + (h < -3 ? 0.45 : 0) + (patchK < -0.6 ? (-0.6 - patchK) * 2 : 0), 0, 1);
        c.set('#bc9273').lerp(KIT_ROUGH, rough);
        c.multiplyScalar(0.83 + 0.1 * Math.sin(x * 0.035 + z * 0.029) + 0.07 * Math.cos(z * 0.08) + 0.04 * Math.sin(x * 0.7 + z * 0.5));
        colors.set([c.r, c.g, c.b], i * 3);
        continue;
      }
      const k = THREE.MathUtils.clamp((h + 6) / 22, 0, 1);
      c.copy(low).lerp(high, k);
      // dusty patches + darker steep slopes (exposed rock) + pale bedrock streaks
      const patch = Math.sin(x * 0.021 + Math.sin(z * 0.013) * 2) * Math.cos(z * 0.017 - x * 0.006);
      if (patch > 0.55) c.lerp(pale, (patch - 0.55) * 0.9);
      const steep = 1 - nrm.getY(i);
      c.lerp(dark, THREE.MathUtils.clamp(steep * 5, 0, 0.6));
      if (h < -3) c.lerp(dark, 0.3);
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.035);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [theme, kit]);
  const ground = useMemo(() => groundTextures(theme), [theme]);
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };
  return (
    <mesh geometry={geo} receiveShadow onClick={click} material={material}>
      {!material && <meshStandardMaterial vertexColors map={ground.map} normalMap={ground.normal} normalScale={new THREE.Vector2(0.85, 0.85)} roughness={0.96} metalness={0} />}
    </mesh>
  );
}

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = `varying vec3 vDir; uniform vec3 uSun;
void main(){
  float h = clamp(vDir.y, -0.1, 1.0);
  vec3 horizon = vec3(0.86, 0.66, 0.47);
  vec3 zenith = vec3(0.55, 0.36, 0.25);
  vec3 col = mix(horizon, zenith, pow(max(h,0.0), 0.55));
  float s = max(dot(normalize(vDir), normalize(uSun)), 0.0);
  col += vec3(0.75, 0.82, 0.95) * pow(s, 60.0) * 0.6 + vec3(1.0, 0.97, 0.9) * pow(s, 900.0) * 2.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export function MarsSky({ sun }: { sun: THREE.Vector3 }) {
  const uniforms = useMemo(() => ({ uSun: { value: sun.clone().normalize() } }), [sun]);
  return (
    <mesh scale={1500}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

function Rocks({ target }: { target: [number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 900;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rnd = mulberry32(42);
    const o = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      let x = (rnd() - 0.5) * (TERRAIN_SIZE - 100);
      let z = (rnd() - 0.5) * (TERRAIN_SIZE - 100);
      if (i < 120) {
        x = target[0] + (rnd() - 0.5) * 60;
        z = target[1] + (rnd() - 0.5) * 60;
      }
      if (Math.hypot(x - target[0], z - target[1]) < 6) continue;
      const s = 0.25 + rnd() ** 3 * 2.4;
      o.position.set(x, heightAt(x, z) + s * 0.25, z);
      o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      o.scale.set(s, s * (0.5 + rnd() * 0.5), s * (0.7 + rnd() * 0.6));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [target]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8a5236" roughness={0.92} flatShading />
    </instancedMesh>
  );
}

export function TargetRock({ pos, focus }: { pos: [number, number]; focus: boolean }) {
  const tex = useMemo(() => spotsTexture(), []);
  const ring = useRef<THREE.Mesh>(null);
  const t = useT();
  useFrame(({ clock }) => {
    if (ring.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.08;
      ring.current.scale.set(s, s, s);
    }
  });
  const y = heightAt(pos[0], pos[1]);
  return (
    <group position={[pos[0], y, pos[1]]}>
      <mesh position={[0, 0.55, 0]} rotation={[0.2, 0.6, -0.15]} scale={[1.8, 0.9, 1.1]} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial map={tex} roughness={0.85} flatShading />
      </mesh>
      {!focus && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <ringGeometry args={[ARRIVAL_RADIUS - 0.8, ARRIVAL_RADIUS, 64]} />
          <meshBasicMaterial color="#5ad1ff" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
      {!focus && (
        <Html position={[0, 3.2, 0]} center distanceFactor={60} zIndexRange={[10, 0]}>
          <div className="poi-label" style={{ transform: 'none', cursor: 'default' }}>
            ◎ {t('Target rock')}
          </div>
        </Html>
      )}
    </group>
  );
}

function terrainLine(a: [number, number], b: [number, number]) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 3));
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n;
    const z = a[1] + ((b[1] - a[1]) * i) / n;
    pts.push([x, heightAt(x, z) + 0.35, z]);
  }
  return pts;
}

function Rover() {
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const reduced = useGame((s) => s.settings.reducedMotion);
  const mission = getMission(missionId);
  const g = useRef<THREE.Group>(null);
  const disp = useRef<[number, number]>([...state.ops.pos]);
  const queue = useRef<[number, number][]>([]);
  const seen = useRef(state.ops.path.length);
  const heading = useRef(0);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;

  useEffect(() => {
    const path = state.ops.path;
    if (path.length < seen.current) {
      // rewound: jump
      disp.current = [...state.ops.pos];
      queue.current = [];
    } else if (path.length > seen.current) {
      queue.current.push(...path.slice(seen.current).map((p) => [...p] as [number, number]));
      useUi.getState().set({ driving: true });
    }
    seen.current = path.length;
  }, [state.ops.path, state.ops.pos]);

  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame((_, dt) => {
    if (!g.current) return;
    const q = queue.current;
    if (q.length) {
      const [tx, tz] = q[0];
      const [x, z] = disp.current;
      const dx = tx - x;
      const dz = tz - z;
      const d = Math.hypot(dx, dz);
      const stepLen = (reduced || isTestMode() ? 400 : 34) * dt;
      if (d <= stepLen) {
        disp.current = [tx, tz];
        q.shift();
        if (!q.length) useUi.getState().set({ driving: false });
      } else {
        disp.current = [x + (dx / d) * stepLen, z + (dz / d) * stepLen];
      }
      if (d > 0.01) heading.current = Math.atan2(-dz, dx);
    }
    const [x, z] = disp.current;
    const y = heightAt(x, z);
    g.current.position.set(x, y, z);
    const e = 1.5;
    const n = new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
    const tilt = new THREE.Quaternion().setFromUnitVectors(up, n);
    const yaw = new THREE.Quaternion().setFromAxisAngle(up, heading.current);
    g.current.quaternion.copy(tilt.multiply(yaw));
    if (controls?.target) controls.target.lerp(new THREE.Vector3(x, y + 1, z), Math.min(1, dt * 3));
  });
  return (
    <group ref={g}>
      <RoverModel mission={mission} design={state.design} scale={1.4} />
    </group>
  );
}

export function SurfaceScene({ focusRock = false }: { focusRock?: boolean }) {
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const quality = useGame((s) => s.settings.quality);
  const waypoints = useUi((s) => s.waypoints);
  const speed = useUi((s) => s.speed);
  const driving = useUi((s) => s.driving);
  const mission = getMission(missionId);
  const metrics = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const sun = useMemo(() => new THREE.Vector3(-0.6, 0.55, -0.4), []);
  const { camera } = useThree();
  const canPlan = state.stage === 'surface' && !state.pendingEvent && !state.ops.arrived && !driving;

  const site = mission.landingSites.find((s) => s.id === state.landingSite);

  useEffect(() => {
    const [x, z] = focusRock ? mission.target : state.ops.pos;
    const y = heightAt(x, z);
    if (focusRock) camera.position.set(x + 10, y + 5, z + 12);
    else camera.position.set(x + 26, y + 11, z + 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRock]);

  const pred = useMemo(() => (waypoints.length ? predictRoute(metrics, state.ops.pos, waypoints, speed, mission.target) : null), [metrics, state.ops.pos, waypoints, speed, mission.target]);

  const pick = (p: [number, number]) => {
    if (!canPlan) return;
    if (waypoints.length >= MAX_WAYPOINTS) return sfx('error');
    let pt = p;
    if (Math.hypot(p[0] - mission.target[0], p[1] - mission.target[1]) < ARRIVAL_RADIUS * 1.6) pt = approachPoint(waypoints[waypoints.length - 1] ?? state.ops.pos, mission.target);
    sfx('click');
    useUi.getState().set({ waypoints: [...waypoints, pt] });
  };

  const travelled = useMemo(() => {
    const out: [number, number, number][] = [];
    const p = state.ops.path;
    for (let i = 0; i < p.length - 1; i++) out.push(...terrainLine(p[i], p[i + 1]));
    return out;
  }, [state.ops.path]);

  return (
    <>
      <MarsSky sun={sun} />
      <fog attach="fog" args={['#c9946b', 120, 640]} />
      <hemisphereLight args={['#f0c9a0', '#3a2015', 0.55]} />
      <directionalLight
        position={[sun.x * 300, sun.y * 300, sun.z * 300]}
        intensity={2.1}
        color="#fff0dc"
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={800}
      />
      <Terrain onPick={pick} />
      <Rocks target={mission.target} />
      <TargetRock pos={mission.target} focus={focusRock} />
      {site && (
        <mesh position={[site.start[0], heightAt(site.start[0], site.start[1]) + 0.15, site.start[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3, 3.6, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
      {travelled.length > 1 && <Line points={travelled} color="#ffffff" lineWidth={2} dashed dashSize={2} gapSize={1.4} transparent opacity={0.7} />}
      {pred &&
        pred.segments.map((s, i) => (
          <Line key={i} points={terrainLine(s.from, s.to)} color={s.blocked ? '#ff6b6b' : pred.incidentSegment === i ? '#ffb547' : '#5ad1ff'} lineWidth={3.5} />
        ))}
      {waypoints.map((w, i) => (
        <group key={i} position={[w[0], heightAt(w[0], w[1]), w[1]]}>
          <mesh position={[0, 1.4, 0]}>
            <coneGeometry args={[0.7, 1.6, 12]} />
            <meshBasicMaterial color="#5ad1ff" />
          </mesh>
          <Html position={[0, 3.4, 0]} center distanceFactor={70} zIndexRange={[10, 0]}>
            <div className="poi-label" style={{ transform: 'none' }}>{i + 1}</div>
          </Html>
        </group>
      ))}
      <Rover />
      <OrbitControls makeDefault enablePan={false} minDistance={focusRock ? 5 : 12} maxDistance={focusRock ? 30 : 240} maxPolarAngle={Math.PI / 2.15} />
    </>
  );
}
