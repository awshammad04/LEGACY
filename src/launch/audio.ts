import { useEffect, useRef, useState } from 'react';
import { marks, type LaunchController } from './controller';

function createAudio() {
  const context = new AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  let wind = 0;
  for (let i = 0; i < data.length; i++) {
    wind = wind * 0.93 + (Math.random() * 2 - 1) * 0.14;
    data[i] = wind;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  const engine = context.createOscillator();
  engine.type = 'triangle';
  const bass = context.createGain();
  bass.gain.value = 0;
  const volume = context.createGain();
  volume.gain.value = 0;
  noise.connect(filter).connect(volume).connect(context.destination);
  engine.connect(bass).connect(volume);
  noise.start();
  engine.start();
  return { context, volume, filter, engine, bass };
}

export function useLaunchAudio(launch: LaunchController) {
  const sound = useRef<ReturnType<typeof createAudio> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => () => {
    void sound.current?.context.close().catch(() => {});
    sound.current = null;
  }, []);

  useEffect(() => {
    const update = () => {
      const layer = sound.current;
      if (!layer) return;
      const { context, volume, filter, engine, bass } = layer;
      const { status, time } = launch.getSnapshot();
      const active = enabled && (status === 'playing' || status === 'ready');
      const burn = Math.max(0, Math.min(1, (time-marks.ignition)/0.85));
      const distance = Math.max(0, (time-marks.liftoff)/16);
      volume.gain.setTargetAtTime(active ? 0.065 + burn * (0.81 - distance*0.47) : 0,context.currentTime,0.045);
      filter.frequency.setTargetAtTime(280 + burn*(430-distance*450),context.currentTime,0.12);
      engine.frequency.setTargetAtTime(37+burn*15+distance*19,context.currentTime,0.13);
      bass.gain.setTargetAtTime(burn*0.16,context.currentTime,0.12);
    };
    update();
    return launch.subscribe(update);
  }, [launch, enabled]);

  const toggle = () => {
    if (enabled) {
      setEnabled(false);
      return;
    }
    try {
      sound.current ??= createAudio();
      void sound.current.context.resume().then(() => setEnabled(true)).catch(() => setUnavailable(true));
    } catch {
      setUnavailable(true);
    }
  };
  return { enabled, unavailable, toggle };
}
