import * as T from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export function Atmosphere({ altitude }: { altitude: { value: number } }) {
  const material = useRef<T.ShaderMaterial>(null);
  useFrame(() => { material.current!.uniforms.altitude.value = altitude.value; });
  const scene = useThree((state) => state.scene);
  const fog = useMemo(() => new T.FogExp2('#c5a78d', 0.0021), []);
  useLayoutEffect(() => {
    const previous = scene.fog;
    scene.fog = fog;
    return () => { if (scene.fog === fog) scene.fog = previous; };
  }, [scene, fog]);
  return <mesh frustumCulled={false} renderOrder={-100}>
    <sphereGeometry args={[1, 32, 20]} />
    <shaderMaterial
      ref={material} side={T.BackSide} depthWrite={false} depthTest={false} uniforms={{ altitude }}
      vertexShader={`
        varying vec3 direction;
        void main() {
          direction=position;
          vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.);
          gl_Position=clip.xyww;
        }`}
      fragmentShader={`
        varying vec3 direction;
        uniform float altitude;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        float clouds(vec2 p) {
          return noise(p)*.53+noise(p*2.16)*.25+noise(p*4.1)*.14+noise(p*9.1)*.08;
        }
        void main() {
          vec3 d=normalize(direction);
          vec3 sun=normalize(vec3(-.67,.19,.67));
          float h=max(0.,d.y);
          float ray=max(0.,dot(d,sun));
          vec3 low=mix(vec3(.65,.41,.26),vec3(.17,.27,.43),pow(h,.46));
          low=mix(low,vec3(.043,.107,.215),smoothstep(.27,.96,h));
          low+=vec3(.49,.22,.06)*pow(ray,10.)*exp(-2.1*h);
          vec2 p=d.xz/max(.045,h)*vec2(2.,5.);
          float veil=smoothstep(.49,.76,clouds(p+vec2(4.5,15.)))*smoothstep(.02,.11,h);
          low=mix(low,mix(vec3(.69,.47,.35),vec3(.24,.30,.42),h),veil*.57);
          vec3 high=mix(vec3(.09,.19,.33),vec3(.002,.004,.015),smoothstep(0.,.58,h));
          vec2 cell=d.xz / max(.22,h+.29) * 180.;
          float star=step(.993,hash(floor(cell)))*(1.-smoothstep(.015,.16,length(fract(cell)-.5)));
          high+=star*.5*smoothstep(.11,.49,h);
          vec3 c=mix(low,high,altitude);
          c+=vec3(1.8,1.08,.53)*smoothstep(.9990,.99953,ray);
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`}
    />
  </mesh>;
}
