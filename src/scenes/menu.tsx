import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import type { MissionId } from '../core/types';
import { MISSIONS } from '../content/missions';
import { useGame, useUi } from '../game/store';
import { Earth, JEZERO, MarsGlobe, latLonToVec3 } from './models';
import { ProceduralMoon } from './scenes';
import { Astronaut } from './astronaut';

/* ------------------------------------------------------------------ */
/* Cinematic main menu: Earth, a floating astronaut, a passing          */
/* spacecraft, and a holographic mission deck for mission selection.    */
/* ------------------------------------------------------------------ */

export const INTRO_SECONDS = 10;
const ASTRO = new THREE.Vector3(1.75, -0.95, 0);
const HOLO_CENTER_X = 18;

const ease = (u: number) => {
  const x = THREE.MathUtils.clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Orion-style crew capsule + service module + four solar wings (original procedural model). */
export function Spacecraft({ scale = 1 }: { scale?: number }) {
  const wings = [0, 1, 2, 3];
  return (
    <group scale={scale} rotation={[0, 0, -Math.PI / 2]}>
      {/* Crew module */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.5, 0.46, 40]} />
        <meshStandardMaterial color="#dfe3ea" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.12, 0.17, 0.08, 24]} />
        <meshStandardMaterial color="#8d939e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.385, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.03, 40]} />
        <meshStandardMaterial color="#4a3a2c" roughness={0.8} />
      </mesh>
      {/* Window */}
      <mesh position={[0, 0.66, 0.33]} rotation={[-0.62, 0, 0]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color="#0b1830" metalness={1} roughness={0.05} emissive="#203a66" emissiveIntensity={0.25} />
      </mesh>
      {/* Service module with foil wrap */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.48, 0.72, 40]} />
        <meshStandardMaterial color="#c9c4b6" metalness={0.75} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.485, 0.485, 0.06, 40]} />
        <meshStandardMaterial color="#8a6a2e" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* Main engine */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.24, 0.34, 28, 1, true]} />
        <meshStandardMaterial color="#5d626b" metalness={0.85} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Solar wings (X configuration) */}
      {wings.map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
          <mesh position={[1.3, -0.05, 0]}>
            <boxGeometry args={[1.65, 0.02, 0.42]} />
            <meshStandardMaterial color="#1b2c55" metalness={0.45} roughness={0.32} emissive="#0c1a3a" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.5, -0.05, 0]}>
            <boxGeometry args={[0.1, 0.03, 0.06]} />
            <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} />
          </mesh>
          {[0.75, 1.3, 1.85].map((x) => (
            <mesh key={x} position={[x, -0.035, 0]}>
              <boxGeometry args={[0.012, 0.012, 0.43]} />
              <meshStandardMaterial color="#8b93a3" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A small procedural spiral galaxy for the telescope mission hologram. */
function Galaxy({ color }: { color: string }) {
  const geo = useMemo(() => {
    const n = 2600;
    const pos = new Float32Array(n * 3);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const arm = i % 2;
      const r = Math.pow(rnd(), 0.7) * 1;
      const a = r * 5.2 + arm * Math.PI + (rnd() - 0.5) * 0.7;
      pos.set([Math.cos(a) * r, (rnd() - 0.5) * 0.06 * (1 - r), Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <group rotation={[0.5, 0, 0.2]}>
      <points geometry={geo}>
        <pointsMaterial color={color} size={0.025} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#fff3d6" />
      </mesh>
      {/* The supernova to catch */}
      <mesh position={[0.55, 0.02, 0.2]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function SiteMarker({ lat, lon, r, color }: { lat: number; lon: number; r: number; color: string }) {
  const p = useMemo(() => latLonToVec3(lat, lon, r), [lat, lon, r]);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize()), [p]);
  return (
    <group position={p} quaternion={q}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

const MERIDIANI = { lat: -2.2, lon: -5.4 };

function Destination({ id, color }: { id: MissionId; color: string }) {
  switch (id) {
    case 'm1-apollo':
      return (
        <group>
          <ProceduralMoon radius={0.8} />
          <SiteMarker lat={26.1} lon={3.6} r={0.8} color={color} />
        </group>
      );
    case 'm2-martian-mystery':
      return (
        <MarsGlobe radius={0.8} spin={0}>
          <SiteMarker lat={JEZERO.lat} lon={JEZERO.lon} r={0.8} color={color} />
        </MarsGlobe>
      );
    case 'm3-lost-rover':
      return (
        <MarsGlobe radius={0.8} spin={0}>
          <SiteMarker lat={MERIDIANI.lat} lon={MERIDIANI.lon} r={0.8} color={color} />
        </MarsGlobe>
      );
    default:
      return <Galaxy color={color} />;
  }
}

/** Rotation that brings a site marker toward the camera for each globe. */
const FACE: Partial<Record<MissionId, number>> = {
  'm1-apollo': -Math.PI / 2 - (3.6 * Math.PI) / 180,
  'm2-martian-mystery': -Math.PI / 2 - (JEZERO.lon * Math.PI) / 180,
  'm3-lost-rover': -Math.PI / 2 - (MERIDIANI.lon * Math.PI) / 180,
};

function Hologram({ id, index, accent }: { id: MissionId; index: number; accent: string }) {
  const g = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const anim = useRef({ angle: 0, scale: 0.6, glow: 0.2 });
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const { focusMission } = useUi.getState();
    const f = MISSIONS.findIndex((m) => m.id === focusMission);
    const s = rtl ? -1 : 1;
    const a = anim.current;
    const focused = f === index;
    a.angle = THREE.MathUtils.damp(a.angle, (index - f) * 0.62 * s, 4, dt);
    a.scale = THREE.MathUtils.damp(a.scale, focused ? 1 : 0.55, 5, dt);
    a.glow = THREE.MathUtils.damp(a.glow, focused ? 1 : 0.25, 5, dt);
    if (g.current) {
      const R = 4.2;
      g.current.position.set(HOLO_CENTER_X * s + Math.sin(a.angle) * R, 0, Math.cos(a.angle) * R - R - 3);
      g.current.scale.setScalar(a.scale);
    }
    if (spin.current) {
      const base = FACE[id] ?? 0;
      spin.current.rotation.y = focused ? base + Math.sin(clock.elapsedTime * 0.25) * 0.35 : spin.current.rotation.y + dt * 0.2;
      spin.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 0.8 + index) * 0.05;
    }
    if (ring.current) ring.current.rotation.z += dt * 0.6;
    if (beam.current) beam.current.opacity = 0.05 + a.glow * 0.1;
  });
  return (
    <group ref={g}>
      <group ref={spin}>
        <Destination id={id} color={accent} />
      </group>
      {/* Projector base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.75, 0.85, 0.12, 48]} />
        <meshStandardMaterial color="#172235" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh ref={ring} position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.68, 48, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.9, 0.6, 1.1, 40, 1, true]} />
        <meshBasicMaterial ref={beam} color={accent} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function HoloDeck() {
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const s = rtl ? -1 : 1;
  return (
    <group>
      {MISSIONS.map((m, i) => (
        <Hologram key={m.id} id={m.id} index={i} accent={m.accent} />
      ))}
      {/* Deck floor ring */}
      <mesh position={[HOLO_CENTER_X * s, -0.08, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 4.66, 96]} />
        <meshBasicMaterial color="#3fb6ff" transparent opacity={0.35} />
      </mesh>
      <pointLight position={[HOLO_CENTER_X * s, 3, -1]} intensity={8} distance={14} color="#9fd8ff" />
    </group>
  );
}

function MenuCamera() {
  const { camera } = useThree();
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const reduced = useGame((s) => s.settings.reducedMotion);
  const st = useRef({ pos: new THREE.Vector3(0, 0.2, 5.2), tgt: new THREE.Vector3(0.9, 0, 0), init: false });
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpT = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const s = rtl ? -1 : 1;
    const ui = useUi.getState();
    const t = clock.elapsedTime;
    const mainP = tmpP.set(0.05 * s + (reduced ? 0 : Math.sin(t * 0.07) * 0.25), 0.25 + (reduced ? 0 : Math.sin(t * 0.05) * 0.1), 5.4);
    const mainT = tmpT.set(ASTRO.x * s * 0.62, 0.05, 0);
    const c = st.current;
    if (ui.menu === 'intro' && !reduced) {
      const it = (performance.now() - ui.introT0) / 1000;
      const head = new THREE.Vector3(ASTRO.x * s, ASTRO.y + 1.62, 0.08);
      const closeP = head.clone().add(new THREE.Vector3(0.12 * s, 0.02, 0.85));
      const u = ease((it - 3.4) / (INTRO_SECONDS - 3.6));
      c.pos.copy(closeP).lerp(mainP, u);
      c.tgt.copy(head).lerp(mainT, u);
      c.init = true;
    } else if (ui.menu === 'select') {
      const hx = HOLO_CENTER_X * s;
      c.pos.x = THREE.MathUtils.damp(c.pos.x, hx, 1.8, dt);
      c.pos.y = THREE.MathUtils.damp(c.pos.y, 1.45, 1.8, dt);
      c.pos.z = THREE.MathUtils.damp(c.pos.z, 3.6, 1.8, dt);
      c.tgt.x = THREE.MathUtils.damp(c.tgt.x, hx, 2.2, dt);
      c.tgt.y = THREE.MathUtils.damp(c.tgt.y, 0.2, 2.2, dt);
      c.tgt.z = THREE.MathUtils.damp(c.tgt.z, -3.2, 2.2, dt);
    } else {
      if (!c.init) {
        c.pos.copy(mainP);
        c.tgt.copy(mainT);
        c.init = true;
      }
      c.pos.x = THREE.MathUtils.damp(c.pos.x, mainP.x, 1.6, dt);
      c.pos.y = THREE.MathUtils.damp(c.pos.y, mainP.y, 1.6, dt);
      c.pos.z = THREE.MathUtils.damp(c.pos.z, mainP.z, 1.6, dt);
      c.tgt.x = THREE.MathUtils.damp(c.tgt.x, mainT.x, 2, dt);
      c.tgt.y = THREE.MathUtils.damp(c.tgt.y, mainT.y, 2, dt);
      c.tgt.z = THREE.MathUtils.damp(c.tgt.z, mainT.z, 2, dt);
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.tgt);
  });
  return null;
}

function DriftingCraft() {
  const g = useRef<THREE.Group>(null);
  const rtl = useGame((s) => s.settings.lang === 'ar');
  useFrame(({ clock }) => {
    if (!g.current) return;
    const s = rtl ? -1 : 1;
    const t = clock.elapsedTime;
    g.current.position.set(s * (7.4 + Math.sin(t * 0.035) * 0.9), 3.1 + Math.sin(t * 0.2) * 0.1, -7.5);
    g.current.rotation.set(0.3, s * (0.5 + t * 0.01), Math.sin(t * 0.1) * 0.08);
  });
  return (
    <group ref={g}>
      <Spacecraft scale={0.6} />
    </group>
  );
}

function FloatingAstronaut() {
  const g = useRef<THREE.Group>(null);
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const reduced = useGame((s) => s.settings.reducedMotion);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const s = rtl ? -1 : 1;
    const t = reduced ? 0 : clock.elapsedTime;
    g.current.position.set(ASTRO.x * s, ASTRO.y + Math.sin(t * 0.6) * 0.06, ASTRO.z);
    g.current.rotation.set(Math.sin(t * 0.21) * 0.06 + 0.12, -0.6 * s + Math.sin(t * 0.13) * 0.12, Math.sin(t * 0.17) * 0.07 - 0.22 * s);
  });
  return (
    <group ref={g}>
      <Astronaut pose="float" />
    </group>
  );
}

export function MenuScene() {
  const rtl = useGame((s) => s.settings.lang === 'ar');
  const s = rtl ? -1 : 1;
  return (
    <>
      <color attach="background" args={['#010208']} />
      <Stars radius={160} depth={70} count={7000} factor={4} saturation={0.15} fade speed={0.25} />
      {/* Sunlight from behind-left gives the astronaut a crisp rim; soft fill from Earthshine */}
      <ambientLight intensity={0.06} />
      <directionalLight position={[-7 * s, 4, 3]} intensity={3.4} color="#fff4e2" />
      <directionalLight position={[4 * s, -5, 2]} intensity={0.55} color="#6fa8ff" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.5} color="#ffffff" position={[-4, 3, 3]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#3b7bff" position={[3, -4, 2]} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#ffd9a0" position={[0, 5, -5]} scale={3} />
      </Environment>
      {/* Separate boundaries: stars and the spacecraft show at once; heavier assets pop in as they arrive */}
      <Suspense fallback={null}>
        <group position={[5.2 * s, -8.6, -10]} rotation={[-0.75, rtl ? -1.92 : -2.62, 0]}>
          <Earth radius={8} spin={0.006} />
        </group>
      </Suspense>
      <Suspense fallback={null}>
        <FloatingAstronaut />
      </Suspense>
      <DriftingCraft />
      <Suspense fallback={null}>
        <HoloDeck />
      </Suspense>
      <MenuCamera />
    </>
  );
}
