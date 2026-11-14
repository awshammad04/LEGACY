import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as T from 'three';
import { useFrame } from '@react-three/fiber';
import { Blocks, beam, type Block } from '../launch/geometry';
import { heightAt } from '../core/terrain';
import { smoothSteering } from '../legacy-visuals/portable/wheel-motion.js';
import { Astronaut } from './astronaut';
import type { VehicleMotion } from './roverfx';

/** Same EVA suit scale aboard and on foot (the supplied rig is 2.25 units tall). */
export const LUNAR_CREW_SCALE = 0.88;
const R = 0.38;
const wheelPositions = [[1.08, 0.38, -0.94], [1.08, 0.38, 0.94], [-1.08, 0.38, -0.94], [-1.08, 0.38, 0.94]] as const;
const anchors=wheelPositions.map(([x,,z])=>[
  [Math.sign(x)*0.72,0.62,Math.sign(z)*0.51],
  [Math.sign(x)*1.25,0.66,Math.sign(z)*0.54],
  [Math.sign(x)*0.89,0.77,Math.sign(z)*0.61],
] as [number,number,number][]);
function detailMap(cloth:boolean) {
  const N=128,data=new Uint8Array(N*N*4);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
    const value=cloth ? 135+(((x%4)<2)!==((y%4)<2)?34:0) :
      130+Math.sin(x*0.37+Math.sin(y*0.18)*3)*35+Math.cos(y*0.47+x*0.18)*28;
    const i=(y*N+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const map=new T.DataTexture(data,N,N);map.wrapS=map.wrapT=T.RepeatWrapping;
  map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  return map;
}
const frame: Block[] = [
  ...[-0.65, 0.65].map((z): Block => [[0,0.62,z],[2.86,0.075,0.075]]),
  ...[-1.32,-0.68,0,0.68,1.32].map((x): Block => [[x,0.62,0],[0.065,0.075,1.37]]),
  ...[-0.69,0.69].map((z) => beam([-1.32,0.65,z],[1.32,0.65,z],0.045)),
];
const chevrons: Block[] = Array.from({length: 28}, (_,i) => {
  const a = i/28*Math.PI*2;
  return [[Math.cos(a)*(R+0.005),Math.sin(a)*(R+0.005),0],[0.025,0.022,0.26],[0,0,a+0.3]];
});
const spokes: Block[] = Array.from({length:10},(_,i) => {
  const a = i/10*Math.PI*2;
  return beam([Math.cos(a)*0.1,Math.sin(a)*0.1,0],[Math.cos(a)*(R-0.035),Math.sin(a)*(R-0.035),0],0.013);
});

function MeshWheel() {
  return <>
    {/* Open woven-metal wheel, chevron traction strips and machined hub, rather than a rubber tyre. */}
    <mesh rotation={[Math.PI/2,0,0]} castShadow>
      <cylinderGeometry args={[R,R,0.24,32,9,true]} />
      <meshStandardMaterial color="#969b9d" metalness={0.75} roughness={0.62} wireframe side={T.DoubleSide} />
    </mesh>
    {[-0.12,0.12].map(z => <group key={z} position={[0,0,z]}>
      <mesh castShadow><torusGeometry args={[R-0.015,0.015,6,40]} /><meshStandardMaterial color="#c3c5c1" metalness={0.75} roughness={0.48} /></mesh>
      <Blocks items={spokes} color="#b2b5b1" metal={0.65} />
      <mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[0.11,0.11,0.065,20]} /><meshStandardMaterial color="#a7adb0" metalness={0.8} roughness={0.35} /></mesh>
      <mesh><torusGeometry args={[0.067,0.013,6,20]} /><meshStandardMaterial color="#373b3d" metalness={0.4} roughness={0.6} /></mesh>
    </group>)}
    <Blocks items={chevrons} color="#c2c0b6" metal={0.6} />
  </>;
}

/** Apollo-inspired four-wheel EVA vehicle. All motion uses the existing R3F frame loop. */
export function LrvModel({crew=false,motion}: {crew?:boolean;motion?:MutableRefObject<VehicleMotion>}) {
  const root=useRef<T.Group>(null);
  const mounts=useRef<(T.Group|null)[]>([]);
  const turns=useRef<(T.Group|null)[]>([]);
  const spins=useRef<(T.Group|null)[]>([]);
  const struts=useRef<(T.Mesh|null)[]>([]);
  const state=useRef({spin:0,steer:0,offsets:new Float32Array(4)});
  const tmp=useMemo(()=>new T.Vector3(),[]);
  const axis=useMemo(()=>new T.Vector3(0,1,0),[]);
  const maps=useMemo(()=>({foil:detailMap(false),cloth:detailMap(true)}),[]);
  useEffect(()=>()=>{maps.foil.dispose();maps.cloth.dispose();},[maps]);
  useFrame((_,rawDt)=>{
    if(!root.current || !motion) return;
    const dt=Math.min(rawDt,0.05), s=state.current;
    const scale=root.current.getWorldScale(tmp).x || 1;
    s.spin+=motion.current.v*dt/(R*scale);
    s.steer=smoothSteering(s.steer,(motion.current.steer??0)*0.35,dt);
    root.current.updateWorldMatrix(true,false);
    wheelPositions.forEach(([x,,z],i)=>{
      tmp.set(x,0,z);root.current!.localToWorld(tmp);
      tmp.y=heightAt(tmp.x,tmp.z);root.current!.worldToLocal(tmp);
      const wanted=T.MathUtils.clamp(tmp.y,-0.17,0.17);
      s.offsets[i]+=(wanted-s.offsets[i])*(1-Math.exp(-dt*12));
      if(mounts.current[i]) mounts.current[i]!.position.y=R+s.offsets[i];
      if(turns.current[i]) turns.current[i]!.rotation.y=s.steer*(x>0?1:-0.65);
      if(spins.current[i]) spins.current[i]!.rotation.z=-s.spin;
      anchors[i].forEach((start,j)=>{
        const strut=struts.current[i*3+j];if(!strut)return;
        tmp.set(x-start[0],R+s.offsets[i]-start[1],z-start[2]);
        strut.position.set(...start).addScaledVector(tmp,0.5);strut.scale.y=tmp.length();
        strut.quaternion.setFromUnitVectors(axis,tmp.normalize());
      });
    });
  });
  return <group ref={root} name="LunarRover">
    <Blocks items={frame} color="#b9bfc0" metal={0.72} shadow />
    <mesh position={[0,0.68,0]} receiveShadow castShadow><boxGeometry args={[2.72,0.055,1.35]} /><meshStandardMaterial color="#c4c5ba" metalness={0.62} roughness={0.63} /></mesh>
    {/* Fold joints, deck ribs and exposed aluminium chassis. */}
    <Blocks items={[-1.15,-0.9,-0.65,-0.4,-0.15,0.1,0.35,0.6,0.85,1.1].map(x=>[[x,0.715,0],[0.018,0.018,1.28]] as Block)} color="#777e7d" metal={0.65} />
    {[-0.65,0.65].map(z=><mesh key={z} position={[0,0.65,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.08,0.08,0.14,16]} /><meshStandardMaterial color="#535b5c" metalness={0.65} roughness={0.45} /></mesh>)}
    {wheelPositions.map(([x,y,z],i)=><group key={i}>
      {anchors[i].map((start,j)=>{
        const [position,size,rotation]=beam(start,[x,y,z],0.045);
        return <mesh key={j} ref={e=>{struts.current[i*3+j]=e;}} position={position} rotation={rotation} scale={[1,size[1],1]} castShadow>
          <cylinderGeometry args={[j===2?0.032:0.023,j===2?0.032:0.023,1,10]} /><meshStandardMaterial color="#aeb5b7" metalness={0.72} roughness={0.48} />
        </mesh>;
      })}
      <group ref={e=>{mounts.current[i]=e;}} position={[x,y,z]}>
        <group ref={e=>{turns.current[i]=e;}}>
          <group ref={e=>{spins.current[i]=e;}}><MeshWheel /></group>
          <mesh position={[0,0.035,0]} castShadow><torusGeometry args={[R+0.085,0.035,8,28,Math.PI]} /><meshStandardMaterial color="#a5967d" metalness={0.3} roughness={0.78} /></mesh>
          <mesh position={[0,0.035,0]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[R+0.065,R+0.065,0.32,28,1,true,Math.PI/2,Math.PI]} /><meshStandardMaterial color="#a5967d" metalness={0.3} roughness={0.78} side={T.DoubleSide} /></mesh>
          <Blocks items={[-1,1].map(a=>[[a*(R+0.045),0.16,0],[0.18,0.035,0.31],[0,0,a*-0.25]] as Block)} color="#afa38d" metal={0.35} />
        </group>
      </group>
    </group>)}
    {/* Two fabric seats, safety rails and T-handle control console. */}
    {[-0.4,0.4].map(z=><group key={z}>
      <Blocks items={[
        beam([-0.75,0.72,z-0.23],[-0.75,1.43,z-0.23],0.026),
        beam([-0.75,0.72,z+0.23],[-0.75,1.43,z+0.23],0.026),
        [[-0.75,1.43,z],[0.035,0.035,0.51]],
      ]} color="#bac0bd" metal={0.7} />
      <mesh position={[-0.35,0.86,z]} castShadow><boxGeometry args={[0.68,0.035,0.48]} /><meshStandardMaterial color="#565853" roughness={0.98} bumpMap={maps.cloth} bumpScale={0.008} /></mesh>
      <mesh position={[-0.72,1.15,z]} rotation={[0,0,-0.1]} castShadow><boxGeometry args={[0.035,0.56,0.46]} /><meshStandardMaterial color="#65665e" roughness={0.95} bumpMap={maps.cloth} bumpScale={0.008} /></mesh>
      <Blocks items={Array.from({length:5},(_,i)=>[[-0.696,0.97+i*0.09,z],[0.012,0.014,0.43]] as Block)} color="#8f9082" />
      {crew&&<Astronaut pose="drive" scale={LUNAR_CREW_SCALE} position={[-0.34,-0.12,z]} rotation={[0,Math.PI/2,0]} />}
    </group>)}
    <Blocks items={[
      beam([0.12,0.73,0],[0.25,1.17,0],0.04), [[0.29,1.18,0],[0.15,0.055,0.3]],
      [[0.58,0.82,0],[0.48,0.1,0.3]],
    ]} color="#515a59" metal={0.5} />
    <mesh position={[0.59,0.88,0]} rotation={[0,0,0.15]}><boxGeometry args={[0.34,0.025,0.24]} /><meshStandardMaterial color="#d7d4bb" roughness={0.7} /></mesh>
    {/* Battery thermal blankets, sample stowage, antenna and television camera. */}
    <mesh position={[1.02,0.84,0]} castShadow><boxGeometry args={[0.55,0.25,1.12]} /><meshStandardMaterial color="#d4b56a" metalness={0.72} roughness={0.46} bumpMap={maps.foil} bumpScale={0.018} /></mesh>
    <Blocks items={[-0.4,0.4].map(z=>[[1.03,0.98,z],[0.49,0.018,0.028]] as Block)} color="#f0e2b6" metal={0.55} />
    <mesh position={[-1.11,0.98,0]} castShadow><boxGeometry args={[0.42,0.5,1.1]} /><meshStandardMaterial color="#d0cbbb" roughness={0.92} bumpMap={maps.cloth} bumpScale={0.012} /></mesh>
    <Blocks items={[-0.45,0,0.45].map(z=>[[-1.34,1.0,z],[0.025,0.45,0.025]] as Block)} color="#72776f" metal={0.5} />
    <Blocks items={[beam([1.08,0.98,-0.43],[1.08,2.12,-0.43],0.027),beam([0.93,0.97,0.48],[0.93,1.5,0.48],0.024)]} color="#c1c5bf" metal={0.75} />
    <group position={[1.08,2.14,-0.43]} rotation={[0,0,-0.55]}>
      <mesh rotation={[Math.PI/2,0,0]} castShadow><coneGeometry args={[0.31,0.12,32,1,true]} /><meshStandardMaterial color="#c8c5b4" metalness={0.68} roughness={0.5} side={T.DoubleSide} wireframe /></mesh>
      <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.31,0.014,6,32]} /><meshStandardMaterial color="#d2d5ce" metalness={0.7} roughness={0.4} /></mesh>
    </group>
    <mesh position={[1.0,1.54,0.48]} castShadow><boxGeometry args={[0.25,0.16,0.16]} /><meshStandardMaterial color="#b8bcb8" metalness={0.65} roughness={0.5} /></mesh>
    <mesh position={[1.14,1.54,0.48]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.055,0.055,0.07,16]} /><meshStandardMaterial color="#16222a" metalness={0.65} roughness={0.15} /></mesh>
  </group>;
}
