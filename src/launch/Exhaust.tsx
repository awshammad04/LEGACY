import { useEffect, useMemo, useRef } from 'react';
import * as T from 'three';
import { useFrame } from '@react-three/fiber';
import type { LaunchController } from './controller';
import { engines } from './Vehicle';
import { random } from './geometry';
import { flightAt } from './camera';

export function Jets({ launch }: { launch: LaunchController }) {
  const group = useRef<T.Group>(null);
  const inputs = useMemo(() => ({ clock: { value: 0 }, power: { value: 0 } }), []);
  useFrame(() => {
    const t = launch.time;
    const thrust = T.MathUtils.smoothstep(t, 8, 8.8);
    group.current!.visible = thrust > 0.001;
    group.current!.position.y = -0.04;
    group.current!.scale.y = (0.3 + thrust * 0.88) * (1 + T.MathUtils.smoothstep(t, 14, 24) * 0.45);
    group.current!.children.forEach((child) => {
      const material = (child as T.Mesh<T.CylinderGeometry, T.ShaderMaterial>).material;
      material.uniforms.clock.value = t;
      material.uniforms.power.value = thrust;
    });
  });
  return <group ref={group} visible={false}>
    {engines.map(([x, , z], i) => <mesh key={i} position={[x,-3.19,z]}>
      <cylinderGeometry args={[0.31, 0.76, 6.5, 18, 10, true]} />
      <shaderMaterial uniforms={inputs} transparent side={T.DoubleSide} depthWrite={false} blending={T.AdditiveBlending}
        vertexShader={`
          varying vec2 v;
          void main(){v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
        `}
        fragmentShader={`
          varying vec2 v;
          uniform float clock, power;
          void main(){
            float age=1.-v.y;
            float sw=sin(45.*age+5.*sin(v.x*37.)-clock*65.);
            float band=pow(.5+.5*cos(47.*age),6.);
            vec3 col=mix(vec3(1.,.26,.031),vec3(1.,.91,.65),exp(-3.3*age)*.77+band*.21);
            float opacity=(1.-smoothstep(.43,1.,age))*(.62+sw*.16)*power;
            gl_FragColor=vec4(col,opacity);
            #include <colorspace_fragment>
          }
        `} />
    </mesh>)}
  </group>;
}

export function ExhaustCloud({ launch, count }: { launch: LaunchController; count: number }) {
  const p = useRef<T.Points>(null);
  const sceneData = useMemo(() => {
    const rng = random(3559);
    const samples = Array.from({length: count}, () => [rng(), rng(), rng(), rng()]);
    const geometry = new T.BufferGeometry();
    for (const [key, size] of [['position',3],['amount',1],['diameter',1],['warmth',1],['seed',1]] as const) {
      geometry.setAttribute(key, new T.BufferAttribute(new Float32Array(count*size), size).setUsage(T.DynamicDrawUsage));
    }
    samples.forEach((sample, i) => geometry.attributes.seed.setX(i, sample[3]));
    return { samples, geometry };
  }, [count]);
  useEffect(() => () => sceneData.geometry.dispose(), [sceneData]);

  useFrame(({ gl, size }) => {
    const { samples, geometry } = sceneData;
    const { position, amount, diameter, warmth } = geometry.attributes;
    const t = launch.time;
    (p.current!.material as T.ShaderMaterial).uniforms.scale.value = size.height * gl.getPixelRatio();
    const plumeCount = Math.floor(count * 0.46);
    const groundCount = Math.floor(count * 0.90);
    samples.forEach(([a,b,c,d], i) => {
      const theta = b * Math.PI * 2;
      if (i < plumeCount) {
        const age = (t + a * 2.8) % 2.8;
        const emission = t - age;
        const flight = flightAt(emission);
        const radius = 0.65 + age * (0.35 + d * 1.1);
        position.setXYZ(i, flight.x + Math.cos(theta)*radius*c + age*flight.tilt*12, Math.max(0.6, flight.y - 1.2 - age*(8+d*9)), Math.sin(theta)*radius*c);
        diameter.setX(i, 0.8 + age*1.65 + d*1.8);
        amount.setX(i, emission < 8 || flight.y - age*9 < -0.5 ? 0 : (1-age/2.8)*0.45);
        warmth.setX(i, Math.max(0,1-age*1.75));
      } else if (i < groundCount) {
        const age = (t - 8 + a * 5.2) % 5.2;
        const emission = t - age;
        const r = 2.7 + age*(2.15+d*4.35);
        position.setXYZ(i, Math.cos(theta)*r+age*0.9, 0.7+age*(0.3+c*0.91), Math.sin(theta)*r);
        diameter.setX(i, 1.6 + age*1.7 + c*2.1);
        amount.setX(i, t < 8 || emission < 8 || emission > 13.2 ? 0 : T.MathUtils.smoothstep(age,0,0.38) * (1-age/5.2)*0.74);
        warmth.setX(i, Math.max(0,1-age*0.52)*0.59);
      } else {
        const age = (t * 0.48 + a) % 1;
        position.setXYZ(i, 1.43+age*(2.6+d), 23.95-age*0.68 + Math.sin(theta)*age*0.44, 0.22+Math.cos(theta)*age*0.96);
        diameter.setX(i, 0.25+age*1.05+c*.23);
        amount.setX(i, t > 8 ? 0 : Math.sin(age*Math.PI)*.13);
        warmth.setX(i, 0);
      }
    });
    position.needsUpdate = amount.needsUpdate = diameter.needsUpdate = warmth.needsUpdate = true;
  });
  return <points ref={p} geometry={sceneData.geometry} frustumCulled={false} renderOrder={3}>
    <shaderMaterial transparent depthWrite={false} uniforms={{ scale: { value: 800 } }}
      vertexShader={`
        attribute float amount, diameter, warmth, seed;
        uniform float scale;
        varying vec3 data;
        void main(){
          vec4 view=modelViewMatrix*vec4(position,1.);
          data=vec3(amount,warmth,seed);
          gl_Position=projectionMatrix*view;
          gl_PointSize=amount < .002 ? 1. : clamp(diameter*scale/max(1.,-view.z),2.,210.);
        }
      `}
      fragmentShader={`
        varying vec3 data;
        void main(){
          vec2 p=gl_PointCoord*2.-1.;
          float wave=sin(p.x*9.+data.z*42.)*sin(p.y*8.+data.z*25.);
          float dist=length(p)+wave*.095;
          float edge=(1.-smoothstep(.08,1.,dist))*data.x;
          if(edge < .006) discard;
          vec3 shade=mix(vec3(.24,.22,.21),vec3(.71,.68,.59),(.53+p.y*.21+wave*.17));
          shade=mix(shade,vec3(1.,.39,.075),data.y*.76);
          gl_FragColor=vec4(shade,edge);
          #include <colorspace_fragment>
        }`}
    />
  </points>;
}
