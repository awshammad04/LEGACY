import { create } from 'zustand';
import type { LText } from '../core/types';
import { localize } from './i18n';
import { useGame } from './store';

/* ------------------------------------------------------------------ */
/* Synthesized sound effects (Web Audio) — no third-party audio files  */
/* ------------------------------------------------------------------ */

let ctx: AudioContext | null = null;
const ac = () => {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.06, when = 0, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur: number, gain = 0.2, cutoff = 400) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 0.6;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

export type Sfx = 'click' | 'select' | 'confirm' | 'warn' | 'error' | 'success' | 'launch' | 'uplink' | 'alert';

export function sfx(kind: Sfx) {
  if (!useGame.getState().settings.sfx) return;
  switch (kind) {
    case 'click': return tone(880, 0.06, 'triangle', 0.03);
    case 'select': return tone(660, 0.08, 'sine', 0.05), tone(990, 0.08, 'sine', 0.035, 0.05);
    case 'confirm': return tone(523, 0.1, 'sine', 0.05), tone(784, 0.16, 'sine', 0.05, 0.08);
    case 'warn': return tone(440, 0.18, 'square', 0.025), tone(370, 0.22, 'square', 0.025, 0.18);
    case 'error': return tone(220, 0.25, 'sawtooth', 0.03);
    case 'success': return [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.045, i * 0.09));
    case 'launch': return noise(6, 0.35, 300), tone(55, 5, 'sawtooth', 0.04, 0, 30);
    case 'uplink': return [0, 1, 2, 3].forEach((i) => tone(1200 + i * 120, 0.05, 'square', 0.015, i * 0.12));
    case 'alert': return tone(740, 0.15, 'triangle', 0.05), tone(740, 0.15, 'triangle', 0.05, 0.25);
  }
}

/* ------------------------------------------------------------------ */
/* Narration + subtitles (one script source for both)                  */
/* ------------------------------------------------------------------ */

interface SubtitleStore {
  line?: { text: string; from: string; id: number };
  set: (p: Partial<Omit<SubtitleStore, 'set'>>) => void;
}
export const useSubtitles = create<SubtitleStore>((set) => ({ set: (p) => set(p) }));

let lineId = 0;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Say a line as the fictional Mission Control narrator (synthetic voice, clearly labeled).
 * Subtitles always come from the same text.
 */
export function say(text: LText, from: LText = { en: 'Mission Control' }) {
  const { settings } = useGame.getState();
  const str = localize(text, settings.lang);
  const who = localize(from, settings.lang);
  const id = ++lineId;
  useSubtitles.getState().set({ line: { text: str, from: who, id } });
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    if (useSubtitles.getState().line?.id === id) useSubtitles.getState().set({ line: undefined });
  }, Math.min(14000, 2500 + str.length * 55));

  if (settings.narration && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(str);
      u.lang = settings.lang === 'ar' ? 'ar' : 'en-US';
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(settings.lang));
      if (voice) u.voice = voice;
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch {
      /* speech unavailable */
    }
  }
}

export function stopNarration() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  useSubtitles.getState().set({ line: undefined });
}

/* ------------------------------------------------------------------ */
/* Ambient menu soundscape — synthesized drone, no audio files          */
/* ------------------------------------------------------------------ */

let amb: { gain: GainNode; nodes: AudioScheduledSourceNode[] } | null = null;

export function setAmbient(on: boolean) {
  const c = ac();
  if (!c) return;
  if (on && !amb) {
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, c.currentTime + 3);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    filter.connect(gain).connect(c.destination);
    const nodes: AudioScheduledSourceNode[] = [];
    // Low open fifth, slightly detuned, for a calm "space" pad
    for (const [f, g, det] of [[55, 0.5, 0], [82.4, 0.35, 4], [110, 0.18, -6], [164.8, 0.08, 3]] as const) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = det;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og).connect(filter);
      o.start();
      nodes.push(o);
    }
    // Slow filter sweep
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    nodes.push(lfo);
    amb = { gain, nodes };
  } else if (!on && amb) {
    const { gain, nodes } = amb;
    amb = null;
    const t = c.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 1.2);
    nodes.forEach((n) => n.stop(t + 1.3));
  }
}
