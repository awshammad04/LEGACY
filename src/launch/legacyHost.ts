import { useEffect, useState } from 'react';
import { getMission } from '../content/missions';
import { useGame } from '../game/store';
import { LaunchController } from './controller';

const missionId = 'm3-lost-rover';

function authorized() {
  const { view, state, missionId: current } = useGame.getState();
  return view === 'mission' && current === missionId && state?.stage === 'launch' && state.launched;
}

export function proceedFromLaunch() {
  if (!authorized()) return;
  const { stages } = getMission(missionId);
  useGame.getState().dispatch({ type: 'ADVANCE', to: stages[stages.indexOf('launch') + 1] ?? 'orbit' });
}

export function useMission03Launch() {
  const active = useGame((s) => s.view === 'mission' && s.missionId === missionId && s.state?.stage === 'launch' && s.state.launched);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const quality = useGame((s) => s.settings.quality);
  const [controller, setController] = useState<LaunchController | null>(null);
  useEffect(() => {
    if (!active) {
      setController(null);
      return;
    }
    const settings = useGame.getState().settings;
    const launch = new LaunchController({
      authorize: authorized,
      reduced: settings.reducedMotion,
      quality: settings.quality === 'low' ? 'low' : 'balanced',
      onComplete: proceedFromLaunch,
      onError: (error) => console.warn('[LEGACY launch]', error),
    });
    setController(launch);
    launch.start();
    return () => launch.dispose();
  }, [active]);
  useEffect(() => { controller?.setReduced(reduced); }, [controller, reduced]);
  useEffect(() => { controller?.setQuality(quality === 'low' ? 'low' : 'balanced'); }, [controller, quality]);
  return active ? controller : null;
}
