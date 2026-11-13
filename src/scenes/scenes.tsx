import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { getMission } from '../content/missions';
import { ORBIT_LEARN_CARDS, SKY_CARDS } from '../content/learn';
import { tierOf } from '../core/evaluate';
import { useGame, useT, useUi } from '../game/store';
import { openLearnCard } from '../ui/common';
import { Earth, Exhaust, JEZERO, MarsGlobe, Rocket, RoverModel, Satellite, latLonToVec3, rocketHeight } from './models';
import { LanderModel, TelescopeModel } from './craft';

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export function SpaceBackdrop({ count = 6000 }: { count?: number }) {
  return (
    <>
      <color attach="background" args={['#02040a']} />
      <Stars radius={180} depth={80} count={count} factor={4} saturation={0.2} fade speed={0.3} />
    </>
  );
}

function CameraRig({ position, target = [0, 0, 0], lerp = 2 }: { position: [number, number, number]; target?: [number, number, number]; lerp?: number }) {
  const { camera } = useThree();
  const tgt = useMemo(() => new THREE.Vector3(...target), [target]);
  const pos = useMemo(() => new THREE.Vector3(...position), [position]);
  useFrame((_, dt) => {
    camera.position.lerp(pos, Math.min(1, dt * lerp));
    camera.lookAt(tgt);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Mission Control HQ (home, quiz, briefing)                           */
/* ------------------------------------------------------------------ */

export function HQScene({ showMars = false }: { showMars?: boolean }) {
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.08;
  });
  const x = rtl ? -2.6 : 2.6;
  return (
    <>
      <SpaceBackdrop />
      <ambientLight intensity={0.08} />
      <directionalLight position={[-6, 3, 8]} intensity={3} color="#fff6e8" />
      <group ref={g} position={[x, showMars ? -0.2 : 1.1, 0]}>
        {showMars ? <MarsGlobe radius={2.1} spin={0.04} /> : <Earth radius={2.1} spin={0.035} />}
      </group>
      <CameraRig position={[0, 0.3, 8.5]} target={[0, 0, 0]} lerp={1.2} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Earth Build Workshop (clean room)                                   */
/* ------------------------------------------------------------------ */

export function WorkshopScene() {
  const state = useGame((s) => s.state);
  const missionId = useGame((s) => s.missionId);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const turn = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (turn.current && !reduced) turn.current.rotation.y += dt * 0.25;
  });
  if (!state || !missionId) return null;
  const mission = getMission(missionId);
  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <fog attach="fog" args={['#0b1220', 14, 34]} />
      <hemisphereLight args={['#cfe3ff', '#1a2233', 0.7]} />
      <directionalLight position={[5, 8, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-6, 7, -3]} angle={0.5} penumbra={0.6} intensity={60} color="#7fc8ff" />
      <spotLight position={[6, 6, -4]} angle={0.5} penumbra={0.6} intensity={40} color="#ffcf9a" />
      {/* Floor + turntable */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#141c2c" roughness={0.6} metalness={0.2} />
      </mesh>
      <gridHelper args={[40, 40, '#22406b', '#18243a']} position={[0, 0.01, 0]} />
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.7, 0.12, 64]} />
        <meshStandardMaterial color="#1f2a3f" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.45, 2.55, 64]} />
        <meshBasicMaterial color="#5ad1ff" />
      </mesh>
      {/* Back wall light strips */}
      {[-6, -3, 0, 3, 6].map((x) => (
        <mesh key={x} position={[x, 3.5, -9]}>
          <boxGeometry args={[0.08, 6, 0.08]} />
          <meshBasicMaterial color="#2c5c8f" />
        </mesh>
      ))}
      <group ref={turn} position={[0, 0.12, 0]}>
        {mission.model === 'telescope' ? (
          <TelescopeModel mission={mission} design={state.design} />
        ) : mission.model === 'lunar' ? (
          <LanderModel mission={mission} design={state.design} />
        ) : (
          <RoverModel mission={mission} design={state.design} />
        )}
      </group>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={11} maxPolarAngle={Math.PI / 2.1} target={[0, 0.9, 0]} />
      <CameraRigOnce position={[6.8, 3.4, 6.8]} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Launch cinematic                                                    */
/* ------------------------------------------------------------------ */

export const launchClock = { start: 0, duration: 10 };

export function LaunchScene() {
  const state = useGame((s) => s.state);
  const missionId = useGame((s) => s.missionId);
  const rocket = useRef<THREE.Group>(null);
  const lower = useRef<THREE.Group>(null);
  const exhaust = useRef<THREE.Group>(null);
  const sky = useRef<THREE.Color>(new THREE.Color('#6d93c4'));
  const { camera, scene } = useThree();
  const tier = state && missionId ? tierOf(getMission(missionId), state.design, 'launcher') ?? 'basic' : 'basic';
  const h = rocketHeight(tier);
  useFrame(() => {
    const t = (performance.now() - launchClock.start) / 1000;
    const ignite = 3;
    const tt = Math.max(0, t - ignite);
    const y = 0.35 * tt * tt * 1.6;
    if (rocket.current) {
      rocket.current.position.y = y;
      rocket.current.rotation.z = -Math.min(0.5, tt * 0.04);
      rocket.current.position.x = Math.min(30, tt * tt * 0.08);
    }
    if (exhaust.current) exhaust.current.visible = t > ignite - 0.3;
    if (lower.current) {
      const sep = t > 9.5;
      lower.current.visible = !sep || t < 13;
      if (sep) lower.current.position.y -= 0.15;
    }
    const k = Math.min(1, Math.max(0, (t - 6) / 6));
    sky.current.set('#6d93c4').lerp(new THREE.Color('#02040a'), k);
    scene.background = sky.current;
    const target = new THREE.Vector3(rocket.current?.position.x ?? 0, (rocket.current?.position.y ?? 0) + h * 0.5, 0);
    const camPos = new THREE.Vector3(target.x + 16, Math.max(3, target.y - 4 + (t < ignite ? 0 : 2)), 22);
    camera.position.lerp(camPos, 0.06);
    camera.lookAt(target);
  });
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 8]} intensity={2.4} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#5c6b4a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[8, 0.5, 8]} />
        <meshStandardMaterial color="#7d8591" roughness={0.9} />
      </mesh>
      <mesh position={[-2.4, h * 0.55, 0]} castShadow>
        <boxGeometry args={[0.8, h * 1.1, 0.8]} />
        <meshStandardMaterial color="#9a4b2e" roughness={0.8} wireframe />
      </mesh>
      <group ref={rocket} position={[0, 0.5, 0]}>
        <group ref={lower}>
          <Rocket tier={tier} />
        </group>
        <group ref={exhaust} visible={false}>
          <Exhaust length={h * 0.55} radius={tier === 'advanced' ? 1 : 0.6} />
        </group>
      </group>
      <Smoke />
      <Stars radius={200} depth={60} count={3000} factor={4} fade />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Orbit Explorer                                                      */
/* ------------------------------------------------------------------ */

interface NamedSat {
  cardId: string;
  radius: number;
  incl: number;
  raan: number;
  speed: number;
  phase: number;
  color: string;
}
const NAMED: NamedSat[] = [
  { cardId: 'lc-iss', radius: 2.18, incl: 51.6, raan: 20, speed: 0.55, phase: 0, color: '#ffffff' },
  { cardId: 'lc-terra', radius: 2.3, incl: 98.2, raan: 110, speed: 0.42, phase: 1.5, color: '#9fe3ff' },
  { cardId: 'lc-aqua', radius: 2.3, incl: 98.2, raan: 160, speed: 0.42, phase: 3.6, color: '#7fd0ff' },
  { cardId: 'lc-landsat', radius: 2.3, incl: 98.2, raan: 60, speed: 0.42, phase: 5.1, color: '#b8f5c8' },
];

function orbitPos(radius: number, incl: number, raan: number, angle: number, out = new THREE.Vector3()) {
  out.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  out.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(incl));
  out.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(raan));
  return out;
}

function OrbitPath({ radius, incl, raan, color, opacity = 0.35 }: { radius: number; incl: number; raan: number; color: string; opacity?: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) pts.push(orbitPos(radius, incl, raan, (i / 128) * Math.PI * 2));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, incl, raan]);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineLoop>
  );
}

function Starlink() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 160;
  const params = useMemo(() => Array.from({ length: N }, (_, i) => ({ plane: i % 16, slot: Math.floor(i / 16) })), []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    params.forEach((p, i) => {
      const a = clock.elapsedTime * 0.5 + (p.slot / 10) * Math.PI * 2 + p.plane * 0.2;
      orbitPos(2.24, 53, p.plane * 22.5, a, tmp.position);
      tmp.updateMatrix();
      ref.current!.setMatrixAt(i, tmp.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} onClick={(e) => (e.stopPropagation(), openLearnCard(ORBIT_LEARN_CARDS.find((c) => c.id === 'lc-starlink')))}>
      <boxGeometry args={[0.025, 0.025, 0.025]} />
      <meshBasicMaterial color="#ffd6a0" />
    </instancedMesh>
  );
}

function NamedSatellite({ s }: { s: NamedSat }) {
  const ref = useRef<THREE.Group>(null);
  const t = useT();
  const card = ORBIT_LEARN_CARDS.find((c) => c.id === s.cardId)!;
  useFrame(({ clock }) => {
    if (ref.current) orbitPos(s.radius, s.incl, s.raan, clock.elapsedTime * s.speed * 0.4 + s.phase, ref.current.position);
  });
  return (
    <group ref={ref}>
      <group onClick={(e) => (e.stopPropagation(), openLearnCard(card))} scale={s.cardId === 'lc-iss' ? 1.6 : 1}>
        <Satellite color={s.color} scale={0.9} />
      </group>
      <Html center distanceFactor={9} zIndexRange={[10, 0]}>
        <button className="poi-label" onClick={() => openLearnCard(card)}>
          {t(card.name).split(' (')[0]}
        </button>
      </Html>
    </group>
  );
}

export function OrbitScene() {
  return (
    <>
      <SpaceBackdrop />
      <ambientLight intensity={0.06} />
      <directionalLight position={[-4, 4, 9]} intensity={3.2} color="#fff6e8" />
      <Earth radius={2} spin={0.02} />
      <Starlink />
      <OrbitPath radius={2.24} incl={53} raan={0} color="#ffd6a0" opacity={0.15} />
      {NAMED.map((s) => (
        <group key={s.cardId}>
          <OrbitPath radius={s.radius} incl={s.incl} raan={s.raan} color={s.color} opacity={0.22} />
          <NamedSatellite s={s} />
        </group>
      ))}
      <SkyObjects />
      <OrbitControls enablePan={false} minDistance={3.6} maxDistance={12} autoRotate autoRotateSpeed={0.25} />
      <CameraRigOnce position={[5.5, 2.2, 6]} />
    </>
  );
}

/** Moves the camera once on mount (so OrbitControls can take over). */
function CameraRigOnce({ position }: { position: [number, number, number] }) {
  const { camera } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);
    done.current = true;
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Mars approach / landing-site selection                              */
/* ------------------------------------------------------------------ */

export function MarsOrbitScene() {
  const marker = useMemo(() => latLonToVec3(JEZERO.lat, JEZERO.lon, 2.01), []);
  const camPos = useMemo(() => latLonToVec3(JEZERO.lat + 8, JEZERO.lon - 14, 4.6), []);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.15);
  });
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), marker.clone().normalize()), [marker]);
  return (
    <>
      <SpaceBackdrop />
      <ambientLight intensity={0.08} />
      <directionalLight position={[camPos.x * 2 + 4, camPos.y * 2 + 3, camPos.z * 2 - 2]} intensity={3} color="#fff1e0" />
      <MarsGlobe radius={2}>
        <mesh ref={ring} position={marker} quaternion={q}>
          <ringGeometry args={[0.06, 0.085, 40]} />
          <meshBasicMaterial color="#5ad1ff" side={THREE.DoubleSide} />
        </mesh>
      </MarsGlobe>
      <CameraRig position={[camPos.x, camPos.y, camPos.z]} target={[marker.x * 0.6, marker.y * 0.6, marker.z * 0.6]} lerp={0.8} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Look Around — illustrative sky (not a real-time star map)           */
/* ------------------------------------------------------------------ */

const SKY: { id: string; pos: [number, number, number]; color: string; size: number }[] = [
  { id: 'sky-moon', pos: [-38, 9, -30], color: '#d8d8d2', size: 1.6 },
  { id: 'sky-venus', pos: [55, 14, -40], color: '#fff3c4', size: 0.45 },
  { id: 'sky-mars', pos: [-60, 22, 35], color: '#ff8a5c', size: 0.5 },
  { id: 'sky-jupiter', pos: [40, 30, 60], color: '#f0d9b0', size: 0.6 },
];

function SkyObjects() {
  const look = useUi((s) => s.lookAround);
  const t = useT();
  return (
    <group>
      {SKY.map((o) => {
        const card = SKY_CARDS.find((c) => c.id === o.id)!;
        return (
          <group key={o.id} position={o.pos}>
            <mesh onClick={(e) => (e.stopPropagation(), openLearnCard(card))}>
              <sphereGeometry args={[o.size, 32, 32]} />
              <meshBasicMaterial color={o.color} toneMapped={false} />
            </mesh>
            {look && (
              <Html center distanceFactor={40} zIndexRange={[10, 0]}>
                <button className="poi-label" onClick={() => openLearnCard(card)}>
                  ✦ {t(card.name)}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Exhaust smoke: puffs released at the rocket's base along its (deterministic) ascent path. */
function Smoke() {
  const N = 40;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => Array.from({ length: N }, () => new THREE.MeshStandardMaterial({ color: '#d9d4cc', transparent: true, opacity: 0, depthWrite: false, roughness: 1 })), []);
  useFrame(() => {
    const t = (performance.now() - launchClock.start) / 1000;
    for (let i = 0; i < N; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const born = 3 + i * 0.16;
      const age = t - born;
      if (age < 0) { mats[i].opacity = 0; continue; }
      const tt = Math.max(0, born - 3);
      const y = 0.35 * tt * tt * 1.6;
      const x = Math.min(30, tt * tt * 0.08);
      const spread = (i % 2 ? 1 : -1) * age * 1.2;
      m.position.set(x + spread, Math.max(0.6, y + 0.4 - age * 0.3), (i % 3 - 1) * age);
      const r = 0.8 + age * 1.6;
      m.scale.setScalar(r);
      mats[i].opacity = Math.max(0, 0.55 - age * 0.12);
    }
  });
  return (
    <group>
      {mats.map((mat, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} material={mat}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Journey to the Moon — the view from the crew cabin window            */
/* ------------------------------------------------------------------ */

function ProceduralMoon({ radius = 1 }: { radius?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 96, 96);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = Math.sin(x * 7.1 + y * 3.3) * Math.cos(z * 5.7 - x * 2.1) + Math.sin(y * 11 + z * 9) * 0.4;
      const mare = Math.sin(x * 2.2 + 1) * Math.cos(y * 1.7 - z) > 0.35 ? 0.55 : 0.8;
      c.setScalar(mare + n * 0.06);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [radius]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

export function CruiseScene() {
  const step = useGame((s) => s.state?.crew?.step ?? 0);
  const total = useGame((s) => (s.missionId ? getMission(s.missionId).cruise?.length ?? 5 : 5));
  const moon = useRef<THREE.Group>(null);
  const drift = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const k = Math.min(1, step / total);
    if (moon.current) {
      const target = 0.6 + k * 1.6;
      const sc = THREE.MathUtils.lerp(moon.current.scale.x, target, Math.min(1, dt * 1.5));
      moon.current.scale.setScalar(sc);
      moon.current.rotation.y += dt * 0.02;
    }
    if (drift.current) {
      drift.current.position.set(Math.sin(clock.elapsedTime * 0.4) * 0.6, 0.4 + Math.sin(clock.elapsedTime * 0.7) * 0.25, 4.2);
      drift.current.rotation.x += dt * 0.6;
    }
  });
  return (
    <>
      <SpaceBackdrop count={5000} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[6, 2, 6]} intensity={2.6} color="#fff6e8" />
      <group ref={moon} position={[0.8, 0.2, -6]}>
        <ProceduralMoon radius={1.4} />
      </group>
      <group position={[-7, -2.5, -14]} scale={0.7}>
        <Earth radius={1.2} spin={0.03} />
      </group>
      {/* Cabin window frame */}
      <mesh position={[0, 0, 3]}>
        <ringGeometry args={[2.3, 6, 64]} />
        <meshStandardMaterial color="#1a2030" roughness={0.8} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 3.02]}>
        <torusGeometry args={[2.3, 0.12, 12, 64]} />
        <meshStandardMaterial color="#8a93a3" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* A floating water drop: microgravity */}
      <mesh ref={drift}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color="#9fd8ff" transparent opacity={0.8} roughness={0.05} metalness={0.1} />
      </mesh>
      <CameraRig position={[0, 0, 6]} target={[0, 0, 0]} lerp={1} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Observatory in orbit (Mission 04)                                    */
/* ------------------------------------------------------------------ */

export function ObserveScene() {
  const state = useGame((s) => s.state);
  const missionId = useGame((s) => s.missionId);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.3;
      g.current.position.y = 0.6 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
  });
  if (!state || !missionId) return null;
  return (
    <>
      <SpaceBackdrop />
      <ambientLight intensity={0.15} />
      <directionalLight position={[-6, 4, 8]} intensity={3} color="#fff6e8" />
      <group position={[2.5, -5.5, -6]}>
        <Earth radius={4.5} spin={0.01} />
      </group>
      <group ref={g} position={[0, 0.6, 0]} rotation={[0.35, 0, 0]}>
        <TelescopeModel mission={getMission(missionId)} design={state.design} />
      </group>
      <CameraRig position={[0, 1.6, 6.5]} target={[0, 1, 0]} lerp={1} />
    </>
  );
}
