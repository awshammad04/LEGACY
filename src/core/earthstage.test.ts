import { describe, expect, it } from 'vitest';
import { M1, M3, M4 } from '../content/missions';
import { baselineDesign, blockingFailures, evaluateRules } from './evaluate';
import { replay } from './reducer';
import type { Action, Design } from './types';

const fails = (m: typeof M1, d: Design) => blockingFailures(evaluateRules(m, d)).map((r) => r.id);

describe('Earth stage for Missions 01, 03 and 04', () => {
  it('Mission 01 baseline fails only crew life support — safety limits are not optional', () => {
    expect(fails(M1, baselineDesign(M1))).toEqual(['life-support']);
  });

  it('Mission 01 explains a launch-mass overrun exactly', () => {
    const d: Design = {
      selections: { ...baselineDesign(M1).selections, edl: 'm1-lander-balanced', crew: 'm1-crew-balanced', chassis: 'm1-rover-balanced', life: 'm1-life-balanced', power: 'm1-power-balanced', comms: 'm1-comms-balanced', protection: 'm1-protection-balanced', camera: 'm1-camera-balanced', storage: 'm1-storage-balanced' },
      addons: [],
    };
    const r = blockingFailures(evaluateRules(M1, d)).find((x) => x.id === 'launch-mass');
    expect(r?.delta).toBe(718);
    expect(fails(M1, { ...d, selections: { ...d.selections, launcher: 'm1-launcher-balanced' } })).toEqual([]);
  });

  it('Missions 03 and 04 baselines can launch', () => {
    expect(fails(M3, baselineDesign(M3))).toEqual([]);
    expect(fails(M4, baselineDesign(M4))).toEqual([]);
  });

  it('Mission 04: an infrared camera with a cryocooler needs more power and battery', () => {
    const d = baselineDesign(M4);
    d.selections.camera = 'm4-sensor-advanced';
    expect(fails(M4, d)).toEqual(expect.arrayContaining(['power', 'battery']));
    d.selections.power = 'm4-power-advanced';
    expect(fails(M4, d)).toEqual([]);
  });

  it('telescope and lunar missions use "day", not "sol", and skip rover-only rules', () => {
    const msgs = evaluateRules(M4, baselineDesign(M4)).map((r) => r.message.en).join(' ');
    expect(msgs).not.toMatch(/\bsol\b/);
    expect(evaluateRules(M4, baselineDesign(M4)).some((r) => r.id === 'landing-mass')).toBe(false);
  });

  it('a launched Earth stage ends on the honest operations-in-development screen', () => {
    const script: Action[] = [
      { type: 'ANSWER_PRE_QUIZ', answers: { 'pre-q1': 'b', 'pre-q2': 'b', 'pre-q3-observation': 'b' } },
      { type: 'SET_PRIORITY', hypothesisId: 'p-lightcurve' },
      { type: 'ADVANCE', to: 'workshop' },
      { type: 'REQUEST_REVIEW' },
      { type: 'CONFIRM_LAUNCH' },
      { type: 'ADVANCE', to: 'opsPreview' },
    ];
    const s = replay(M4, 3, script);
    expect(s.quiz.pre?.score).toBe(3);
    expect(s.launched).toBe(true);
    expect(s.stage).toBe('opsPreview');
  });

  it('every mission quiz keeps exactly three questions with one correct answer', () => {
    for (const m of [M1, M3, M4]) {
      for (const set of [m.quizPre, m.quizPost]) {
        expect(set).toHaveLength(3);
        for (const q of set) expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      }
    }
  });
});

import { M2 } from '../content/missions';
import { PACKAGES } from '../content/packages';

describe('Rover packages (quick build)', () => {
  it('every Mission 02 package passes the readiness review and differs in a real trade-off', () => {
    const pkgs = PACKAGES['m2-martian-mystery']!;
    expect(pkgs).toHaveLength(3);
    for (const p of pkgs) expect(fails(M2, p.design), p.id).toEqual([]);
    const caps = (id: string) => pkgs.find((p) => p.id === id)!.design.addons;
    expect(caps('scout')).not.toContain('inst-xrf');
    expect(pkgs.find((p) => p.id === 'lab')!.design.selections.power).toBe('power-advanced');
  });
});
