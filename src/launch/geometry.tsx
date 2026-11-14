import { useLayoutEffect, useMemo, useRef } from 'react';
import * as T from 'three';
export type Vec = [number, number, number];
export type Block = [position: Vec, size: Vec, rotation?: Vec];
export function Blocks({ items, color, metal = 0, shadow = false }: { items: Block[]; color: string; metal?: number; shadow?: boolean }) {
  const mesh = useRef<T.InstancedMesh>(null);
  useLayoutEffect(() => {
    const block = new T.Object3D();
    items.forEach(([position, size, rotation], index) => {
      block.position.set(...position);
      block.scale.set(...size);
      block.rotation.set(...(rotation ?? [0, 0, 0]));
      block.updateMatrix();
      mesh.current!.setMatrixAt(index, block.matrix);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} castShadow={shadow} receiveShadow={shadow}>
    <boxGeometry />
    <meshStandardMaterial color={color} metalness={metal} roughness={0.72} />
  </instancedMesh>;
}
export function beam(from: Vec, to: Vec, width: number): Block {
  const start = new T.Vector3(...from);
  const end = new T.Vector3(...to);
  const delta = end.clone().sub(start);
  const rotation = new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize()));
  return [start.lerp(end, 0.5).toArray(), [width, delta.length(), width], [rotation.x, rotation.y, rotation.z]];
}
export function Revolution({ profile, color, metal = 0, rough = 0.53, segments = 48 }: { profile: [number, number][]; color: string; metal?: number; rough?: number; segments?: number }) {
  const points = useMemo(() => profile.map(([radius, height]) => new T.Vector2(radius, height)), [profile]);
  return <mesh castShadow receiveShadow>
    <latheGeometry args={[points, segments]} />
    <meshStandardMaterial color={color} metalness={metal} roughness={rough} side={T.DoubleSide} />
  </mesh>;
}
export function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
