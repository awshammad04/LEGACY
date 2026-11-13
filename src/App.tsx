import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useGame } from './game/store';
import { CruiseScene, HQScene, LaunchScene, MarsOrbitScene, ObserveScene, OrbitScene, WorkshopScene } from './scenes/scenes';
import { SurfaceScene } from './scenes/surface';
import { ExploreScene } from './scenes/explore';
import { getMission } from './content/missions';
import { TopBar } from './ui/TopBar';
import { Subtitles } from './ui/Subtitles';
import { LearnCardModal } from './ui/common';
import { SettingsModal } from './ui/SettingsModal';
import { MissionPreviewModal } from './ui/HomeScreen';
import { MenuScreen } from './ui/MenuScreen';
import { MenuScene } from './scenes/menu';
import { MissionScreens } from './ui/MissionScreens';
import { ArchiveScreen, ArchiveMemoryModal } from './ui/ArchiveScreen';
import { CreditsScreen } from './ui/CreditsScreen';

/** Keeps a 3D scene error from taking down the whole game; resets when the stage changes. */
class SceneBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[LEGACY] scene error recovered', err);
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SceneRouter() {
  const view = useGame((s) => s.view);
  const stage = useGame((s) => s.state?.stage);
  const missionId = useGame((s) => s.missionId);
  if (view === 'home') return <MenuScene />;
  if (view !== 'mission' || !stage) return <HQScene />;
  switch (stage) {
    case 'quizPre':
      return <HQScene />;
    case 'briefing':
      return <HQScene showMars={missionId === 'm2-martian-mystery' || missionId === 'm3-lost-rover'} />;
    case 'workshop':
    case 'review':
      return <WorkshopScene />;
    case 'launch':
      return <LaunchScene />;
    case 'orbit':
      return <OrbitScene />;
    case 'landingSite':
      return <MarsOrbitScene />;
    case 'surface':
      return missionId && getMission(missionId).sites ? <ExploreScene /> : <SurfaceScene />;
    case 'evidence':
    case 'report':
      return <SurfaceScene focusRock />;
    case 'cruise':
      return <CruiseScene />;
    case 'observe':
      return <ObserveScene />;
    case 'opsPreview':
      return missionId === 'm3-lost-rover' ? <MarsOrbitScene /> : missionId === 'm4-cosmic-photographer' ? <OrbitScene /> : <HQScene />;
    default:
      return <HQScene showMars />;
  }
}

export function App() {
  const view = useGame((s) => s.view);
  const quality = useGame((s) => s.settings.quality);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const sceneKey = useGame((s) => `${s.view}:${s.missionId ?? ''}:${s.state?.stage ?? ''}`);
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);

  return (
    <div className="app">
      <div className="canvas-wrap" aria-hidden="true">
        <Canvas
          shadows={quality === 'high'}
          dpr={quality === 'high' ? [1, 1.75] : [0.75, 1]}
          camera={{ fov: 45, near: 0.1, far: 4000, position: [0, 0.3, 8.5] }}
          gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
        >
          <SceneBoundary resetKey={sceneKey}>
            <Suspense fallback={null}>
              <SceneRouter />
            </Suspense>
          </SceneBoundary>
          {quality === 'high' && (
            <EffectComposer multisampling={4}>
              <Bloom intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
              <Vignette offset={0.32} darkness={0.45} />
            </EffectComposer>
          )}
        </Canvas>
      </div>
      <div className="vignette" />
      <div className="overlay">
        {view !== 'home' && <TopBar />}
        {view === 'home' && <MenuScreen />}
        {view === 'mission' && <MissionScreens />}
        {view === 'archive' && <ArchiveScreen />}
        {view === 'credits' && <CreditsScreen />}
      </div>
      <Subtitles />
      <LearnCardModal />
      <SettingsModal />
      <MissionPreviewModal />
      <ArchiveMemoryModal />
    </div>
  );
}
