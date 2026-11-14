import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { asset } from './models';

/* ------------------------------------------------------------------ */
/* NASA 3D Resources models (public domain, github.com/nasa/NASA-3D-Resources). */
/* Draco-compressed; decoded with the bundled decoder (no CDN).         */
/* ------------------------------------------------------------------ */

const DRACO = asset('draco/');
const LM_URL = asset('assets/models/apollo-lm.glb');
const MER_URL = asset('assets/models/mer-opportunity.glb');

function prepare(src: THREE.Object3D, keep?: (centerY: number) => boolean) {
  const root = src.clone(true);
  root.updateMatrixWorld(true);
  const drop: THREE.Object3D[] = [];
  const box = new THREE.Box3();
  const c = new THREE.Vector3();
  root.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    if (keep) {
      box.setFromObject(m).getCenter(c);
      if (!keep(c.y)) {
        drop.push(m);
        return;
      }
    }
    m.castShadow = true;
    m.receiveShadow = true;
  });
  drop.forEach((m) => m.removeFromParent());
  // Sit on the ground, centred on the origin
  const b = new THREE.Box3().setFromObject(root);
  const centre = b.getCenter(new THREE.Vector3());
  root.position.set(-centre.x, -b.min.y, -centre.z);
  const wrap = new THREE.Group();
  wrap.add(root);
  return wrap;
}

/** The Apollo Lunar Module descent stage left on the Moon (the ascent stage flew back up). */
export function ApolloDescentStage(props: ThreeElements['group']) {
  const { scene } = useGLTF(LM_URL, DRACO);
  const obj = useMemo(() => prepare(scene, (y) => y < 2.6), [scene]);
  return (
    <group {...props}>
      <primitive object={obj} />
    </group>
  );
}

/** NASA's Mars Exploration Rover model (Spirit/Opportunity twin design). */
export function OpportunityRover(props: ThreeElements['group']) {
  const { scene } = useGLTF(MER_URL, DRACO);
  const obj = useMemo(() => prepare(scene), [scene]);
  return (
    <group {...props}>
      <primitive object={obj} />
    </group>
  );
}
