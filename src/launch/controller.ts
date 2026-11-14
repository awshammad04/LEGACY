export const marks = { countdown: 3, ignition: 8, liftoff: 10, ascent: 16, end: 25 } as const;
export type Phase = 'establish' | 'countdown' | 'ignition' | 'liftoff' | 'ascent';
export type CameraView = 'Director' | 'Pad' | 'Vehicle' | 'Engines' | 'Inspect';
export type Quality = 'low' | 'balanced';
export type Completion = 'finished' | 'skipped';
export interface LaunchConfig {
  authorize: () => boolean;
  vehicle?: 'pioneer';
  allowSkip?: boolean;
  allowReplay?: boolean;
  reduced?: boolean;
  quality?: Quality;
  onComplete?: (reason: Completion) => void;
  onError?: (error: unknown) => void;
}
export interface LaunchState {
  status: 'ready' | 'playing' | 'paused' | 'complete' | 'error';
  time: number;
  camera: CameraView;
  angle: number;
  quality: Quality;
  reduced: boolean;
}
export function phaseAt(t: number): Phase {
  if (t < marks.countdown) return 'establish';
  if (t < marks.ignition) return 'countdown';
  if (t < marks.liftoff) return 'ignition';
  if (t < marks.ascent) return 'liftoff';
  return 'ascent';
}
export class LaunchController {
  private listeners = new Set<() => void>();
  private state: LaunchState;
  private elapsed = 0;
  private disposed = false;

  constructor(private readonly config: LaunchConfig) {
    this.state = { status: 'ready', time: 0, camera: 'Director', angle: 0, quality: config.quality ?? 'balanced', reduced: config.reduced ?? false };
  }

  getSnapshot = () => this.state;
  get time() { return this.elapsed; }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<LaunchState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  start() {
    if (this.disposed || this.state.status !== 'ready') return false;
    try {
      if (!this.config.authorize()) return false;
    } catch (error) {
      this.fail(error);
      return false;
    }
    this.update({ status: 'playing', camera: 'Director' });
    return true;
  }

  pause() {
    if (this.state.status === 'playing') this.update({ status: 'paused', time: this.elapsed });
  }

  resume() {
    if (this.state.status === 'paused') this.update({ status: 'playing' });
  }

  skip() {
    if (this.config.allowSkip !== false && ['playing', 'paused'].includes(this.state.status)) this.finish('skipped');
  }

  replay() {
    if (this.disposed || !this.config.allowReplay || this.state.status !== 'complete') return false;
    this.elapsed = 0;
    this.update({ status: 'ready', time: 0 });
    return this.start();
  }

  setView(camera: CameraView) {
    if (camera === 'Inspect' && this.state.status !== 'ready') return;
    this.update({ camera });
  }

  inspect(angle: number) {
    if (this.state.status === 'ready') this.update({ camera: 'Inspect', angle: Math.max(-1.8, Math.min(1.8, angle)) });
  }

  setQuality(quality: Quality) { if (quality !== this.state.quality) this.update({ quality }); }
  setReduced(reduced: boolean) { if (reduced !== this.state.reduced) this.update({ reduced }); }

  advance(delta: number) {
    if (this.disposed || this.state.status !== 'playing') return;
    this.elapsed = Math.min(marks.end, this.elapsed + Math.min(Math.max(0, delta), 0.1));
    if (this.elapsed >= marks.end) this.finish('finished');
    else if (Math.floor(this.elapsed * 10) !== Math.floor(this.state.time * 10)) this.update({ time: this.elapsed });
  }

  fail(error: unknown) {
    if (this.disposed || ['error', 'complete'].includes(this.state.status)) return;
    this.update({ status: 'error' });
    this.config.onError?.(error);
  }

  dispose() {
    this.disposed = true;
    this.listeners.clear();
  }

  private finish(reason: Completion) {
    if (this.disposed) return;
    this.update({ status: 'complete', time: this.elapsed });
    this.config.onComplete?.(reason);
  }
}
