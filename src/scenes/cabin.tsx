import { Suspense, useEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { getMission } from '../content/missions';
import { useGame } from '../game/store';
import { Earth } from './models';
import { ProceduralMoon } from './scenes';
import { Astronaut, type AstroPose } from './astronaut';

/* ------------------------------------------------------------------ */
/* Inside the crew capsule on the way to the Moon (Mission 01 cruise).  */
/* An original, Orion-inspired cabin: stowage lockers, handrails, glass */
/* cockpit, galley, exercise flywheel, sleep bags and two windows.      */
/* The crew floats in microgravity and moves to each activity.          */
/* ------------------------------------------------------------------ */

const R = 2.55; // cabin radius (m)
const H = 3.0; // cabin height (m)
const COLS = 18;
const ROWS = 4;
const WINDOWS = new Set(['1:2', '1:3', '2:2']); // row:col openings, to the right of the console
const CONSOLE_COL = 0; // the forward wall
const angleOf = (col: number) => (col / COLS) * Math.PI * 2;

/** Panel-line texture for stowage lockers (canvas, no download). */
function lockerTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#d9dbd6';
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(60,64,70,0.55)';
  x.lineWidth = 2;
  x.strokeRect(4, 4, 120, 120);
  // velcro patches and a latch
  x.fillStyle = 'rgba(70,74,80,0.35)';
  if (seed % 3 === 0) x.fillRect(16, 18, 34, 14);
  if (seed % 4 === 1) x.fillRect(74, 92, 36, 12);
  x.fillStyle = '#5c6066';
  x.fillRect(56, 56, 16, 6);
  x.fillStyle = '#2b2f35';
  x.font = 'bold 13px monospace';
  x.fillText(`${String.fromCharCode(65 + (seed % 6))}${(seed % 9) + 1}`, 12, 112);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Glass-cockpit screen: trajectory to the Moon, crew vitals and spacecraft systems. */
function drawConsole(ctx: CanvasRenderingContext2D, k: number, alert: boolean) {
  const W = ctx.canvas.width;
  const Hh = ctx.canvas.height;
  ctx.fillStyle = '#05090f';
  ctx.fillRect(0, 0, W, Hh);
  const pane = (x0: number, title: string) => {
    ctx.strokeStyle = alert ? '#ff5a4a' : '#2f7fb8';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 + 8, 8, W / 3 - 16, Hh - 16);
    ctx.fillStyle = alert ? '#ffb3a8' : '#8fd3ff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(title, x0 + 22, 40);
  };
  const third = W / 3;
  // 1) Trajectory
  pane(0, 'TRAJECTORY');
  ctx.fillStyle = '#3d7bd9';
  ctx.beginPath();
  ctx.arc(60, Hh - 70, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9c9c9';
  ctx.beginPath();
  ctx.arc(third - 50, 90, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6fd0ff';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, Hh - 85);
  ctx.quadraticCurveTo(third * 0.25, 70, third - 64, 92);
  ctx.stroke();
  ctx.setLineDash([]);
  const px = (1 - k) * (1 - k) * 80 + 2 * (1 - k) * k * third * 0.25 + k * k * (third - 64);
  const py = (1 - k) * (1 - k) * (Hh - 85) + 2 * (1 - k) * k * 70 + k * k * 92;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fb3c8';
  ctx.font = '18px monospace';
  ctx.fillText(`${Math.round(k * 100)}% TO MOON`, 22, Hh - 22);
  // 2) Vitals
  pane(third, 'CREW VITALS');
  ['RANA', 'LEO', 'SAM'].forEach((n, i) => {
    const y = 80 + i * 60;
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '18px monospace';
    ctx.fillText(n, third + 22, y);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < third - 130; x += 4) {
      const beat = (x + i * 30) % 60;
      const yy = y - 6 - (beat > 20 && beat < 26 ? 22 : beat > 26 && beat < 30 ? -10 : 0);
      if (x === 0) ctx.moveTo(third + 90 + x, yy);
      else ctx.lineTo(third + 90 + x, yy);
    }
    ctx.stroke();
  });
  // 3) Systems
  pane(third * 2, alert ? 'RADIATION ALERT' : 'SYSTEMS');
  const rows = alert
    ? [['SOLAR PARTICLES', 'HIGH'], ['CREW', 'SHELTER'], ['DOSE RATE', 'RISING']]
    : [['CABIN O2', '21.0%'], ['PRESSURE', '101 kPa'], ['POWER', 'NOMINAL'], ['COMMS', 'LOCK']];
  rows.forEach(([a, b], i) => {
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '18px monospace';
    ctx.fillText(a, third * 2 + 22, 80 + i * 40);
    ctx.fillStyle = alert ? '#ff7a6a' : '#4ade80';
    ctx.fillText(b, third * 2 + third - 140, 80 + i * 40);
  });
}

type Spot = { pos: [number, number, number]; rot: [number, number, number]; pose: AstroPose };

/** Where each crew member floats for each activity (step ids from the mission's cruise schedule). */
const FACE_FWD = Math.PI; // model +Z turned toward the console (−Z)
const BLOCKING: Record<string, Spot[]> = {
  checkin: [
    { pos: [-0.8, -0.05, -1.65], rot: [0.05, FACE_FWD, 0.04], pose: 'interact' },
    { pos: [-1.55, 0.7, -0.55], rot: [0.2, 2.1, 0.15], pose: 'float' },
    { pos: [1.25, 0.15, -1.15], rot: [-0.05, 2.45, -0.08], pose: 'idle' },
  ],
  meals: [
    { pos: [-1.55, 0.05, -0.45], rot: [0.05, -Math.PI / 2, 0.08], pose: 'interact' },
    { pos: [-1.0, 0.75, -1.25], rot: [0.3, -2.4, -0.2], pose: 'float' },
    { pos: [1.2, 0.3, -1.25], rot: [0.0, -2.6, 0.1], pose: 'idle' },
  ],
  exercise: [
    { pos: [1.25, -0.6, -1.25], rot: [0, -Math.PI / 2 - 0.3, 0], pose: 'cycle' },
    { pos: [-0.9, 0.65, -1.5], rot: [0.2, 2.9, 0.1], pose: 'float' },
    { pos: [-1.5, 0.1, -0.3], rot: [0, 2.0, 0], pose: 'idle' },
  ],
  flare: [
    { pos: [-0.6, -1.05, -1.0], rot: [0, 2.7, 0], pose: 'huddle' },
    { pos: [0.55, -1.05, -1.1], rot: [0, -2.7, 0], pose: 'huddle' },
    { pos: [0.0, -1.0, -0.4], rot: [0, 3.1, 0], pose: 'huddle' },
  ],
  sleep: [
    { pos: [-1.95, 0.25, -0.9], rot: [0, 2.2, 0], pose: 'sleep' },
    { pos: [1.7, 0.3, -0.35], rot: [0, -2.0, 0], pose: 'sleep' },
    { pos: [-1.7, 0.35, 0.6], rot: [0, 1.6, 0], pose: 'sleep' },
  ],
  done: [
    { pos: [1.15, 0.05, -1.25], rot: [0, 2.35, 0], pose: 'float' },
    { pos: [0.6, 0.45, -1.65], rot: [0, 2.6, 0], pose: 'float' },
    { pos: [-0.7, 0.2, -1.5], rot: [0.1, FACE_FWD, 0], pose: 'idle' },
  ],
};

function CrewMember({ spot, idx }: { spot: Spot; idx: number }) {
  const g = useRef<THREE.Group>(null);
  const cur = useRef({ p: new THREE.Vector3(...spot.pos), r: new THREE.Euler(...spot.rot) });
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const t = clock.elapsedTime + idx * 1.7;
    const c = cur.current;
    const k = 1 - Math.exp(-dt * 0.9); // slow, weightless glide between activities
    c.p.lerp(new THREE.Vector3(...spot.pos), k);
    c.r.set(c.r.x + (spot.rot[0] - c.r.x) * k, c.r.y + (spot.rot[1] - c.r.y) * k, c.r.z + (spot.rot[2] - c.r.z) * k);
    if (!g.current) return;
    const bob = spot.pose === 'cycle' || spot.pose === 'huddle' ? 0.01 : 0.04;
    g.current.position.set(c.p.x + Math.sin(t * 0.35) * bob, c.p.y + Math.sin(t * 0.5) * bob, c.p.z + Math.cos(t * 0.3) * bob);
    g.current.rotation.set(c.r.x + Math.sin(t * 0.27) * 0.04, c.r.y, c.r.z + Math.sin(t * 0.31) * 0.04);
  });
  // Hips are ~1.24 m above the model origin; centre the floating body on the spot.
  return (
    <group ref={g}>
      <group position={[0, -1.0 * 0.85, 0]} scale={0.85}>
        <Astronaut pose={spot.pose} suit="flight" />
      </group>
    </group>
  );
}

function FloatingItems({ step }: { step: string }) {
  const items = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = items.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const t = clock.elapsedTime * (0.3 + i * 0.07) + i;
      c.position.y = (c.userData.y as number) + Math.sin(t) * 0.08;
      c.rotation.set(t * 0.4, t * 0.6, t * 0.2);
    });
  });
  const list = useMemo(() => {
    const base: { p: [number, number, number]; kind: 'drop' | 'pack' | 'pen' }[] = [
      { p: [0.6, 0.9, 0.3], kind: 'drop' },
      { p: [-0.3, 1.1, -0.2], kind: 'pen' },
    ];
    if (step === 'meals') base.push({ p: [-0.95, 0.55, 0.6], kind: 'pack' }, { p: [-1.1, 0.8, 0.35], kind: 'drop' }, { p: [-0.6, 0.45, 0.9], kind: 'pack' });
    return base;
  }, [step]);
  return (
    <group ref={items}>
      {list.map((it, i) => (
        <mesh key={`${step}-${i}`} position={it.p} userData={{ y: it.p[1] }} castShadow>
          {it.kind === 'drop' ? <sphereGeometry args={[0.045, 20, 20]} /> : it.kind === 'pack' ? <boxGeometry args={[0.16, 0.11, 0.04]} /> : <cylinderGeometry args={[0.008, 0.008, 0.15, 8]} />}
          {it.kind === 'drop' ? (
            <meshPhysicalMaterial color="#bfe6ff" transmission={0.6} roughness={0.05} thickness={0.1} transparent opacity={0.85} />
          ) : (
            <meshStandardMaterial color={it.kind === 'pack' ? '#d8c9a3' : '#2b3a8f'} roughness={0.5} metalness={it.kind === 'pack' ? 0.3 : 0.1} />
          )}
        </mesh>
      ))}
    </group>
  );
}

function CabinShell({ k, alert, night }: { k: number; alert: boolean; night: boolean }) {
  const textures = useMemo(() => Array.from({ length: 6 }, (_, i) => lockerTexture(i * 7 + 3)), []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const panelGeo = useMemo(() => {
    const w = 2 * R * Math.sin(Math.PI / COLS) * 0.98;
    return new THREE.BoxGeometry(w, (H / ROWS) * 0.96, 0.08);
  }, []);
  const consoleCanvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 300;
    return c;
  }, []);
  const consoleTex = useMemo(() => {
    const t = new THREE.CanvasTexture(consoleCanvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [consoleCanvas]);
  useEffect(() => {
    drawConsole(consoleCanvas.getContext('2d')!, k, alert);
    consoleTex.needsUpdate = true;
  }, [k, alert, consoleCanvas, consoleTex]);
  useEffect(() => () => consoleTex.dispose(), [consoleTex]);

  const panels: ReactElement[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = `${row}:${col}`;
      const a = angleOf(col);
      const y = -H / 2 + (row + 0.5) * (H / ROWS);
      const x = Math.sin(a) * R;
      const z = -Math.cos(a) * R;
      if (WINDOWS.has(key)) {
        panels.push(
          <group key={key} position={[x, y, z]} rotation={[0, -a, 0]}>
            {/* Window frame (opening to space) */}
            {[-1, 1].map((s) => (
              <mesh key={`v${s}`} position={[s * 0.4, 0, 0]}>
                <boxGeometry args={[0.08, H / ROWS, 0.16]} />
                <meshStandardMaterial color="#5f646c" metalness={0.6} roughness={0.35} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={`h${s}`} position={[0, s * (H / ROWS / 2 - 0.04), 0]}>
                <boxGeometry args={[0.88, 0.08, 0.16]} />
                <meshStandardMaterial color="#5f646c" metalness={0.6} roughness={0.35} />
              </mesh>
            ))}
            <mesh>
              <planeGeometry args={[0.8, H / ROWS - 0.08]} />
              <meshPhysicalMaterial color="#9fb6c9" transparent opacity={0.08} roughness={0.02} metalness={0} transmission={0.9} />
            </mesh>
          </group>,
        );
        continue;
      }
      const isConsole = row === 1 && (col === CONSOLE_COL || col === COLS - 1 || col === 1);
      if (isConsole) continue; // the console spans these three panels
      const bag = (row === 2 && col % 4 === 2) || (row === 0 && col % 5 === 1);
      panels.push(
        <mesh key={key} position={[x, y, z]} rotation={[0, -a, 0]} geometry={panelGeo} receiveShadow>
          <meshStandardMaterial map={textures[(row * 5 + col) % textures.length]} color={bag ? '#f2f0ea' : '#ffffff'} roughness={bag ? 0.95 : 0.6} metalness={bag ? 0 : 0.1} />
        </mesh>,
      );
      // Cargo transfer bags bulge out of some lockers
      if (bag)
        panels.push(
          <mesh key={`${key}b`} position={[x * 0.94, y, z * 0.94]} rotation={[0, -a, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.55, 0.28]} />
            <meshStandardMaterial color="#efece4" roughness={0.95} />
          </mesh>,
        );
    }
  }
  // Handrails between rows
  const rails: ReactElement[] = [];
  for (let col = 0; col < COLS; col += 3) {
    const a = angleOf(col) + Math.PI / COLS;
    rails.push(
      <mesh key={`r${col}`} position={[Math.sin(a) * (R - 0.14), 0.05, -Math.cos(a) * (R - 0.14)]}>
        <cylinderGeometry args={[0.018, 0.018, 0.9, 8]} />
        <meshStandardMaterial color="#d4b23c" metalness={0.5} roughness={0.4} />
      </mesh>,
    );
  }
  const lightColor = alert ? '#ff4a3a' : night ? '#4a6cff' : '#fff4e6';
  return (
    <group>
      {panels}
      {rails}
      {/* Glass cockpit console on the forward wall */}
      <group position={[0, -H / 2 + 1.5 * (H / ROWS), -R + 0.08]}>
        <mesh>
          <boxGeometry args={[2.6, 0.95, 0.12]} />
          <meshStandardMaterial color="#2a2f36" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0.07]}>
          <planeGeometry args={[2.4, 0.6]} />
          <meshBasicMaterial map={consoleTex} toneMapped={false} />
        </mesh>
        {/* Switch panel */}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-1.1 + i * 0.17, -0.38, 0.08]}>
            <boxGeometry args={[0.07, 0.05, 0.03]} />
            <meshStandardMaterial color={i % 5 === 0 ? '#ffd166' : '#9aa0a8'} emissive={i % 5 === 0 ? '#ffb000' : '#000000'} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
      {/* Floor (aft bulkhead) with storage hatches, and the forward cone ceiling with hatch */}
      <mesh position={[0, -H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[R, 48]} />
        <meshStandardMaterial color="#b9bcb8" roughness={0.75} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, -H / 2 + 0.01, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1, 0.9]} />
          <meshStandardMaterial color="#9da19d" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, H / 2 + 0.55, 0]}>
        <cylinderGeometry args={[0.7, R, 1.1, 48, 1, true]} />
        <meshStandardMaterial color="#cfd1cc" roughness={0.7} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, H / 2 + 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 32]} />
        <meshStandardMaterial color="#8d9196" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Exercise flywheel device and crew seats near the floor */}
      <mesh position={[1.25, -H / 2 + 0.2, -1.25]} castShadow>
        <boxGeometry args={[0.55, 0.4, 0.45]} />
        <meshStandardMaterial color="#3b4048" metalness={0.5} roughness={0.45} />
      </mesh>
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={i} position={[x * 0.8, -H / 2 + 0.12, -0.9]} rotation={[-0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.55, 0.12, 0.9]} />
          <meshStandardMaterial color="#4b5560" roughness={0.7} />
        </mesh>
      ))}
      {/* Sleep stations: bags tethered to the wall */}
      {[-0.85, 2.15, -1.85].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * (R - 0.25), 0.2, -Math.cos(a) * (R - 0.25)]} rotation={[0, -a, 0]} castShadow>
          <capsuleGeometry args={[0.24, 1.1, 6, 12]} />
          <meshStandardMaterial color="#304a7a" roughness={0.9} />
        </mesh>
      ))}
      {/* Galley: water dispenser */}
      <mesh position={[Math.sin(4.5) * (R - 0.12), 0.1, -Math.cos(4.5) * (R - 0.12)]} rotation={[0, -4.5, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.2]} />
        <meshStandardMaterial color="#c5c8cc" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Ceiling LED strips (emissive) + matching lights */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i}>
            <mesh position={[Math.sin(a) * (R - 0.3), H / 2 - 0.04, -Math.cos(a) * (R - 0.3)]} rotation={[Math.PI / 2, 0, -a]}>
              <planeGeometry args={[1.0, 0.08]} />
              <meshBasicMaterial color={lightColor} toneMapped={false} />
            </mesh>
            <pointLight position={[Math.sin(a) * 1.4, H / 2 - 0.3, -Math.cos(a) * 1.4]} intensity={alert ? 3.5 : night ? 0.9 : 3.2} distance={6} decay={1.6} color={lightColor} />
          </group>
        );
      })}
    </group>
  );
}

/** Earth and Moon seen through the windows; the Moon grows as the day goes on. */
function OutsideView({ k }: { k: number }) {
  const moon = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (moon.current) moon.current.scale.setScalar(THREE.MathUtils.lerp(moon.current.scale.x, 0.7 + k * 2.4, Math.min(1, dt * 1.2)));
    if (earth.current) earth.current.scale.setScalar(THREE.MathUtils.lerp(earth.current.scale.x, 2.2 - k * 1.3, Math.min(1, dt * 1.2)));
  });
  // Place Moon and Earth on the line from the default viewpoint through a window, so they are framed by it.
  const cam = new THREE.Vector3(0.15, 0.25, 2.1);
  const windowCenter = (col: number, row: number) => {
    const a = angleOf(col);
    return new THREE.Vector3(Math.sin(a) * R, -H / 2 + (row + 0.5) * (H / ROWS), -Math.cos(a) * R);
  };
  const along = (p: THREE.Vector3, d: number) => cam.clone().add(p.clone().sub(cam).normalize().multiplyScalar(d));
  const moonPos = along(windowCenter(2.6, 1), 45);
  const earthPos = along(windowCenter(2.1, 2), 70);
  const dir = windowCenter(2.5, 1.5).normalize();
  return (
    <>
      <group ref={moon} position={moonPos}>
        <ProceduralMoon radius={2} />
      </group>
      <group ref={earth} position={earthPos}>
        <Earth radius={2.4} spin={0.02} />
      </group>
      {/* Sunlight streaming in through the windows */}
      <directionalLight position={dir.clone().multiplyScalar(10).add(new THREE.Vector3(0, 3, 0))} intensity={2.2} color="#fff1dc" />
    </>
  );
}

export function CabinScene() {
  const stepIdx = useGame((s) => s.state?.crew?.step ?? 0);
  const missionId = useGame((s) => s.missionId);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const steps = missionId ? getMission(missionId).cruise ?? [] : [];
  const stepId = steps[stepIdx]?.id ?? 'done';
  const k = Math.min(1, stepIdx / Math.max(1, steps.length));
  const alert = stepId === 'flare';
  const night = stepId === 'sleep';
  const blocking = BLOCKING[stepId] ?? BLOCKING.done;
  return (
    <>
      <color attach="background" args={['#000000']} />
      <Stars radius={140} depth={60} count={4000} factor={4} saturation={0} fade speed={0.2} />
      <hemisphereLight args={[alert ? '#ff9a8a' : night ? '#6f86ff' : '#e9eef5', '#3a3f46', alert ? 0.35 : night ? 0.18 : 0.55]} />
      <CabinShell k={k} alert={alert} night={night} />
      <Suspense fallback={null}>
        <OutsideView k={k} />
      </Suspense>
      <Suspense fallback={null}>
        {blocking.map((spot, i) => (
          <CrewMember key={i} idx={i} spot={spot} />
        ))}
      </Suspense>
      <FloatingItems step={stepId} />
      <CabinCamera reduced={reduced} />
    </>
  );
}

/** Look around inside the cabin (drag); the view gently floats like a camera held in microgravity. */
function CabinCamera({ reduced }: { reduced: boolean }) {
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const controls = useThree((st) => st.controls) as unknown as { target: THREE.Vector3 } | null;
  useEffect(() => {
    const prevFov = camera.fov;
    camera.fov = 68; // wider, more immersive view inside the cabin
    camera.position.set(0.15, 0.25, 2.1);
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = prevFov;
      camera.up.set(0, 1, 0);
      camera.updateProjectionMatrix();
    };
  }, [camera]);
  useFrame(({ clock }) => {
    if (reduced || !controls) return;
    const t = clock.elapsedTime;
    controls.target.set(Math.sin(t * 0.13) * 0.05, 0.05 + Math.sin(t * 0.17) * 0.04, -0.6);
    camera.up.set(Math.sin(t * 0.11) * 0.03, 1, 0).normalize();
  });
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableZoom={false}
      target={[0, 0.05, -0.6]}
      minPolarAngle={Math.PI * 0.32}
      maxPolarAngle={Math.PI * 0.62}
      minAzimuthAngle={-1.3}
      maxAzimuthAngle={1.3}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.5}
    />
  );
}
