import { describe, expect, it, vi } from 'vitest';
import { LaunchController, marks, phaseAt } from './controller';

describe('cinematic launch controller', () => {
  it('requires host authorization and honors the skip policy', () => {
    const authorize = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const complete = vi.fn();
    const launch = new LaunchController({ authorize, allowSkip: false, onComplete: complete });
    expect(launch.start()).toBe(false);
    expect(launch.start()).toBe(true);
    expect(launch.start()).toBe(false);
    launch.skip();
    expect(complete).not.toHaveBeenCalled();
    expect(launch.getSnapshot().status).toBe('playing');
  });

  it('freezes the timeline, completes once, and starts a fresh standalone replay', () => {
    const complete = vi.fn();
    const launch = new LaunchController({ authorize: () => true, allowReplay: true, onComplete: complete });
    launch.start();
    for (let i = 0; i < 81; i++) launch.advance(0.1);
    expect(phaseAt(launch.time)).toBe('ignition');
    launch.pause();
    const pausedAt = launch.time;
    launch.advance(3);
    expect(launch.time).toBe(pausedAt);
    launch.resume();
    for (let i = 0; i < 300; i++) launch.advance(0.1);
    expect(launch.time).toBe(marks.end);
    launch.skip();
    expect(complete.mock.calls).toEqual([['finished']]);
    expect(launch.replay()).toBe(true);
    expect(launch.time).toBe(0);
    launch.pause();
    launch.skip();
    launch.skip();
    expect(complete.mock.calls).toEqual([['finished'], ['skipped']]);
  });

  it('disarms ticks and callbacks on disposal and reports render failure once', () => {
    const error = vi.fn(), complete = vi.fn(), listener = vi.fn();
    const launch = new LaunchController({ authorize: () => true, onError: error, onComplete: complete });
    launch.subscribe(listener);
    launch.start();
    launch.fail('context lost');
    launch.fail('context lost again');
    expect(error.mock.calls).toEqual([['context lost']]);
    const notifications = listener.mock.calls.length;
    launch.dispose();
    launch.setQuality('low');
    launch.advance(0.1);
    launch.skip();
    expect(listener).toHaveBeenCalledTimes(notifications);
    expect(complete).not.toHaveBeenCalled();
  });
});
