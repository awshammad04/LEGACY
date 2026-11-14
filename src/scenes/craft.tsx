import { LrvModel } from './lunarRover';
import * as THREE from 'three';
import type { Design, MissionDefinition } from '../core/types';
import { tierOf } from '../core/evaluate';

const WHITE = '#e9edf3';
const GREY = '#8a93a3';
const GOLD = '#c99a3c';
const PANEL = '#1b2a55';

/** Compact observatory — optics, sensor, power and comms tiers are visible. */
export function TelescopeModel({ mission, design }: { mission: MissionDefinition; design: Design }) {
  const bus = tierOf(mission, design, 'platform') ?? 'basic';
  const optics = tierOf(mission, design, 'optics') ?? 'basic';
  const sensor = tierOf(mission, design, 'camera') ?? 'basic';
  const power = tierOf(mission, design, 'power') ?? 'basic';
  const comms = tierOf(mission, design, 'comms') ?? 'basic';
  const r = optics === 'basic' ? 0.32 : optics === 'balanced' ? 0.45 : 0.6;
  const busS = bus === 'basic' ? 0.9 : bus === 'balanced' ? 1 : 1.12;
  const wing = power === 'basic' ? 0 : power === 'balanced' ? 1.4 : 2;
  return (
    <group position={[0, 0.95, 0]} scale={0.72}>
      <mesh castShadow>
        <boxGeometry args={[1.1 * busS, 0.9 * busS, 1.1 * busS]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
      <group position={[0, 0.45 * busS + r * 2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[r, r, r * 4, 32, 1, true]} />
          <meshStandardMaterial color={WHITE} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -r * 1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r * 0.95, 32]} />
          <meshStandardMaterial color="#9fb4d8" metalness={1} roughness={0.05} />
        </mesh>
        <mesh position={[0, r * 2.05, 0]} rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[r * 1.02, r * 1.02, 0.03, 32]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      </group>
      {sensor === 'advanced' && (
        <mesh position={[0.62 * busS, 0, 0]}>
          <boxGeometry args={[0.04, 0.8, 0.7]} />
          <meshStandardMaterial color="#d9dee8" metalness={0.6} roughness={0.2} />
        </mesh>
      )}
      {wing === 0
        ? [-1, 1].map((sd) => (
            <mesh key={sd} position={[0, 0, sd * 0.56 * busS]}>
              <boxGeometry args={[1.05 * busS, 0.8 * busS, 0.02]} />
              <meshStandardMaterial color={PANEL} metalness={0.5} roughness={0.25} emissive="#0a1430" />
            </mesh>
          ))
        : [-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * (0.55 * busS + wing / 2), 0, 0]}>
              <boxGeometry args={[wing, 0.03, 0.9]} />
              <meshStandardMaterial color={PANEL} metalness={0.55} roughness={0.25} emissive="#0a1430" />
            </mesh>
          ))}
      <mesh position={[-0.3, -0.45 * busS - 0.12, 0.2]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[comms === 'basic' ? 0.12 : comms === 'balanced' ? 0.22 : 0.16, 0.18, 20, 1, true]} />
        <meshStandardMaterial color={WHITE} side={THREE.DoubleSide} metalness={0.4} />
      </mesh>
    </group>
  );
}

/** Crew lander, plus a rover beside it when one was chosen (Mission 01). */
export function LanderModel({ mission, design }: { mission: MissionDefinition; design: Design }) {
  const lander = tierOf(mission, design, 'edl') ?? 'basic';
  const rover = tierOf(mission, design, 'chassis') ?? 'basic';
  const power = tierOf(mission, design, 'power') ?? 'basic';
  const s = lander === 'basic' ? 0.9 : lander === 'balanced' ? 1 : 1.05;
  return (
    <group>
      <group scale={s} position={[-0.6, 0, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <group key={i}>
              <mesh position={[Math.cos(a) * 1.05, 0.55, Math.sin(a) * 1.05]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}>
                <cylinderGeometry args={[0.04, 0.04, 1.3, 8]} />
                <meshStandardMaterial color={GREY} metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[Math.cos(a) * 1.35, 0.03, Math.sin(a) * 1.35]}>
                <cylinderGeometry args={[0.18, 0.2, 0.05, 16]} />
                <meshStandardMaterial color={GREY} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.95, 1.05, 0.8, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.95, 0]} castShadow>
          <boxGeometry args={[1.1, 0.9, 1.0]} />
          <meshStandardMaterial color="#cfd4dc" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0.56, 2.0, 0]}>
          <boxGeometry args={[0.02, 0.35, 0.3]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        {power !== 'basic' && (
          <mesh position={[0, 2.55, 0]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[power === 'advanced' ? 2.6 : 2, 0.03, 0.7]} />
            <meshStandardMaterial color={PANEL} metalness={0.55} roughness={0.25} emissive="#0a1430" />
          </mesh>
        )}
      </group>
      {rover !== 'basic' && (
        <group position={[1.65, 0, 0.6]} scale={rover === 'advanced' ? 0.62 : 0.55} rotation={[0, -0.6, 0]}>
          <LrvModel />
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Open-world vehicles and heritage props (procedural reconstructions)  */
/* ------------------------------------------------------------------ */

export { LrvModel } from './lunarRover';

/** A walking astronaut (used when the crew has no rover). */
export function AstronautModel() {
  return (
    <group scale={1.4}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.7, 6, 14]} />
        <meshStandardMaterial color="#f3f4f6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.28, 18, 18]} />
        <meshStandardMaterial color="#f3f4f6" />
      </mesh>
      <mesh position={[0.18, 1.66, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[-0.36, 1.0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.6, 0.5]} />
        <meshStandardMaterial color="#d6d9de" />
      </mesh>
    </group>
  );
}

/** Apollo lunar module descent stage left on the Moon (reconstruction). */
export function DescentStageModel() {
  return (
    <group scale={1.6}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 1.05, 0.55, Math.sin(a) * 1.05]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}>
              <cylinderGeometry args={[0.05, 0.05, 1.3, 8]} />
              <meshStandardMaterial color={GREY} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[Math.cos(a) * 1.35, 0.03, Math.sin(a) * 1.35]}>
              <cylinderGeometry args={[0.2, 0.22, 0.05, 16]} />
              <meshStandardMaterial color={GREY} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.8, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0.5, 1.7, 0.4]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 6]} />
        <meshStandardMaterial color={WHITE} />
      </mesh>
    </group>
  );
}

/** Mars Exploration Rover–style rover (Opportunity), dusty (reconstruction). */
export function MerModel() {
  const dust = '#b07a52';
  return (
    <group scale={1.3}>
      {[-1, 1].map((side) =>
        [-0.8, 0, 0.8].map((x) => (
          <mesh key={`${side}${x}`} position={[x, 0.25, side * 0.75]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.18, 14]} />
            <meshStandardMaterial color="#5b4636" roughness={0.9} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.4, 0.35, 1.0]} />
        <meshStandardMaterial color={dust} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[2.2, 0.04, 1.9]} />
        <meshStandardMaterial color="#7a5a44" roughness={0.85} />
      </mesh>
      <mesh position={[0.55, 1.35, 0.3]}>
        <cylinderGeometry args={[0.04, 0.05, 1.0, 8]} />
        <meshStandardMaterial color={dust} />
      </mesh>
      <mesh position={[0.6, 1.88, 0.3]}>
        <boxGeometry args={[0.2, 0.14, 0.38]} />
        <meshStandardMaterial color={dust} />
      </mesh>
    </group>
  );
}
