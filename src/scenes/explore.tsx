import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextSprite } from './TextSprite';
import { getMission } from '../content/missions';
import { computeMetrics } from '../core/evaluate';
import { batteryFloor, driveCost, isObstacle, rockField, roverTopSpeed, siteDistance, WORLD_LIMIT, type Rock } from '../core/explore';
import { heightAt } from '../core/terrain';
import type { ExploreSite, MissionDefinition } from '../core/types';
import { useGame, useT, useUi } from '../game/store';
import { useLive } from '../game/live';
import { sfx } from '../game/audio';
import { MarsSky, Terrain, TargetRock } from './surface';
import { RoverModel } from './models';

/* ------------------------------------------------------------------ */
/* Keyboard input                                                      */
/* ------------------------------------------------------------------ */

const keys = new Set<string>();
function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      keys.clear();
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Rocks (instanced, shared with collision)                            */
/* ------------------------------------------------------------------ */

function RockField({ rocks }: { rocks: Rock[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    rocks.forEach((r, i) => {
      o.position.set(r.x, r.y, r.z);
      o.rotation.set(r.rx, r.ry, r.rz);
      o.scale.set(r.s, r.s * r.sy, r.s * r.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [rocks]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8a5236" roughness={0.92} flatShading />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Sites                                                               */
/* ------------------------------------------------------------------ */

function Beacon({ site, found, done }: { site: ExploreSite; found: boolean; done: boolean }) {
  const t = useT();
  const ref = useRef<THREE.Mesh>(null);
  const y = heightAt(site.pos[0], site.pos[1]);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = (done ? 0.08 : 0.16) + Math.sin(clock.elapsedTime * 2 + site.pos[0]) * 0.05;
  });
  const color = done ? '#4ade80' : found ? '#5ad1ff' : '#ffd27a';
  return (
    <group position={[site.pos[0], y, site.pos[1]]}>
      <mesh ref={ref} position={[0, 30, 0]}>
        <cylinderGeometry args={[1.4, 2.6, 60, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <ringGeometry args={[site.radius - 0.6, site.radius, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <TextSprite position={[0, 9, 0]} height={found ? 3.2 : 2.6} border={color} text={found ? `${done ? '✓ ' : ''}${t(site.name)}` : '?'} />
    </group>
  );
}

function LayersProp({ site }: { site: ExploreSite }) {
  const colors = ['#9a5a3a', '#b8744a', '#7f4a30', '#c88a5a', '#a0623e', '#8d5636'];
  return (
    <group position={[site.pos[0], heightAt(site.pos[0], site.pos[1]), site.pos[1] - 12]} rotation={[0.18, 0.4, 0]}>
      {colors.map((c, i) => (
        <mesh key={i} position={[0, i * 0.9 + 0.4, -i * 0.25]} castShadow receiveShadow>
          <boxGeometry args={[18 - i * 1.2, 0.9, 5]} />
          <meshStandardMaterial color={c} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function DustDevil({ site }: { site: ExploreSite }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const tt = clock.elapsedTime * 0.15;
    if (!g.current) return;
    const x = site.pos[0] + Math.cos(tt) * 24;
    const z = site.pos[1] + Math.sin(tt * 1.3) * 18;
    g.current.position.set(x, heightAt(x, z), z);
    g.current.rotation.y = clock.elapsedTime * 3;
  });
  return (
    <group ref={g}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 7 + i * 5, 0]}>
          <cylinderGeometry args={[2 + i * 1.6, 1 + i * 1.2, 8, 20, 1, true]} />
          <meshBasicMaterial color="#d9a97c" transparent opacity={0.22 - i * 0.05} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function DepotProp({ site, placed }: { site: ExploreSite; placed: boolean }) {
  const y = heightAt(site.pos[0], site.pos[1]);
  return (
    <group position={[site.pos[0], y + 0.15, site.pos[1]]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[i * 1.6 - 3.2, 0, (i % 2) * 1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 1.1, 10]} />
          <meshStandardMaterial color="#e8eef6" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
      {placed && (
        <mesh position={[0, 0, 3]} rotation={[0, 0.5, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 1.1, 10]} />
          <meshStandardMaterial color="#5ad1ff" emissive="#1a6a8a" metalness={0.6} roughness={0.25} />
        </mesh>
      )}
    </group>
  );
}

function ScanBeam({ mission }: { mission: MissionDefinition }) {
  const scan = useLive((s) => s.scan);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const sc = useLive.getState().scan;
    const live = sc && performance.now() - sc.at < 1600;
    ref.current.visible = !!live;
    if (!live || !sc) return;
    const site = mission.sites?.find((x) => x.id === sc.siteId);
    if (!site) return;
    const [px, pz] = useLive.getState().pos;
    const a = new THREE.Vector3(px, heightAt(px, pz) + 3, pz);
    const b = new THREE.Vector3(site.pos[0], heightAt(site.pos[0], site.pos[1]) + 1, site.pos[1]);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    ref.current.position.copy(mid);
    ref.current.scale.set(1, a.distanceTo(b), 1);
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(performance.now() / 60) * 0.25;
  });
  return (
    <mesh ref={ref} visible={!!scan}>
      <cylinderGeometry args={[0.12, 0.12, 1, 8, 1, true]} />
      <meshBasicMaterial color="#7fe3ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Drivable rover + follow camera                                      */
/* ------------------------------------------------------------------ */

function buildGrid(rocks: Rock[]) {
  const grid = new Map<string, Rock[]>();
  for (const r of rocks) {
    if (!isObstacle(r)) continue;
    const k = `${Math.floor(r.x / 20)},${Math.floor(r.z / 20)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(r);
  }
  return grid;
}

function DrivableRover({ mission, rocks }: { mission: MissionDefinition; rocks: Rock[] }) {
  useKeyboard();
  const state = useGame((s) => s.state)!;
  const dispatch = useGame((s) => s.dispatch);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const m = useMemo(() => computeMetrics(mission, state.design), [mission, state.design]);
  const grid = useMemo(() => buildGrid(rocks), [rocks]);
  const g = useRef<THREE.Group>(null);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const { camera } = useThree();
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const sim = useRef({
    x: state.ops.pos[0],
    z: state.ops.pos[1],
    h: state.ops.heading,
    v: 0,
    pending: { dist: 0, slope: 0, boost: 0, bumps: 0 },
    lastCommit: performance.now(),
    bumpCooldown: 0,
    lastWarn: 0,
    lastPublish: 0,
    initialized: false,
    lastUser: 0,
    committed: [state.ops.pos[0], state.ops.pos[1]] as [number, number],
  });

  // Snap to reducer position when it changes outside driving (load, rewind, replay).
  useEffect(() => {
    const s = sim.current;
    const external = Math.hypot(s.committed[0] - state.ops.pos[0], s.committed[1] - state.ops.pos[1]) > 0.5;
    if (external) {
      s.x = state.ops.pos[0];
      s.z = state.ops.pos[1];
      s.h = state.ops.heading;
      s.v = 0;
      s.pending = { dist: 0, slope: 0, boost: 0, bumps: 0 };
      s.committed = [state.ops.pos[0], state.ops.pos[1]];
      s.initialized = false;
    }
  }, [state.ops.pos, state.ops.heading]);

  // Face the rock on a fresh landing.
  useEffect(() => {
    const s = sim.current;
    const rock = mission.sites?.find((x) => x.kind === 'rock');
    if (state.ops.distanceU === 0 && rock) s.h = Math.atan2(-(rock.pos[1] - s.z), rock.pos[0] - s.x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mark = () => (sim.current.lastUser = performance.now());
    window.addEventListener('pointerdown', mark);
    window.addEventListener('wheel', mark);
    return () => {
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('wheel', mark);
    };
  }, []);

  const commit = () => {
    const s = sim.current;
    const p = s.pending;
    if (p.dist <= 0) return;
    s.committed = [s.x, s.z];
    dispatch({ type: 'DRIVE', dist: p.dist, slopeAvg: p.slope / p.dist, boostFrac: p.boost / p.dist, bumps: p.bumps, pos: [s.x, s.z], heading: s.h });
    s.pending = { dist: 0, slope: 0, boost: 0, bumps: 0 };
    s.lastCommit = performance.now();
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = sim.current;
    const live = useLive.getState();
    const st = useGame.getState().state!;
    const ui = useUi.getState();
    const paused = !!st.pendingEvent || (st.evidence.alertShown && !st.evidence.alertChoice) || live.panel !== 'none' || !!ui.learnCard || ui.settingsOpen || st.stage !== 'surface';

    const t = live.touch;
    const fwd = !paused && (keys.has('KeyW') || keys.has('ArrowUp') || t.fwd);
    const back = !paused && (keys.has('KeyS') || keys.has('ArrowDown') || t.back);
    const left = !paused && (keys.has('KeyA') || keys.has('ArrowLeft') || t.left);
    const right = !paused && (keys.has('KeyD') || keys.has('ArrowRight') || t.right);
    const boost = !paused && (keys.has('ShiftLeft') || keys.has('ShiftRight') || t.boost);
    const brake = keys.has('Space');

    // Battery check (reducer battery minus energy not yet committed)
    const pendingWh = driveCost(m, s.pending.dist, s.pending.dist ? s.pending.slope / s.pending.dist : 0, s.pending.dist ? s.pending.boost / s.pending.dist : 0).energyWh;
    const empty = st.ops.batteryWh - pendingWh <= batteryFloor(st.ops) + 1;

    const top = roverTopSpeed(m, st.ops.wheelHealth) * (boost ? 1.5 : 1);
    const throttle = empty ? 0 : (fwd ? 1 : 0) - (back ? 0.6 : 0);
    if (throttle !== 0) s.v += throttle * 6 * dt;
    else s.v *= Math.pow(0.04, dt);
    if (brake) s.v *= Math.pow(0.001, dt);
    s.v = Math.max(-top * 0.5, Math.min(top, s.v));
    if (Math.abs(s.v) < 0.02) s.v = 0;
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    s.h += steer * dt * (1.6 - Math.min(0.6, Math.abs(s.v) * 0.06)) * (s.v < -0.1 ? -1 : 1);

    let blocked: 'slope' | 'battery' | null = empty && (fwd || back) ? 'battery' : null;
    if (s.v !== 0) {
      const dx = Math.cos(s.h) * s.v * dt;
      const dz = -Math.sin(s.h) * s.v * dt;
      let nx = s.x + dx;
      let nz = s.z + dz;
      const step = Math.hypot(dx, dz);
      const rise = heightAt(nx, nz) - heightAt(s.x, s.z);
      const slope = (Math.atan2(Math.abs(rise), Math.max(step, 1e-4)) * 180) / Math.PI;
      if (rise > 0 && slope > m.slopeLimitDeg) {
        s.v = 0;
        blocked = 'slope';
      } else {
        nx = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nx));
        nz = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nz));
        // Rock collisions
        const gx = Math.floor(nx / 20);
        const gz = Math.floor(nz / 20);
        for (let ix = gx - 1; ix <= gx + 1; ix++)
          for (let iz = gz - 1; iz <= gz + 1; iz++)
            for (const r of grid.get(`${ix},${iz}`) ?? []) {
              const rr = r.s * 0.9 + 1.5;
              const ddx = nx - r.x;
              const ddz = nz - r.z;
              const d = Math.hypot(ddx, ddz);
              if (d < rr && d > 1e-4) {
                nx = r.x + (ddx / d) * rr;
                nz = r.z + (ddz / d) * rr;
                if (s.bumpCooldown <= 0 && Math.abs(s.v) > 1.5) {
                  s.pending.bumps++;
                  s.bumpCooldown = 1;
                  sfx('warn');
                }
                s.v *= 0.3;
              }
            }
        const moved = Math.hypot(nx - s.x, nz - s.z);
        s.pending.dist += moved;
        s.pending.slope += slope * moved;
        if (boost) s.pending.boost += moved;
        s.x = nx;
        s.z = nz;
      }
    }
    s.bumpCooldown -= dt;

    // Commit drive segments to the deterministic simulation
    const now = performance.now();
    if (s.pending.dist > 0 && (now - s.lastCommit > 1100 || (s.v === 0 && now - s.lastCommit > 250))) commit();

    // Rover pose
    if (g.current) {
      const y = heightAt(s.x, s.z);
      g.current.position.set(s.x, y, s.z);
      const e = 1.5;
      const n = new THREE.Vector3(heightAt(s.x - e, s.z) - heightAt(s.x + e, s.z), 2 * e, heightAt(s.x, s.z - e) - heightAt(s.x, s.z + e)).normalize();
      const tilt = new THREE.Quaternion().setFromUnitVectors(up, n);
      const yaw = new THREE.Quaternion().setFromAxisAngle(up, s.h);
      g.current.quaternion.slerp(tilt.multiply(yaw), Math.min(1, dt * 8));
    }

    // Follow camera: carry the camera with the rover; drift behind it while driving
    if (controls?.target) {
      const target = new THREE.Vector3(s.x, heightAt(s.x, s.z) + 2.2, s.z);
      if (!s.initialized) {
        controls.target.copy(target);
        camera.position.set(s.x - Math.cos(s.h) * 20, target.y + 6.5, s.z + Math.sin(s.h) * 20);
        s.initialized = true;
      }
      const delta = target.clone().sub(controls.target);
      controls.target.add(delta);
      camera.position.add(delta);
      if (Math.abs(s.v) > 1 && now - s.lastUser > 1500 && !reduced) {
        const off = camera.position.clone().sub(controls.target);
        const r = Math.hypot(off.x, off.z);
        const cur = Math.atan2(off.z, off.x);
        const want = Math.atan2(Math.sin(s.h), -Math.cos(s.h));
        let da = want - cur;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const na = cur + da * Math.min(1, dt * 1.2);
        camera.position.set(controls.target.x + Math.cos(na) * r, camera.position.y, controls.target.z + Math.sin(na) * r);
      }
    }

    // Publish telemetry for the HUD (~10 Hz)
    if (now - s.lastPublish > 100) {
      s.lastPublish = now;
      let nearSiteId: string | undefined;
      for (const site of mission.sites ?? []) if (siteDistance(site, [s.x, s.z]) <= site.radius + 5) nearSiteId = site.id;
      if (blocked && now - s.lastWarn > 1500) s.lastWarn = now;
      useLive.getState().set({ pos: [s.x, s.z], heading: s.h, speed: Math.abs(s.v), pendingWh, nearSiteId, blocked, moved: live.moved || s.pending.dist > 0 || st.ops.distanceU > 0 });
    }
  });

  // Commit anything pending when leaving the stage
  useEffect(() => () => commit(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={g}>
      <RoverModel mission={mission} design={state.design} scale={1.4} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function ExploreScene() {
  const state = useGame((s) => s.state)!;
  const missionId = useGame((s) => s.missionId)!;
  const quality = useGame((s) => s.settings.quality);
  const mission = getMission(missionId);
  const rocks = useMemo(() => rockField(mission), [mission]);
  const sun = useMemo(() => new THREE.Vector3(-0.6, 0.55, -0.4), []);
  const storm = state.ops.sol < state.ops.dustUntil;
  const shadowTarget = useRef<THREE.Object3D>(new THREE.Object3D());
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const [x, z] = useLive.getState().pos;
    if (light.current) {
      light.current.position.set(x + sun.x * 200, heightAt(x, z) + sun.y * 200, z + sun.z * 200);
      shadowTarget.current.position.set(x, heightAt(x, z), z);
      light.current.target = shadowTarget.current;
      shadowTarget.current.updateMatrixWorld();
    }
  });
  const done = (site: ExploreSite) => site.observations.every((id) => state.evidence.observations.some((o) => o.id === id));
  return (
    <>
      <MarsSky sun={sun} />
      <fog attach="fog" args={[storm ? '#9a6a48' : '#c9946b', storm ? 40 : 140, storm ? 260 : 700]} />
      <hemisphereLight args={['#f0c9a0', '#3a2015', storm ? 0.35 : 0.55]} />
      <directionalLight
        ref={light}
        intensity={storm ? 0.9 : 2.1}
        color="#fff0dc"
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={600}
      />
      <primitive object={shadowTarget.current} />
      <Terrain onPick={() => undefined} />
      <RockField rocks={rocks} />
      {(mission.sites ?? []).map((site) => (
        <group key={site.id}>
          <Beacon site={site} found={state.ops.sitesFound.includes(site.id)} done={done(site)} />
          {site.kind === 'rock' && <TargetRock pos={site.pos} focus />}
          {site.kind === 'layers' && <LayersProp site={site} />}
          {site.kind === 'weather' && <DustDevil site={site} />}
          {site.kind === 'depot' && <DepotProp site={site} placed={state.evidence.observations.some((o) => o.id === 'obs-depot')} />}
        </group>
      ))}
      <ScanBeam mission={mission} />
      <DrivableRover mission={mission} rocks={rocks} />
      <OrbitControls makeDefault enablePan={false} minDistance={10} maxDistance={70} maxPolarAngle={Math.PI / 2.08} minPolarAngle={0.25} enableDamping dampingFactor={0.12} />
    </>
  );
}
