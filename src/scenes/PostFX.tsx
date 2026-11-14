import type { ReactElement } from 'react';
import { useGame } from '../game/store';
import { Bloom, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

/**
 * Cinematic post-processing (high quality only): ambient occlusion where there is
 * ground to occlude, filmic tone mapping, bloom, subtle grain and vignette.
 */
export function PostFX() {
  const view = useGame((s) => s.view);
  const stage = useGame((s) => s.state?.stage);
  const onMenu = view === 'home';
  const ground = view === 'mission' && (stage === 'surface' || stage === 'workshop' || stage === 'review' || stage === 'evidence' || stage === 'report');
  const workshop = stage === 'workshop' || stage === 'review';
  const fx: ReactElement[] = [];
  if (ground) fx.push(<N8AO key="ao" aoRadius={workshop ? 0.9 : 2.4} distanceFalloff={1.2} intensity={workshop ? 2 : 2.6} quality="medium" halfRes />);
  fx.push(<Bloom key="bloom" intensity={onMenu ? 0.7 : 0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />);
  fx.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
  fx.push(<SMAA key="smaa" />);
  fx.push(<Noise key="grain" opacity={0.04} blendFunction={BlendFunction.OVERLAY} premultiply />);
  fx.push(<Vignette key="vig" offset={0.3} darkness={0.5} />);
  return (
    <EffectComposer key={fx.map((e) => e.key).join('|')} multisampling={0} enableNormalPass={false}>
      {fx}
    </EffectComposer>
  );
}
