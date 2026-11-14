import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { asset } from './models';

/**
 * Rigged astronaut ("Rigged Astronaut" by J-Toastie, CC-BY 3.0, via Poly Pizza).
 * The GLB ships with a Mixamo-standard skeleton but no animation clips, so poses
 * are driven procedurally here. Any Mixamo clip could later replace a pose.
 */
export const ASTRONAUT_URL = asset('assets/models/astronaut.glb');

export type AstroPose = 'idle' | 'wave' | 'walk' | 'float' | 'interact' | 'drive' | 'cycle' | 'huddle' | 'sleep';

/** Live motion input (no re-render): speed in units/s drives the walk cycle. */
export interface AstroMotion {
  pose?: AstroPose;
  speed?: number;
  lowGravity?: boolean;
}

type BoneKey =
  | 'Hips' | 'Spine' | 'Spine1' | 'Spine2' | 'Neck' | 'Head'
  | 'LeftShoulder' | 'LeftArm' | 'LeftForeArm' | 'LeftHand'
  | 'RightShoulder' | 'RightArm' | 'RightForeArm' | 'RightHand'
  | 'LeftUpLeg' | 'LeftLeg' | 'LeftFoot' | 'RightUpLeg' | 'RightLeg' | 'RightFoot';

const KEYS: BoneKey[] = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

type Offsets = Partial<Record<BoneKey, [number, number, number]>>;

/**
 * Relaxed stance from the T-pose. Local bone axes of this Mixamo rig:
 * arms — X+ lowers the arm, Z swings it forward (+ left, − right);
 * legs — X+ swings the thigh forward, knee flex is X−; spine/head — X+ leans forward.
 */
const RELAX: Offsets = {
  LeftArm: [1.2, 0, 0.12],
  RightArm: [1.2, 0, -0.12],
  LeftForeArm: [0, 0, 0.3],
  RightForeArm: [0, 0, -0.3],
};

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

function addOff(o: Offsets, k: BoneKey, x: number, y: number, z: number) {
  const v = o[k] ?? [0, 0, 0];
  o[k] = [v[0] + x, v[1] + y, v[2] + z];
}

/** Procedural pose library — returns local bone offsets plus a vertical body offset. */
function poseOffsets(pose: AstroPose, t: number, phase: number, speed: number, lowG: boolean): { o: Offsets; lift: number } {
  const o: Offsets = {};
  for (const k of Object.keys(RELAX) as BoneKey[]) o[k] = [...RELAX[k]!];
  const breathe = Math.sin(t * 1.6);
  addOff(o, 'Spine1', breathe * 0.02, 0, 0);
  addOff(o, 'Head', Math.sin(t * 0.45) * 0.05, Math.sin(t * 0.3) * 0.18, 0);
  let lift = 0;
  switch (pose) {
    case 'idle':
      addOff(o, 'LeftArm', Math.sin(t * 0.8) * 0.03, 0, 0);
      addOff(o, 'RightArm', Math.sin(t * 0.8 + 1) * 0.03, 0, 0);
      break;
    case 'wave': {
      const w = Math.sin(t * 6);
      o.RightArm = [-0.15, 0, -0.25];
      o.RightForeArm = [-1.3 + w * 0.3, 0, 0];
      addOff(o, 'Spine2', 0, 0, 0.04);
      break;
    }
    case 'interact': {
      const r = Math.sin(t * 2.2) * 0.08;
      o.RightArm = [0.35, 0, -1.2 + r];
      o.RightForeArm = [0, 0, -0.35];
      o.LeftArm = [0.9, 0, 0.55];
      o.LeftForeArm = [0, 0, 0.7];
      addOff(o, 'Spine', 0.18, 0, 0);
      addOff(o, 'Head', 0.25, 0, 0);
      o.LeftUpLeg = [0.18, 0, 0];
      o.RightUpLeg = [0.18, 0, 0];
      o.LeftLeg = [-0.35, 0, 0];
      o.RightLeg = [-0.35, 0, 0];
      lift = -0.06;
      break;
    }
    case 'cycle': {
      // Seated on an exercise device, pedalling
      const c = Math.sin(t * 5);
      o.LeftUpLeg = [1.25 + c * 0.35, 0, 0.08];
      o.RightUpLeg = [1.25 - c * 0.35, 0, -0.08];
      o.LeftLeg = [-1.3 - Math.max(0, -c) * 0.5, 0, 0];
      o.RightLeg = [-1.3 - Math.max(0, c) * 0.5, 0, 0];
      o.LeftArm = [0.6, 0, 0.9];
      o.RightArm = [0.6, 0, -0.9];
      o.LeftForeArm = [0, 0, 0.9];
      o.RightForeArm = [0, 0, -0.9];
      addOff(o, 'Spine', 0.15 + c * 0.02, 0, 0);
      break;
    }
    case 'huddle':
      // Curled up in the storm shelter
      o.LeftUpLeg = [1.7, 0, 0.1];
      o.RightUpLeg = [1.7, 0, -0.1];
      o.LeftLeg = [-2.0, 0, 0];
      o.RightLeg = [-2.0, 0, 0];
      o.LeftArm = [0.9, 0, 1.1];
      o.RightArm = [0.9, 0, -1.1];
      o.LeftForeArm = [0, 0, 1.2];
      o.RightForeArm = [0, 0, -1.2];
      addOff(o, 'Spine', 0.35, 0, 0);
      addOff(o, 'Head', 0.3, 0, 0);
      break;
    case 'sleep': {
      // Relaxed microgravity sleep posture: arms float up, knees soft
      const b = Math.sin(t * 0.9) * 0.03;
      o.LeftArm = [0.15 + b, 0, 0.55];
      o.RightArm = [0.15 - b, 0, -0.55];
      o.LeftForeArm = [0, 0, 0.7];
      o.RightForeArm = [0, 0, -0.7];
      o.LeftUpLeg = [0.35, 0, 0.05];
      o.RightUpLeg = [0.3, 0, -0.05];
      o.LeftLeg = [-0.6, 0, 0];
      o.RightLeg = [-0.55, 0, 0];
      addOff(o, 'Head', 0.25, 0, 0);
      break;
    }
    case 'drive':
      o.LeftUpLeg = [1.45, 0, 0.08];
      o.RightUpLeg = [1.45, 0, -0.08];
      o.LeftLeg = [-1.4, 0, 0];
      o.RightLeg = [-1.4, 0, 0];
      o.LeftArm = [0.9, 0, 0.9];
      o.RightArm = [0.9, 0, -0.9];
      o.LeftForeArm = [0, 0, 0.6];
      o.RightForeArm = [0, 0, -0.6];
      break;
    case 'float': {
      const a = Math.sin(t * 0.5);
      const b = Math.sin(t * 0.37 + 1.3);
      o.LeftArm = [0.7 + b * 0.12, 0, 0.25 + a * 0.15];
      o.RightArm = [0.6 + a * 0.12, 0, -0.3 - b * 0.15];
      o.LeftForeArm = [0, 0, 0.5 + a * 0.1];
      o.RightForeArm = [0, 0, -0.55 - b * 0.1];
      o.LeftUpLeg = [0.25 + a * 0.1, 0, 0.06];
      o.RightUpLeg = [0.05 - a * 0.1, 0, -0.06];
      o.LeftLeg = [-0.45 - b * 0.1, 0, 0];
      o.RightLeg = [-0.25 + b * 0.1, 0, 0];
      addOff(o, 'Spine', 0.06, 0, 0);
      break;
    }
    case 'walk': {
      const s = Math.min(1, speed / (lowG ? 3 : 2.2));
      const amp = lowG ? 0.55 : 0.5;
      const sw = Math.sin(phase);
      const cw = Math.cos(phase);
      o.LeftUpLeg = [sw * amp * s, 0, 0];
      o.RightUpLeg = [-sw * amp * s, 0, 0];
      o.LeftLeg = [-Math.max(0, cw) * 0.9 * s - 0.05, 0, 0];
      o.RightLeg = [-Math.max(0, -cw) * 0.9 * s - 0.05, 0, 0];
      addOff(o, 'LeftArm', -0.1 * s, 0, -sw * 0.4 * s);
      addOff(o, 'RightArm', -0.1 * s, 0, -sw * 0.4 * s);
      addOff(o, 'Spine', 0.1 * s, sw * 0.06 * s, 0);
      // Low gravity: a bouncing lope with an airborne moment each stride
      lift = lowG ? Math.abs(Math.sin(phase)) * 0.2 * s : Math.abs(Math.sin(phase)) * 0.04 * s;
      break;
    }
  }
  return { o, lift };
}

export function Astronaut({
  pose = 'idle',
  motion,
  castShadow = true,
  suit: suitProp,
  ...group
}: { pose?: AstroPose; motion?: MutableRefObject<AstroMotion>; castShadow?: boolean; suit?: 'eva' | 'flight' } & ThreeElements['group']) {
  const { scene } = useGLTF(ASTRONAUT_URL);
  const model = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group;
    c.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = castShadow;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((src) => {
        const mat = (src as THREE.MeshStandardMaterial).clone();
        if (mat.name === 'white') {
          // EVA suit is white; inside the spacecraft the crew wear orange launch-and-entry suits
          mat.color.set(suitProp === 'flight' ? '#e8742c' : '#eceae4');
          mat.roughness = 0.82;
          mat.metalness = 0;
        } else if (mat.name === 'gray') {
          mat.roughness = 0.6;
          mat.metalness = 0.35;
        } else if (mat.name === 'transparent_mask') {
          // Gold-coated visor
          mat.color.set(suitProp === 'flight' ? '#4a5560' : '#d99a3a');
          mat.metalness = 1;
          mat.roughness = 0.18;
          mat.envMapIntensity = 1.6;
          mat.transparent = false;
          mat.opacity = 1;
        }
        return mat;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0];
    });
    return c;
  }, [scene, castShadow, suitProp]);

  const bones = useMemo(() => {
    const map: Partial<Record<BoneKey, { b: THREE.Bone; rest: THREE.Quaternion; restPos: THREE.Vector3 }>> = {};
    model.traverse((n) => {
      if (!(n as THREE.Bone).isBone) return;
      const key = n.name.replace(/[^A-Za-z0-9]/g, '').replace(/^mixamorig/, '') as BoneKey;
      if (KEYS.includes(key)) map[key] = { b: n as THREE.Bone, rest: n.quaternion.clone(), restPos: n.position.clone() };
    });
    return map;
  }, [model]);

  const st = useRef({ phase: 0, cur: {} as Offsets, lift: 0 });
  useEffect(() => {
    st.current.cur = {};
  }, [model]);

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const m = motion?.current;
    const p = m?.pose ?? pose;
    const speed = m?.speed ?? 0;
    const lowG = !!m?.lowGravity;
    const s = st.current;
    s.phase += dt * (lowG ? 5.2 : 7.5) * Math.min(1.6, 0.35 + speed * 0.4);
    const { o, lift } = poseOffsets(p, clock.elapsedTime, s.phase, speed, lowG);
    // Smoothly blend toward the target pose so pose changes never pop
    const k = 1 - Math.exp(-dt * 10);
    for (const key of KEYS) {
      const bone = bones[key];
      if (!bone) continue;
      const tgt = o[key] ?? [0, 0, 0];
      const cur = s.cur[key] ?? (s.cur[key] = [...tgt] as [number, number, number]);
      cur[0] += (tgt[0] - cur[0]) * k;
      cur[1] += (tgt[1] - cur[1]) * k;
      cur[2] += (tgt[2] - cur[2]) * k;
      _e.set(cur[0], cur[1], cur[2]);
      bone.b.quaternion.copy(bone.rest).multiply(_q.setFromEuler(_e));
    }
    s.lift += (lift - s.lift) * k;
    const hips = bones.Hips;
    if (hips) hips.b.position.y = hips.restPos.y + s.lift;
  });

  return (
    <group {...group}>
      <primitive object={model} />
    </group>
  );
}


useGLTF.preload(ASTRONAUT_URL);
