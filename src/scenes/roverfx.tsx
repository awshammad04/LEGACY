import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { heightAt } from '../core/terrain';
import { smoothSteering, steeringAngle, wheelTravel } from '../legacy-visuals/portable/wheel-motion.js';
import { kitVisualsEnabled } from '../legacy-visuals/flag';
import { isTestMode } from '../game/store';

/** Live vehicle motion shared with models (signed speed in world units/s). */
export interface VehicleMotion {
  v: number;
  /** Read-only pose snapshot from the game's controller (world units; forward = (cos h, 0, -sin h)). */
  x?: number;
  z?: number;
  h?: number;
  /** Steering input, +1 = left (game convention). */
  steer?: number;
  paused?: boolean;
  /** Incremented by the controller after any discontinuity (load, rewind, teleport). */
  reset?: number;
}

/** Curvature limits in world units (this rover is larger than the reference one). */
const MAX_CURVATURE = 0.5;
const PARKED_CURVATURE = 0.3;

const WHEEL = '#b9bec6';
const HUB = '#3b3f46';
const ARM = '#c4c9d1';

/**
 * Six-wheel rocker-bogie running gear. When `motion` is given, wheels roll with the
 * vehicle's speed and each wheel follows the terrain under it (rocker and bogie pivot).
 */
export function RockerBogie({ bodyL, bodyW, wheelR, size, motion }: { bodyL: number; bodyW: number; wheelR: number; size: number; motion?: MutableRefObject<VehicleMotion> }) {
  const root = useRef<THREE.Group>(null);
  const wheelX = useMemo(() => [bodyL * 0.42, 0, -bodyL * 0.42], [bodyL]);
  const sides = [-1, 1];
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const spinners = useRef<(THREE.Group | null)[]>([]);
  const steerers = useRef<(THREE.Group | null)[]>([]);
  const kin = useRef({ init: false, x: 0, z: 0, h: 0, reset: -1, steer: new Float32Array(6), rollAcc: new Float32Array(6) });
  const kitMotion = useMemo(() => kitVisualsEnabled(), []);
  const rockers = useRef<(THREE.Group | null)[]>([]);
  const st = useRef({ spin: 0, off: new Float32Array(6) });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    if (!motion || !root.current) return;
    const dt = Math.min(dtRaw, 0.1);
    const s = st.current;
    const worldScale = root.current.getWorldScale(tmp).x || 1;
    const mv = motion.current;
    if (kitMotion && mv.x !== undefined && mv.z !== undefined && mv.h !== undefined) {
      // Kit kinematics: four corner wheels steer (rear counter-steers), middle axle straight,
      // each wheel rolls by its own travel from the actual displacement and turning radius.
      const k = kin.current;
      const jump = Math.hypot(mv.x - k.x, mv.z - k.z) > 8;
      if (!k.init || mv.reset !== k.reset || jump) {
        k.init = true;
        k.reset = mv.reset ?? 0;
        k.x = mv.x;
        k.z = mv.z;
        k.h = mv.h;
      } else if (!mv.paused) {
        const dhGame = Math.atan2(Math.sin(mv.h - k.h), Math.cos(mv.h - k.h));
        const mid = k.h + dhGame * 0.5;
        const dist = Math.hypot(mv.x - k.x, mv.z - k.z);
        // Signed travel along the body's forward axis (reverse is negative)
        const ds = dist * Math.sign((mv.x - k.x) * Math.cos(mid) - (mv.z - k.z) * Math.sin(mid));
        // Kit frame: x right, -z forward, heading positive to the right → negate the game's heading delta
        const dh = -dhGame;
        const raw = Math.abs(ds) > 1e-6 ? dh / ds : -(mv.steer ?? 0) * PARKED_CURVATURE;
        const curvature = THREE.MathUtils.clamp(raw, -MAX_CURVATURE, MAX_CURVATURE);
        sides.forEach((side, si) => {
          const zLocal = side * (bodyW / 2 + 0.22);
          wheelX.forEach((xLocal, wi) => {
            const i = si * 3 + wi;
            const kx = zLocal * worldScale; // right
            const kz = -xLocal * worldScale; // forward is -z
            k.steer[i] = smoothSteering(k.steer[i], steeringAngle(curvature, kx, kz), dt);
            const st = steerers.current[i];
            if (st) st.rotation.y = -k.steer[i];
            const rolled = wheelTravel(ds, dh, kx, kz, k.steer[i]);
            k.rollAcc[i] -= rolled / (wheelR * worldScale);
            const sp = spinners.current[i];
            if (sp) sp.rotation.z = THREE.MathUtils.euclideanModulo(sp.rotation.z - rolled / (wheelR * worldScale), Math.PI * 2);
          });
        });
        k.x = mv.x;
        k.z = mv.z;
        k.h = mv.h;
      }
      if (isTestMode()) (window as unknown as Record<string, unknown>).__legacyWheels = { steer: Array.from(k.steer), roll: Array.from(k.rollAcc), resets: k.reset };
    } else {
      // Classic: roll every wheel by the vehicle speed
      s.spin += ((mv.v * dt) / worldScale) / wheelR;
      spinners.current.forEach((w) => w && (w.rotation.z = -s.spin));
    }
    // Suspension: sample the terrain under each wheel in the rover's local frame
    root.current.updateWorldMatrix(true, false);
    const k = 1 - Math.exp(-dt * 12);
    sides.forEach((side, si) => {
      const z = side * (bodyW / 2 + 0.22);
      const local: number[] = [];
      wheelX.forEach((x, wi) => {
        tmp.set(x, 0, z);
        root.current!.localToWorld(tmp);
        const gy = heightAt(tmp.x, tmp.z);
        tmp.y = gy;
        root.current!.worldToLocal(tmp);
        local[wi] = THREE.MathUtils.clamp(tmp.y, -0.28 * size, 0.28 * size);
      });
      // Bogie carries middle + rear wheels; rocker joins front wheel and bogie pivot
      const bogie = (local[1] + local[2]) / 2;
      const front = local[0];
      local.forEach((y, wi) => {
        const i = si * 3 + wi;
        s.off[i] += (y - s.off[i]) * k;
        const w = wheels.current[i];
        if (w) w.position.y = s.off[i];
      });
      const rk = rockers.current[si];
      if (rk) rk.rotation.z = THREE.MathUtils.lerp(rk.rotation.z, Math.atan2(front - bogie, bodyL * 0.63), k);
    });
  });

  return (
    <group ref={root}>
      {sides.map((side, si) => (
        <group key={side} position={[0, wheelR, side * (bodyW / 2 + 0.22)]}>
          {wheelX.map((x, wi) => (
            <group key={wi} position={[x, 0, 0]} ref={(el) => (wheels.current[si * 3 + wi] = el)}>
              <group ref={(el) => (steerers.current[si * 3 + wi] = el)}>
              <group ref={(el) => (spinners.current[si * 3 + wi] = el)}>
                {/* Machined aluminium wheel with cleats (grousers) */}
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[wheelR, wheelR, 0.26 * size, 24]} />
                  <meshStandardMaterial color={WHEEL} roughness={0.42} metalness={0.55} />
                </mesh>
                <mesh position={[0, 0, side * 0.135 * size]}>
                  <cylinderGeometry args={[wheelR * 0.42, wheelR * 0.42, 0.02, 16]} />
                  <meshStandardMaterial color={HUB} roughness={0.5} metalness={0.6} />
                </mesh>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((g) => (
                  <mesh key={g} rotation={[0, 0, (g / 8) * Math.PI * 2]} position={[Math.cos((g / 8) * Math.PI * 2) * wheelR, Math.sin((g / 8) * Math.PI * 2) * wheelR, 0]}>
                    <boxGeometry args={[0.035 * size, 0.04 * size, 0.27 * size]} />
                    <meshStandardMaterial color="#6d737c" roughness={0.6} metalness={0.5} />
                  </mesh>
                ))}
                {/* Spoke flexures */}
                {[0, 1, 2].map((g) => (
                  <mesh key={`s${g}`} position={[0, 0, side * 0.11 * size]} rotation={[0, 0, (g / 3) * Math.PI]}>
                    <boxGeometry args={[wheelR * 1.7, 0.02, 0.015]} />
                    <meshStandardMaterial color={HUB} metalness={0.6} roughness={0.4} />
                  </mesh>
                ))}
              </group>
              </group>
            </group>
          ))}
          {/* Rocker (front) and bogie (rear) arms */}
          <group ref={(el) => (rockers.current[si] = el)} position={[bodyL * 0.1, 0.34 * size, 0]}>
            <mesh rotation={[0, 0, 0.32]} position={[bodyL * 0.16, -0.08 * size, 0]}>
              <boxGeometry args={[bodyL * 0.42, 0.07, 0.07]} />
              <meshStandardMaterial color={ARM} metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh rotation={[0, 0, -0.18]} position={[-bodyL * 0.2, -0.04 * size, 0]}>
              <boxGeometry args={[bodyL * 0.36, 0.07, 0.07]} />
              <meshStandardMaterial color={ARM} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
          <mesh position={[-bodyL * 0.21, 0.16 * size, 0]}>
            <boxGeometry args={[bodyL * 0.46, 0.06, 0.06]} />
            <meshStandardMaterial color={ARM} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
