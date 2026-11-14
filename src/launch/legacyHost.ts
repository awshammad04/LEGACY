import { useEffect, useState } from 'react';
import { getMission } from '../content/missions';
import type { MissionId } from '../core/types';
import { useGame } from '../game/store';
import { LaunchController } from './controller';

function authorized(missionId: MissionId, seed: number) {
  const { view, state, missionId: current } = useGame.getState();
  return view === 'mission' && current === missionId && state?.seed === seed && state.stage === 'launch' && state.launched;
}

export function proceedFromLaunch(missionId: MissionId, seed: number) {
  if (!authorized(missionId, seed)) return;
  const { stages } = getMission(missionId);
  useGame.getState().dispatch({ type: 'ADVANCE', to: stages[stages.indexOf('launch') + 1] ?? 'orbit' });
}

export function useMissionLaunch() {
  const missionId = useGame((s) => s.missionId);
  const seed = useGame((s) => s.seed);
  const active = useGame((s) => s.view === 'mission' && s.state?.stage === 'launch' && s.state.launched);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const quality = useGame((s) => s.settings.quality);
  const [session, setSession] = useState<{ missionId: MissionId; seed: number; controller: LaunchController } | null>(null);
  useEffect(() => {
    if (!active || !missionId) {
      setSession(null);
      return;
    }
    const settings = useGame.getState().settings;
    const launch = new LaunchController({
      authorize: () => authorized(missionId, seed),
      reduced: settings.reducedMotion,
      quality: settings.quality === 'low' ? 'low' : 'balanced',
      onComplete: () => proceedFromLaunch(missionId, seed),
      onError: (error) => console.warn('[LEGACY launch]', error),
    });
    setSession({ missionId, seed, controller: launch });
    launch.start();
    return () => launch.dispose();
  }, [active, missionId, seed]);
  const controller = active && session && session.missionId === missionId && session.seed === seed ? session.controller : null;
  useEffect(() => { controller?.setReduced(reduced); }, [controller, reduced]);
  useEffect(() => { controller?.setQuality(quality === 'low' ? 'low' : 'balanced'); }, [controller, quality]);
  return controller;
}
