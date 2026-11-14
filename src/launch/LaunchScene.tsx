import { Component, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as T from 'three';
import { Atmosphere } from './Atmosphere';
import { CameraDirector, flightAt } from './camera';
import type { LaunchController } from './controller';
import { ExhaustCloud, Jets } from './Exhaust';
import { Facility } from './Facility';
import { Vehicle } from './Vehicle';
import type { Tier } from '../core/types';
import { LAUNCH_MISSIONS, type LaunchIdentity } from './missions';

interface CinematicProps { launch: LaunchController; identity?: LaunchIdentity; tier?: Tier }

function World({ launch, identity, tier }: CinematicProps) {
  const rocket = useRef<T.Group>(null);
  const glow = useRef<T.PointLight>(null);
  const first = useRef<T.Group>(null), second = useRef<T.Group>(null), third = useRef<T.Group>(null);
  const director = useMemo(() => new CameraDirector(), []);
  const altitude = useMemo(() => ({ value: 0 }), []);
  const quality = useSyncExternalStore(launch.subscribe, () => launch.getSnapshot().quality);
  useLayoutEffect(() => {
    const { shadow } = glow.current!;
    return () => shadow.dispose();
  }, []);

  useFrame(({ camera, size, scene }, dt) => {
    launch.advance(dt);
    const t = launch.time;
    const { camera: view, reduced, status, angle } = launch.getSnapshot();
    const { x, y, tilt } = flightAt(t);
    rocket.current!.position.set(x,y,0);
    rocket.current!.rotation.z = tilt;
    const release = T.MathUtils.smoothstep(t,6.1,8.7);
    first.current!.rotation.y = release*1.27;
    second.current!.rotation.y = release*1.37;
    third.current!.rotation.y = release*1.51;
    altitude.value = T.MathUtils.smoothstep(t,15.8,25);
    if (scene.fog instanceof T.FogExp2) scene.fog.density = 0.0021 - altitude.value*0.0011;
    glow.current!.intensity = T.MathUtils.smoothstep(t,8,8.68)*690*(1-0.32*altitude.value)*(0.9+0.1*Math.sin(t*48));
    const { eye, aim } = director.update(t,status === 'paused' ? 0 : dt,view,reduced,angle,size.width/size.height);
    camera.position.copy(eye);
    camera.lookAt(aim);
  }, -5);

  return <>
    <Atmosphere altitude={altitude} />
    <hemisphereLight args={['#b5caf8','#6e4633',2.0]} />
    <directionalLight position={[-49,28,38]} intensity={3} color="#ffdeb1" castShadow={quality === 'balanced'}
      shadow-mapSize={[1024,1024]} shadow-camera-left={-39} shadow-camera-right={39}
      shadow-camera-top={44} shadow-camera-bottom={-30} shadow-camera-near={0.5} shadow-camera-far={138}
      shadow-normalBias={0.12} />
    <directionalLight position={[20,9,-38]} intensity={1.35} color="#93b5e5" />
    <Facility arms={[first,second,third]} />
    <group ref={rocket} position={[0,2.49,0]}>
      <Vehicle identity={identity} tier={tier} />
      <Jets launch={launch} />
      <pointLight ref={glow} position={[0,-1.1,0]} color="#ff9a48" distance={34} decay={2} intensity={0} />
    </group>
    <ExhaustCloud launch={launch} count={quality === 'balanced' ? 364 : 148} />
  </>;
}

class LaunchBoundary extends Component<{ launch: LaunchController; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { this.props.launch.fail(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function CinematicLaunch({ launch, identity = LAUNCH_MISSIONS['m3-lost-rover'], tier = 'basic' }: CinematicProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  useLayoutEffect(() => {
    const position = camera.position.clone();
    const orientation = camera.quaternion.clone();
    const perspective = camera instanceof T.PerspectiveCamera ? camera : null;
    const far = perspective?.far;
    const near = perspective?.near;
    if (perspective) {
      perspective.far = 3700;
      perspective.near = 0.5;
      perspective.updateProjectionMatrix();
    }
    const lost = () => launch.fail(new Error('WebGL context lost'));
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      camera.position.copy(position);
      camera.quaternion.copy(orientation);
      if (perspective && far !== undefined && near !== undefined) {
        perspective.far = far;
        perspective.near = near;
        perspective.updateProjectionMatrix();
      }
    };
  }, [camera, gl, launch]);
  return <LaunchBoundary launch={launch}><World launch={launch} identity={identity} tier={tier} /></LaunchBoundary>;
}
