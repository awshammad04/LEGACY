import { describe, expect, it } from 'vitest';
import { M2 } from '../content/missions/m2';
import { baselineDesign, blockingFailures, computeMetrics, evaluateRules, isLaunchReady } from './evaluate';
import { compareQuizzes, scoreQuiz, shuffledOptions } from './quizEngine';
import { predictRoute } from './ops';
import type { Design } from './types';
import { SOURCES } from '../content/sources';
import { MISSIONS } from '../content/missions';

const GOOD: Design = {
  selections: {
    launcher: 'launcher-balanced', edl: 'edl-advanced', chassis: 'chassis-balanced', nav: 'nav-balanced', power: 'power-balanced',
    comms: 'comms-balanced', storage: 'storage-balanced', protection: 'protection-balanced', camera: 'camera-balanced',
  },
  addons: ['inst-arm', 'inst-abrasion', 'inst-xrf', 'inst-raman'],
};


const PRE_ALL_CORRECT = { 'pre-q1': 'b', 'pre-q2': 'b', 'pre-q3': 'b' };

describe('Design evaluator & readiness rules', () => {
  it('the minimum-cost baseline can launch (but carries little science)', () => {
    const rules = evaluateRules(M2, baselineDesign(M2));
    expect(blockingFailures(rules)).toEqual([]);
    expect(computeMetrics(M2, baselineDesign(M2)).capabilities).toEqual(['context-imaging']);
  });

  it('the recommended balanced design passes every blocking rule', () => {
    expect(blockingFailures(evaluateRules(M2, GOOD))).toEqual([]);
  });

  it('explains launch-mass failures with the exact overrun', () => {
    const d = baselineDesign(M2);
    d.selections.edl = 'edl-balanced';
    d.selections.chassis = 'chassis-balanced';
    const fail = blockingFailures(evaluateRules(M2, d)).find((r) => r.id === 'launch-mass');
    expect(fail).toBeDefined();
    expect(fail!.delta).toBe(127);
    expect(fail!.message.en).toContain('exceeds launcher capacity by {over} kg');
    expect(fail!.message.vars?.over).toBe(127);
  });

  it('explains landing-mass failures', () => {
    const d = baselineDesign(M2);
    d.addons = ['inst-arm', 'inst-abrasion', 'inst-xrf'];
    const fail = blockingFailures(evaluateRules(M2, d)).find((r) => r.id === 'landing-mass');
    expect(fail?.delta).toBe(19);
  });

  it('protects the reserve: cost may not eat into the protected minimum', () => {
    const d: Design = { selections: { ...GOOD.selections, launcher: 'launcher-advanced', chassis: 'chassis-advanced', nav: 'nav-advanced', power: 'power-advanced', protection: 'protection-advanced' }, addons: [...GOOD.addons, 'inst-radar', 'inst-weather'] };
    const r = evaluateRules(M2, d).find((x) => x.id === 'budget')!;
    expect(r.pass).toBe(false);
    expect(r.limit).toBe(M2.budgetCapM - M2.reserveMinM);
  });

  it('contact instruments require the robotic arm', () => {
    const d = baselineDesign(M2);
    d.addons = ['inst-xrf'];
    expect(evaluateRules(M2, d).find((r) => r.id === 'dependencies')!.pass).toBe(false);
  });

  it('power and thermal limits create real trade-offs (radioisotope power needs better thermal protection)', () => {
    const d: Design = { ...GOOD, selections: { ...GOOD.selections, power: 'power-advanced' } };
    expect(evaluateRules(M2, d).find((r) => r.id === 'thermal')!.pass).toBe(false);
    const fixed: Design = { ...d, selections: { ...d.selections, protection: 'protection-advanced' } };
    expect(evaluateRules(M2, fixed).find((r) => r.id === 'thermal')!.pass).toBe(true);
    const weak: Design = { ...GOOD, selections: { ...GOOD.selections, power: 'power-basic' } };
    expect(evaluateRules(M2, weak).find((r) => r.id === 'power')!.pass).toBe(false);
  });
});

describe('Quiz engine', () => {
  it('shuffles deterministically and keeps "I\'m not sure" last', () => {
    const q = M2.quizPre[0];
    const a = shuffledOptions(q, 42).map((o) => o.id);
    expect(shuffledOptions(q, 42).map((o) => o.id)).toEqual(a);
    expect(a[a.length - 1]).toBe('d');
    const positions = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => shuffledOptions(q, s).findIndex((o) => o.correct)));
    expect(positions.size).toBeGreaterThan(1);
  });

  it('"I\'m not sure" scores zero without a penalty', () => {
    const r = scoreQuiz(M2.quizPre, { 'pre-q1': 'd', 'pre-q2': 'b', 'pre-q3': 'd' });
    expect(r.score).toBe(1);
    expect(r.total).toBe(3);
  });

  it('compares only measured results and never invents improvement', () => {
    const post = scoreQuiz(M2.quizPost, { 'post-q1': 'b', 'post-q2': 'b', 'post-q3': 'b' });
    expect(compareQuizzes(undefined, post).available).toBe(false);
    const pre = scoreQuiz(M2.quizPre, PRE_ALL_CORRECT);
    const c = compareQuizzes(pre, post);
    expect(c.before).toBe(3);
    expect(c.improved).toEqual([]);
  });

  it('post-quiz questions differ from the pre-quiz wording', () => {
    for (let i = 0; i < 3; i++) expect(M2.quizPost[i].prompt.en).not.toBe(M2.quizPre[i].prompt.en);
  });
});

describe('Mars operations model', () => {
  it('the direct Delta Front route is drivable by a balanced chassis', () => {
    const m = computeMetrics(M2, GOOD);
    const p = predictRoute(m, [-60, -170], [[0, -215], [70, -250]], 'standard', M2.target);
    expect(p.blocked).toBe(false);
    expect(p.endsAtTarget).toBe(true);
  });

  it('steeper scarp crossings are blocked for the compact chassis but the ramp works', () => {
    const m = computeMetrics(M2, baselineDesign(M2));
    const straight = predictRoute(m, [-210, 60], [[-180, -200]], 'standard', M2.target);
    expect(straight.blocked).toBe(true);
    const ramp = predictRoute(m, [-210, 60], [[-100, -40], [-90, -170]], 'cautious', M2.target);
    expect(ramp.blocked).toBe(false);
  });

  it('faster driving saves time but raises modeled risk', () => {
    const m = computeMetrics(M2, GOOD);
    const slow = predictRoute(m, [-210, 60], [[-100, -40], [-90, -170]], 'cautious', M2.target);
    const fast = predictRoute(m, [-210, 60], [[-100, -40], [-90, -170]], 'fast', M2.target);
    expect(fast.hours).toBeLessThan(slow.hours);
    expect(fast.risk).toBeGreaterThan(slow.risk);
  });
});

describe('Integrity', () => {
  it('every verified learn card, archive entry and fact cites a registered source', () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const m of MISSIONS) {
      for (const c of m.learnCards) if (c.provenance === 'verified') expect(ids.has(c.sourceId ?? ''), c.id).toBe(true);
      for (const a of m.archive) expect(ids.has(a.sourceId), a.id).toBe(true);
      for (const f of m.briefing.facts) expect(ids.has(f.sourceId)).toBe(true);
      for (const r of m.briefing.references) expect(ids.has(r.sourceId)).toBe(true);
      for (const o of m.slots.flatMap((s) => s.options)) if (o.inspiredBy) expect(ids.has(o.inspiredBy.sourceId)).toBe(true);
    }
  });

  it('pre and post quizzes have exactly three questions with one correct answer each', () => {
    for (const set of [M2.quizPre, M2.quizPost]) {
      expect(set).toHaveLength(3);
      for (const q of set) {
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
        expect(q.options.some((o) => o.notSure)).toBe(true);
      }
    }
  });
});

it('isLaunchReady agrees with blockingFailures', () => {
  expect(isLaunchReady(evaluateRules(M2, GOOD))).toBe(true);
});
