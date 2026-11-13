import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import type { Design, MissionDefinition } from '../core/types';
import { tierOf } from '../core/evaluate';

export const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

const WHITE = '#e9edf3';
const GREY = '#8a93a3';
const DARK = '#2a2f38';
const GOLD = '#c99a3c';
const WHEEL = '#3b3f46';

/* ------------------------------------------------------------------ */
/* Rover — every visible part reflects a workshop choice               */
/* ------------------------------------------------------------------ */

export function RoverModel({ mission, design, scale = 1 }: { mission: MissionDefinition; design: Design; scale?: number }) {
  const chassis = tierOf(mission, design, 'chassis') ?? 'basic';
  const camera = tierOf(mission, design, 'camera') ?? 'basic';
  const comms = tierOf(mission, design, 'comms') ?? 'basic';
  const powerOpt = design.selections.power ?? '';
  const nav = tierOf(mission, design, 'nav') ?? 'basic';
  const has = (id: string) => design.addons.includes(id);

  const size = chassis === 'basic' ? 0.8 : chassis === 'balanced' ? 1 : 1.12;
  const bodyL = 2.2 * size;
  const bodyW = 1.5 * size;
  const wheelR = 0.32 * size;
  const mastH = camera === 'basic' ? 1.0 : camera === 'balanced' ? 1.35 : 1.55;
  const dishR = comms === 'basic' ? 0 : comms === 'balanced' ? 0.32 : 0.45;
  const solar = powerOpt.includes('basic') || powerOpt.includes('balanced');
  const panelScale = powerOpt.includes('balanced') ? 1.35 : 1;
  const rtg = powerOpt.includes('advanced');

  const wheelX = [-bodyL * 0.42, 0, bodyL * 0.42];
  return (
    <group scale={scale}>
      {/* Wheels + rocker-bogie */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, wheelR, side * (bodyW / 2 + 0.22)]}>
          {wheelX.map((x, i) => (
            <mesh key={i} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[wheelR, wheelR, 0.26 * size, 18]} />
              <meshStandardMaterial color={WHEEL} roughness={0.8} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.32 * size, 0]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[bodyL * 0.95, 0.07, 0.07]} />
            <meshStandardMaterial color={GREY} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Body */}
      <mesh position={[0, wheelR + 0.45 * size, 0]} castShadow>
        <boxGeometry args={[bodyL, 0.42 * size, bodyW]} />
        <meshStandardMaterial color={WHITE} roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh position={[0, wheelR + 0.24 * size, 0]}>
        <boxGeometry args={[bodyL * 0.92, 0.06, bodyW * 0.92]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.35} />
      </mesh>
      {/* Mast + camera head */}
      <group position={[bodyL * 0.36, wheelR + 0.66 * size, bodyW * 0.28]}>
        <mesh position={[0, mastH / 2, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, mastH, 10]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
        <mesh position={[0.05, mastH + 0.06, 0]} castShadow>
          <boxGeometry args={[0.24, camera === 'basic' ? 0.14 : 0.2, camera === 'advanced' ? 0.62 : 0.46]} />
          <meshStandardMaterial color={WHITE} roughness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.18, mastH + 0.06, s * (camera === 'advanced' ? 0.18 : 0.12)]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[camera === 'basic' ? 0.04 : 0.06, camera === 'basic' ? 0.04 : 0.06, 0.08, 12]} />
            <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.2} />
          </mesh>
        ))}
        {nav !== 'basic' && (
          <mesh position={[0.16, mastH - 0.12, 0]}>
            <boxGeometry args={[0.1, 0.08, 0.3]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        )}
        {has('inst-weather') && (
          <mesh position={[0, mastH * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
            <meshStandardMaterial color={GREY} />
          </mesh>
        )}
      </group>
      {/* Communications */}
      {dishR > 0 ? (
        <group position={[-bodyL * 0.05, wheelR + 0.85 * size, -bodyW * 0.3]} rotation={[0.3, 0, -0.5]}>
          <mesh>
            <cylinderGeometry args={[dishR, dishR * 0.92, 0.05, 24]} />
            <meshStandardMaterial color={WHITE} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.32, 8]} />
            <meshStandardMaterial color={GREY} />
          </mesh>
        </group>
      ) : null}
      <mesh position={[-bodyL * 0.3, wheelR + 0.9 * size, bodyW * 0.3]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
        <meshStandardMaterial color={GREY} />
      </mesh>
      {/* Power */}
      {solar && (
        <group position={[0, wheelR + 0.69 * size, 0]}>
          <mesh>
            <boxGeometry args={[bodyL * 1.05 * panelScale, 0.04, bodyW * 1.45 * panelScale]} />
            <meshStandardMaterial color="#1b2a55" metalness={0.55} roughness={0.25} emissive="#0a1430" />
          </mesh>
          <mesh position={[0, 0.025, 0]}>
            <boxGeometry args={[bodyL * 1.05 * panelScale, 0.005, 0.02]} />
            <meshStandardMaterial color={GREY} />
          </mesh>
        </group>
      )}
      {rtg && (
        <group position={[-bodyL * 0.58, wheelR + 0.62 * size, 0]} rotation={[0, 0, 0.5]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.75, 16]} />
            <meshStandardMaterial color={DARK} metalness={0.5} roughness={0.5} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]} position={[0, 0, 0]}>
              <boxGeometry args={[0.62, 0.68, 0.02]} />
              <meshStandardMaterial color="#3a3f48" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
        </group>
      )}
      {/* Robotic arm + turret */}
      {has('inst-arm') && (
        <group position={[bodyL * 0.52, wheelR + 0.45 * size, 0]}>
          <mesh position={[0.25, 0.1, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.6, 0.07, 0.07]} />
            <meshStandardMaterial color={WHITE} />
          </mesh>
          <mesh position={[0.62, -0.05, 0]} rotation={[0, 0, 0.6]}>
            <boxGeometry args={[0.5, 0.06, 0.06]} />
            <meshStandardMaterial color={WHITE} />
          </mesh>
          <mesh position={[0.8, -0.22, 0]}>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshStandardMaterial color={has('inst-abrasion') ? GOLD : GREY} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      )}
      {has('inst-radar') && (
        <mesh position={[-bodyL * 0.4, wheelR + 0.15, 0]}>
          <boxGeometry args={[0.35, 0.12, 0.45]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Launcher — size depends on the chosen tier (fictional vehicles)     */
/* ------------------------------------------------------------------ */

export function Rocket({ tier, stage2Only = false, showFairing = true }: { tier: string; stage2Only?: boolean; showFairing?: boolean }) {
  const h = tier === 'basic' ? 7 : tier === 'balanced' ? 8.5 : 10;
  const r = tier === 'basic' ? 0.42 : tier === 'balanced' ? 0.52 : 0.62;
  const boosters = tier === 'advanced';
  const s1 = h * 0.6;
  const s2 = h * 0.25;
  return (
    <group>
      {!stage2Only && (
        <group>
          <mesh position={[0, s1 / 2, 0]} castShadow>
            <cylinderGeometry args={[r, r, s1, 28]} />
            <meshStandardMaterial color="#f2f4f7" roughness={0.45} metalness={0.1} />
          </mesh>
          <mesh position={[0, s1 * 0.75, 0]}>
            <cylinderGeometry args={[r * 1.005, r * 1.005, 0.25, 28]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[r * 0.8, r * 1.05, 0.5, 20]} />
            <meshStandardMaterial color="#3a3f48" metalness={0.7} roughness={0.35} />
          </mesh>
          {boosters &&
            [-1, 1].map((sd) => (
              <group key={sd} position={[sd * (r + 0.32), 0, 0]}>
                <mesh position={[0, s1 * 0.4, 0]} castShadow>
                  <cylinderGeometry args={[0.3, 0.3, s1 * 0.8, 20]} />
                  <meshStandardMaterial color="#e9ecef" roughness={0.5} />
                </mesh>
                <mesh position={[0, s1 * 0.8 + 0.3, 0]}>
                  <coneGeometry args={[0.3, 0.6, 20]} />
                  <meshStandardMaterial color="#e9ecef" />
                </mesh>
              </group>
            ))}
        </group>
      )}
      <group position={[0, stage2Only ? 0 : s1, 0]}>
        <mesh position={[0, s2 / 2, 0]} castShadow>
          <cylinderGeometry args={[r * 0.95, r, s2, 28]} />
          <meshStandardMaterial color="#f2f4f7" roughness={0.45} />
        </mesh>
        {showFairing && (
          <group position={[0, s2, 0]}>
            <mesh position={[0, h * 0.06, 0]}>
              <cylinderGeometry args={[r * 1.08, r * 0.95, h * 0.12, 28]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.35} />
            </mesh>
            <mesh position={[0, h * 0.12 + h * 0.05, 0]}>
              <coneGeometry args={[r * 1.08, h * 0.1, 28]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.35} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

export function rocketHeight(tier: string) {
  return tier === 'basic' ? 7 : tier === 'balanced' ? 8.5 : 10;
}

/* ------------------------------------------------------------------ */
/* Engine exhaust                                                      */
/* ------------------------------------------------------------------ */

export function Exhaust({ length = 4, radius = 0.5, intensity = 1 }: { length?: number; radius?: number; intensity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const f = 1 + Math.sin(clock.elapsedTime * 40) * 0.06 + Math.sin(clock.elapsedTime * 23) * 0.04;
    if (ref.current) ref.current.scale.set(f, f * intensity, f);
    if (inner.current) inner.current.scale.set(f, f * intensity, f);
  });
  return (
    <group rotation={[Math.PI, 0, 0]}>
      <mesh ref={ref} position={[0, length / 2, 0]}>
        <coneGeometry args={[radius, length, 20, 1, true]} />
        <meshBasicMaterial color="#ff9a3c" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={inner} position={[0, length * 0.3, 0]}>
        <coneGeometry args={[radius * 0.55, length * 0.6, 16, 1, true]} />
        <meshBasicMaterial color="#fff2c4" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#ffab5e" intensity={40 * intensity} distance={30} position={[0, 1, 0]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Planets                                                             */
/* ------------------------------------------------------------------ */

const ATMO_VERT = `varying vec3 vNormal; varying vec3 vView;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix*normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const ATMO_FRAG = `uniform vec3 uColor; uniform float uPower; uniform float uStrength; varying vec3 vNormal; varying vec3 vView;
void main(){ float f = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower); gl_FragColor = vec4(uColor, f * uStrength); }`;

export function Atmosphere({ radius, color, power = 3, strength = 1.2 }: { radius: number; color: string; power?: number; strength?: number }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uStrength: { value: strength } }), [color, power, strength]);
  return (
    <mesh scale={radius * 1.06}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial vertexShader={ATMO_VERT} fragmentShader={ATMO_FRAG} uniforms={uniforms} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  );
}

export function Earth({ radius = 2, spin = 0.03, clouds = true }: { radius?: number; spin?: number; clouds?: boolean }) {
  const [day, cloud] = useLoader(THREE.TextureLoader, [asset('assets/tex/earth-day.jpg'), asset('assets/tex/earth-clouds.jpg')]);
  day.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = 8;
  const g = useRef<THREE.Group>(null);
  const c = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * spin;
    if (c.current) c.current.rotation.y += dt * spin * 0.25;
  });
  return (
    <group>
      <group ref={g} rotation={[0.41, 0, 0]}>
        <mesh>
          <sphereGeometry args={[radius, 96, 96]} />
          <meshStandardMaterial map={day} roughness={0.85} metalness={0} />
        </mesh>
        {clouds && (
          <mesh ref={c} scale={1.012}>
            <sphereGeometry args={[radius, 96, 96]} />
            <meshStandardMaterial alphaMap={cloud} transparent color="#ffffff" depthWrite={false} opacity={0.9} />
          </mesh>
        )}
      </group>
      <Atmosphere radius={radius} color="#5aa8ff" power={2.6} strength={1.5} />
    </group>
  );
}

export function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

export const JEZERO = { lat: 18.38, lon: 77.58 };

export function MarsGlobe({ radius = 2, spin = 0, children }: { radius?: number; spin?: number; children?: React.ReactNode }) {
  const tex = useLoader(THREE.TextureLoader, asset('assets/tex/mars.jpg'));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current && spin) g.current.rotation.y += dt * spin;
  });
  return (
    <group>
      <group ref={g}>
        <mesh>
          <sphereGeometry args={[radius, 96, 96]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
        {children}
      </group>
      <Atmosphere radius={radius} color="#ff9b6a" power={3.5} strength={0.7} />
    </group>
  );
}

export function Satellite({ color = '#d9dee8', scale = 1 }: { color?: string; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh>
        <boxGeometry args={[0.06, 0.06, 0.1]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[0.16, 0.005, 0.07]} />
        <meshStandardMaterial color="#2a3f7a" metalness={0.6} roughness={0.3} emissive="#0b1838" />
      </mesh>
      <mesh position={[-0.12, 0, 0]}>
        <boxGeometry args={[0.16, 0.005, 0.07]} />
        <meshStandardMaterial color="#2a3f7a" metalness={0.6} roughness={0.3} emissive="#0b1838" />
      </mesh>
    </group>
  );
}
