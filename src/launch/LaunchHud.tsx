import { useRef, useState, useSyncExternalStore } from 'react';
import { marks, phaseAt, type CameraView, type LaunchController, type Phase, type Quality } from './controller';
import { useLaunchAudio } from './audio';
import './launch.css';

const labels: Record<Phase, [string, string]> = {
  establish: ['Pad operations', 'Control to Pioneer. The rover is secured. We’re standing by for terminal count.'],
  countdown: ['Terminal count', 'Pioneer, you are go for launch. Stand by for engine start.'],
  ignition: ['Engine ignition', 'Main engines are up. Hold the vehicle on the mount.'],
  liftoff: ['Liftoff', 'Liftoff. Pioneer is clear of the tower and climbing.'],
  ascent: ['Atmospheric ascent', 'Pioneer is climbing away from the range. Stand by for flight handoff.'],
};
const views: CameraView[] = ['Director', 'Pad', 'Vehicle', 'Engines', 'Inspect'];
type Translate = (value: string) => string;

export function LaunchHud({ launch, demo = false, subtitles: initialCaptions = true, translate = (value) => value, allowSkip = true, onRecover }: {
  launch: LaunchController;
  demo?: boolean;
  subtitles?: boolean;
  translate?: Translate;
  allowSkip?: boolean;
  onRecover?: () => void;
}) {
  const state = useSyncExternalStore(launch.subscribe, launch.getSnapshot);
  const [captions, setCaptions] = useState<boolean | null>(null);
  const [options, setOptions] = useState(false);
  const audio = useLaunchAudio(launch);
  const drag = useRef<{ x: number; angle: number } | null>(null);
  const { status, time, camera, quality, reduced } = state;
  const phase = phaseAt(time);
  const flight = Math.floor(time - marks.liftoff);
  const clock = `T${flight < 0 ? '−' : '+'}${String(Math.abs(flight)).padStart(2, '0')}`;
  const active = status === 'playing' || status === 'paused';
  const label = status === 'complete' ? 'Flight handoff' : status === 'error' ? 'Cinematic unavailable' : labels[phase][0];
  return <main className="lx-hud" id="main">
    {demo && <header className="lx-header">
      <div className="lx-wordmark"><span className="lx-emblem" aria-hidden="true" /> LEGACY</div>
      <span className="lx-range">{translate('EARTH / PAD 03')}</span>
    </header>}
    {camera === 'Inspect' && status === 'ready' && demo && <div className="lx-drag" aria-hidden="true"
      onPointerDown={(e) => { drag.current = { x: e.clientX, angle: state.angle }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (drag.current) launch.inspect(drag.current.angle + (drag.current.x-e.clientX)*0.009); }}
      onLostPointerCapture={() => { drag.current = null; }}
    />}
    <div className={`lx-title ${demo && status === 'ready' ? 'lx-expanded' : ''}`}>
      <div className="lx-kicker"><i />{translate('MISSION 03')} <span /> {translate('ROBOTIC MARS EXPEDITION')}</div>
      <h1>{translate('The Lost Rover')}</h1>
      {demo && status === 'ready' && <p>{translate('Send an uncrewed expedition to document Opportunity’s final site on Mars.')}</p>}
    </div>
    {(captions ?? initialCaptions) && active && <div className="lx-caption" aria-live="polite">
      <strong>{translate('MISSION CONTROL')}</strong>
      <span>{translate(labels[phase][1])}</span>
    </div>}
    <div className="lx-console">
      <div className="lx-readout">
        <div className="lx-clock" aria-label={translate('Mission clock')}>{clock}</div>
        <div className="lx-status">
          <span>{translate(label)}</span>
          <small>{translate(status === 'error' ? 'Rendering interrupted' : status === 'paused' ? 'Sequence paused' : 'Pioneer 03 · Readiness cleared')}</small>
        </div>
      </div>
      <div className="lx-track" role="progressbar" aria-label={translate('Launch sequence progress')} aria-valuemin={0} aria-valuemax={25} aria-valuenow={status === 'complete' ? 25 : Math.floor(time)}>
        <div style={{width: `${status === 'complete' ? 100 : time/marks.end*100}%`}} />
        {[3,8,10,16].map((mark) => <i key={mark} style={{left: `${mark/marks.end*100}%`}} />)}
      </div>
      <div className="lx-actions">
        {demo && status === 'ready' && <button className="lx-primary" onClick={() => launch.start()}>{translate('Launch mission')} <span aria-hidden="true">↗</span></button>}
        {demo && status === 'complete' && <button className="lx-primary" onClick={() => launch.replay()}>{translate('Replay launch')} <span aria-hidden="true">↻</span></button>}
        {active && <button className="lx-primary" onClick={() => status === 'playing' ? launch.pause() : launch.resume()}>{translate(status === 'playing' ? 'Pause' : 'Resume')}</button>}
        {active && allowSkip && <button onClick={() => launch.skip()}>{translate('Skip cinematic')}</button>}
        {status === 'error' && onRecover && <button className="lx-primary" onClick={onRecover}>{translate('Continue mission')}</button>}
        {status === 'error' && demo && <button onClick={() => window.location.reload()}>{translate('Reload demo')}</button>}
        <button aria-expanded={options} aria-controls="lx-options" onClick={() => setOptions(!options)}>{translate('Options')}</button>
      </div>
      {options && <div className="lx-options" id="lx-options">
        <label>{translate('Camera')} <select value={camera} onChange={(e) => launch.setView(e.target.value as CameraView)}>
          {views.filter((view) => view !== 'Inspect' || status === 'ready').map((view) => <option key={view} value={view}>{translate(view)}</option>)}
        </select></label>
        {camera === 'Inspect' && status === 'ready' && <label>{translate('Inspection angle')} <input type="range" min={-1.8} max={1.8} step={0.01} value={state.angle} onChange={(e) => launch.inspect(Number(e.target.value))} /></label>}
        <label>{translate('Graphics')} <select value={quality} onChange={(e) => launch.setQuality(e.target.value as Quality)}>
          <option value="balanced">{translate('Balanced')}</option><option value="low">{translate('Low')}</option>
        </select></label>
        <label><input type="checkbox" checked={reduced} onChange={(e) => launch.setReduced(e.target.checked)} /> {translate('Reduced motion')}</label>
        <label><input type="checkbox" checked={captions ?? initialCaptions} onChange={(e) => setCaptions(e.target.checked)} /> {translate('Subtitles')}</label>
        <label><input type="checkbox" checked={audio.enabled} onChange={audio.toggle} disabled={audio.unavailable} /> {translate(audio.unavailable ? 'Audio unavailable' : 'Audio')}</label>
      </div>}
    </div>
    {demo && <footer className="lx-footer">{translate('Fictional vehicle · Compressed flight timeline')}</footer>}
  </main>;
}
