import type { Lang } from '../core/types';
import type { Story } from './catalog';

export interface NarrationState {
  story: Story | null;
  lang: Lang;
  status: 'idle' | 'ready' | 'playing' | 'paused' | 'ended' | 'unavailable';
  progress: number;
  muted: boolean;
  volume: number;
}

/** One audio owner for every mission and stage. No Gemini configuration or requests in the client. */
export class NarrationPlayer {
  private state: NarrationState = {story:null,lang:'en',status:'idle',progress:0,muted:false,volume:0.8};
  private listeners = new Set<() => void>();
  private audio: HTMLAudioElement | null = null;
  private generation = 0;
  private source?: string;

  constructor(private readonly createAudio: () => HTMLAudioElement = () => new Audio()) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {this.listeners.add(listener);return () => {this.listeners.delete(listener);};};
  private update(patch: Partial<NarrationState>) {
    this.state = {...this.state, ...patch};
    this.listeners.forEach(listener => listener());
  }

  private release() {
    this.generation++;
    if (!this.audio) return;
    this.audio.onplay = this.audio.onpause = this.audio.onended = this.audio.ontimeupdate = this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.audio = null;
  }

  open(story: Story, lang: Lang, source: string | undefined, autoplay = false) {
    this.release();
    this.source = source;
    this.update({story,lang,status:source?'ready':'unavailable',progress:0});
    if (!source) return;
    try {
      const audio = this.createAudio(), generation = this.generation;
      this.audio = audio;
      audio.preload = 'metadata';
      audio.src = source;
      audio.volume = this.state.volume;
      audio.muted = this.state.muted;
      const current = () => this.audio === audio && this.generation === generation;
      audio.onplay = () => {if(current())this.update({status:'playing'});};
      audio.onpause = () => {if(current()&&this.state.status!=='ended')this.update({status:'paused'});};
      audio.onended = () => {if(current())this.update({status:'ended',progress:1});};
      audio.ontimeupdate = () => {if(current()&&Number.isFinite(audio.duration)&&audio.duration>0)this.update({progress:audio.currentTime/audio.duration});};
      audio.onerror = () => {if(current()){this.release();this.update({status:'unavailable'});}};
      if(autoplay&&!this.state.muted)void this.play();
    } catch {this.release();this.update({status:'unavailable'});}
  }

  async play() {
    const audio = this.audio, generation = this.generation;
    if (!audio || this.state.status === 'unavailable') return;
    if (this.state.status === 'playing') return;
    if (this.state.status === 'ended') audio.currentTime = 0;
    try {
      await audio.play();
      if(this.audio!==audio||generation!==this.generation)audio.pause();
    } catch (error) {
      if(this.audio!==audio||generation!==this.generation)return;
      // Autoplay denial is recoverable with a user click. A failed recording keeps its verified text.
      const denied=typeof error==='object'&&error!==null&&'name' in error&&error.name==='NotAllowedError';
      this.update({status:denied?'ready':'unavailable'});
    }
  }
  pause() {this.audio?.pause();}
  replay() {
    if(!this.state.story)return;
    if(this.state.status==='unavailable')this.open(this.state.story,this.state.lang,this.source,false);
    // An already playing element does not emit another play event unless paused first.
    if(this.audio){this.audio.pause();this.audio.currentTime=0;this.update({progress:0,status:'ready'});void this.play();}
  }
  setMuted(muted: boolean) {if(this.audio)this.audio.muted=muted;this.update({muted});}
  setVolume(volume: number) {
    volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:0.8));
    if(this.audio)this.audio.volume=volume;
    this.update({volume});
  }
  stop() {this.release();this.source=undefined;this.update({story:null,status:'idle',progress:0});}
}

export const narration = new NarrationPlayer();
