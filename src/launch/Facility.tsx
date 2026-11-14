import { useEffect, useMemo, type RefObject } from 'react';
import * as T from 'three';
import { Blocks, beam, random, type Block } from './geometry';

function plans() {
  const concrete: Block[] = [
    [[0, 0.19, 0], [26, 0.38, 23]], [[0, 0.52, -3.1], [10, 0.48, 5.2]],
    [[-3.9, 0.99, 0], [2.75, 1.3, 5.9]], [[3.9, 0.99, 0], [2.75, 1.3, 5.9]],
    [[0, 0.32, 27], [45, 0.38, 29]], [[-19, 0.09, -26], [6, 0.16, 64]],
    [[-33, 1.55, -26], [13, 3.1, 12]], [[29, 1.85, -39], [15, 3.7, 8]],
  ];
  const steel: Block[] = [[[0, 0.395, 0.6], [5.0, 0.06, 6.7]], [[-2.25, 2.15, 0], [1.3, 0.62, 5.4]], [[2.25, 2.15, 0], [1.3, 0.62, 5.4]], [[0, 2.15, -2.18], [3.2, 0.62, 1.05]], [[0, 2.15, 2.18], [3.2, 0.62, 1.05]], [[-33, 3.1, -26], [13.6, 0.37, 12.6]]];
  const rails: Block[] = [];
  const girders: Block[] = [];
  const paint: Block[] = [];
  const corners: [number, number][] = [[-9,-5],[-5.9,-5],[-5.9,-1.8],[-9,-1.8]];
  for (const [x,z] of corners) girders.push(beam([x,0.36,z],[x,38,z],0.34));
  for (let level = 0; level < 10; level++) {
    const y = 0.8 + level * 3.7;
    corners.forEach(([x,z], index) => {
      const [xx,zz] = corners[(index + 1) % 4];
      girders.push(beam([x,y,z],[xx,y,zz],0.22));
      girders.push(beam([x,y,z],[xx,y+3.7,zz],0.17));
      girders.push(beam([xx,y,z],[x,y+3.7,zz],0.11));
    });
    if (level % 2 === 0 || level === 9) {
      steel.push([[-7.43,y,-3.39],[4.32,0.22,4.75]]);
      for (const z of [-5.7,-1.1]) {
        rails.push(beam([-9.45,y+0.96,z],[-5.3,y+0.96,z],0.08));
        for (const x of [-9.45,-8,-6.75,-5.3]) rails.push(beam([x,y,z],[x,y+0.96,z],0.07));
      }
    }
    for (let step = 0; step < 12; step++) steel.push([[-8.78 + step * 0.235,y + step * 0.306,-3.35],[0.34,0.07,0.73]]);
  }
  for (const z of [-5.65, 5.65]) {
    for (let i = 0; i < 16; i++) paint.push([[-12 + i * 1.6, 0.393, z],[0.85,0.018,0.13]]);
  }
  for (let i = 0; i < 6; i++) {
    const x = -2.45 + i * 0.98;
    paint.push([[x,2.472,2.48],[0.47,0.019,0.27],[0,0.38,0]]);
  }
  for (const x of [-10, 10]) {
    girders.push(beam([x,0.4,8],[x,7.8,8],0.18), beam([x-0.7,7.8,8],[x+0.7,7.8,8],0.14));
    rails.push([[x,7.76,8.12],[1.28,0.28,0.29]]);
  }
  for (const z of [-8.4,-9.05]) {
    girders.push(beam([-23,0.7,z],[-4,0.7,z],0.16));
    girders.push(beam([-4,0.7,z],[-4,1.52,z+4],0.16));
    for (let x = -22; x < -5; x += 3.25) steel.push([[x,0.48,z],[0.22,0.65,0.75]]);
  }
  const rng = random(51);
  const scrub: Block[] = Array.from({length: 420}, () => {
    const a = rng() * Math.PI * 2;
    const r = 26 + rng() * 460;
    return [[Math.cos(a)*r,0.13,Math.sin(a)*r],[1+rng()*4,0.16+rng()*0.46,0.5+rng()*2.3],[0,a,0]];
  });
  return {concrete, steel, rails, girders, paint, scrub};
}
function terrain() {
  const geometry = new T.PlaneGeometry(2700, 2700, 115, 115);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position;
  const colors = [];
  const ground = new T.Color();
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), z = vertices.getZ(i);
    const distance = Math.hypot(x,z);
    const waves = Math.sin(x*0.012+z*0.005) * Math.cos(z*0.017) + 0.34 * Math.cos(x*0.043-z*0.01);
    const relief = Math.max(0, Math.min(1,(distance-62)/400));
    vertices.setY(i, -0.17 + relief * (waves * 27 + 10));
    ground.set('#817a65').lerp(new T.Color('#464b42'), Math.max(0,Math.min(1,0.35+waves*0.32)));
    colors.push(ground.r,ground.g,ground.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
export function Facility({ arms }: { arms: RefObject<T.Group | null>[] }) {
  const p = useMemo(plans, []);
  const ridge = useMemo(terrain, []);
  useEffect(() => () => ridge.dispose(), [ridge]);
  return <>
    <mesh geometry={ridge} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <Blocks items={p.concrete} color="#8a8880" shadow />
    <Blocks items={p.steel} color="#383f45" metal={0.38} shadow />
    <Blocks items={p.girders} color="#794d41" metal={0.39} shadow />
    <Blocks items={p.rails} color="#dac19a" metal={0.2} />
    <Blocks items={p.paint} color="#ebb754" />
    <Blocks items={p.scrub} color="#575c45" />
    {[10, 22.85, 31].map((height, index) => <group ref={arms[index]} key={height} position={[-5.86,height,-2.1]}>
      <Blocks items={[
        [[2.14,0,0.25],[4.3,0.24,1.18]], [[4.25,0.17,0.91],[0.38,0.46,1.86]],
        beam([0,0.66,-0.24],[4.18,0.66,-0.24],0.085), beam([0,0.66,0.76],[4.18,0.66,0.76],0.085),
        ...[0,1.35,2.71,4.18].flatMap((x): Block[] => [beam([x,0,-0.24],[x,0.66,-0.24],0.072),beam([x,0,0.76],[x,0.66,0.76],0.072)]),
      ]} color="#8a6850" metal={0.48} shadow />
    </group>)}
    {[-26,-19,-12].map((x) => <mesh key={x} position={[x,1.84,-19]} castShadow>
      <cylinderGeometry args={[1.68,1.75,3.45,20]} /><meshStandardMaterial color="#aaa89e" metalness={0.41} roughness={0.6} />
    </mesh>)}
    <mesh position={[-7.41,38.1,-3.4]}><sphereGeometry args={[0.22,12,8]} /><meshBasicMaterial color="#ff5e37" /></mesh>
  </>;
}
