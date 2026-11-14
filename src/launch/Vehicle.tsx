import { useEffect, useMemo } from 'react';
import * as T from 'three';
import { Blocks, Revolution, beam, type Block, type Vec } from './geometry';
import type { Tier } from '../core/types';
import { fairingScale, LAUNCH_MISSIONS, type LaunchIdentity } from './missions';

export const engines: Vec[] = [[0, 0, 0], ...Array.from({ length: 4 }, (_, i): Vec => [Math.cos(i * Math.PI / 2) * 0.93, 0, Math.sin(i * Math.PI / 2) * 0.93])];
const body: [number, number][] = [[1.39, 1.2], [1.57, 2.4], [1.57, 19.8], [1.55, 20.05]];
const top: [number, number][] = [[1.52, 22.5], [1.52, 26.2], [1.77, 27.8], [1.77, 30.9], [1.72, 31.65], [1.57, 32.47], [1.31, 33.37], [0.98, 34.18], [0.56, 34.96], [0.23, 35.4], [0, 35.55]];
const crewTop: [number, number][] = [[1.52, 22.5], [1.52, 26.2], [1.47, 26.45], [1.47, 27.5], [1.28, 28], [0.55, 30.6], [0.23, 31.05], [0, 31.2]];
const escapeTower: Block[] = [
  ...[-1, 1].flatMap((x) => [-1, 1].map((z) => beam([x*0.38, 30.8, z*0.38], [x*0.18, 33.5, z*0.18], 0.07))),
  beam([-0.38, 30.8, 0.38], [0.18, 33.5, 0.18], 0.045),
  beam([0.38, 30.8, -0.38], [-0.18, 33.5, -0.18], 0.045),
];
const bell: [number, number][] = [[0.39, 0], [0.36, 0.17], [0.29, 0.47], [0.22, 0.79], [0.19, 1.12], [0.26, 1.24]];
const shellRibs: Block[] = Array.from({ length: 38 }, (_, index) => {
  const a = index / 38 * Math.PI * 2;
  return [[Math.sin(a) * 1.54, 21.2, Math.cos(a) * 1.54], [0.045, 2.12, 0.07], [0, a, 0]];
});
const skirts: Block[] = Array.from({ length: 28 }, (_, index) => {
  const a = index / 28 * Math.PI * 2;
  return beam([Math.sin(a) * 1.37, 1.28, Math.cos(a) * 1.37], [Math.sin(a) * 1.58, 2.5, Math.cos(a) * 1.58], 0.055);
});
function Markings({ number }: { number: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#151e26';
    ctx.font = 'bold 124px Arial';
    ctx.fillText('PIONEER', 90, 162);
    ctx.fillStyle = '#bf5528';
    ctx.fillRect(93, 187, 540, 14);
    ctx.font = 'bold 100px Arial';
    ctx.fillText(number, 90, 312);
    ctx.fillStyle = '#151e26';
    ctx.font = 'bold 51px monospace';
    ctx.fillText('LEGACY / FLIGHT SYSTEMS', 91, 406);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }, [number]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 16.1, 0]} rotation={[0, 0.57, 0]}>
    <cylinderGeometry args={[1.578, 1.578, 3.5, 32, 1, true, -0.66, 1.32]} />
    <meshStandardMaterial map={texture} transparent depthWrite={false} roughness={0.85} />
  </mesh>;
}
export function Vehicle({ identity = LAUNCH_MISSIONS['m3-lost-rover'], tier = 'basic' }: { identity?: LaunchIdentity; tier?: Tier }) {
  const width = fairingScale(identity, tier);
  return <>
    <Revolution profile={body} color="#e8e4da" rough={0.38} />
    <Revolution profile={[[1.42, 1.07], [1.6, 2.45], [1.6, 3.08]]} color="#444b50" metal={0.61} />
    <Revolution profile={[[1.56, 19.94], [1.57, 21.85], [1.6, 22.48], [1.55, 22.58]]} color="#39414a" metal={0.54} />
    <group scale={[width, 1, width]}>
      <Revolution profile={identity.payload === 'crew' ? crewTop : top} color="#ece6d7" rough={0.43} />
      <Revolution profile={[[1.525, 24.06], [1.525, 24.62]]} color="#bc532c" />
      {identity.payload === 'crew' ? <>
        <Blocks items={escapeTower} color="#dce0dc" metal={0.58} />
        <Revolution profile={[[0.18, 33.1], [0.24, 33.5], [0.24, 34.8], [0, 35.55]]} color="#ece6d7" rough={0.43} segments={24} />
        <Revolution profile={[[1.485, 27.1], [1.485, 27.35]]} color="#39414a" metal={0.54} />
      </> : <Revolution profile={[[1.776, 28], [1.776, 28.11]]} color="#565b59" />}
    </group>
    {[3.08, 5.2, 9.14, 12.86, 19.82, 22.45].map((height) => <Revolution key={height} profile={[[1.578, height], [1.592, height + 0.028], [1.578, height + 0.067]]} color="#959b9b" metal={0.42} />)}
    <Blocks items={shellRibs} color="#99a0a2" metal={0.61} />
    <Blocks items={skirts} color="#9da7ad" metal={0.62} />
    <Blocks items={[
      [[-1.23, 10.91, 1.01], [0.21, 15.7, 0.14], [0, -0.88, 0]],
      [[-1.25, 23.5, 0.95], [0.23, 2.1, 0.18], [0, -0.88, 0]],
      [[0.36, 6.4, 1.51], [0.33, 0.45, 0.097], [0, 0.23, 0]],
      [[0.53, 10.95, 1.45], [0.44, 0.64, 0.09], [0, 0.35, 0]],
    ]} color="#59676b" metal={0.44}/>
    <Blocks items={[[[0.54, 11.02, 1.499], [0.19, 0.095, 0.018], [0, 0.35, 0]], [[0.37, 6.52, 1.562], [0.15, 0.09, 0.022], [0, 0.23, 0]]]} color="#d67633" />
    <Markings number={identity.number} />
    {engines.map(([x, , z]) => <group key={x + '/' + z} position={[x, 0, z]}>
      <Revolution profile={bell} color="#73797f" metal={0.77} segments={24} />
      <Revolution profile={[[0.405, 0.015], [0.405, 0.076], [0.38, 0.112]]} color="#a49176" metal={0.7} segments={24} />
      <Revolution profile={[[0, 0.65], [0.32, 0.05], [0.38, 0.005]]} color="#1b2023" metal={0.38} segments={24} />
    </group>)}
  </>;
}
