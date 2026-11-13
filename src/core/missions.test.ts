import { describe, expect, it } from 'vitest';
import { M1, M3, M4, MISSIONS } from '../content/missions';
import { PACKAGES } from '../content/packages';
import { blockingFailures, evaluateRules } from './evaluate';
import { replay } from './reducer';
import type { Action, Design, MissionDefinition } from './types';

const designActions = (d: Design): Action[] => [
  ...Object.entries(d.selections).map(([slot, optionId]) => ({ type: 'SELECT_COMPONENT', slot, optionId }) as Action),
  ...d.addons.map((optionId) => ({ type: 'TOGGLE_ADDON', optionId }) as Action),
];
const toLaunch = (m: MissionDefinition, pkg: string): Action[] => {
  const p = PACKAGES[m.id]!.find((x) => x.id === pkg)!;
  return [
    { type: 'ANSWER_PRE_QUIZ', answers: {} },
    { type: 'SET_PRIORITY', hypothesisId: m.hypotheses[0].id },
    { type: 'ADVANCE', to: 'workshop' },
    ...designActions(p.design),
    { type: 'REQUEST_REVIEW' },
    { type: 'CONFIRM_LAUNCH' },
  ];
};
const drive = (pos: [number, number], dist = 50): Action => ({ type: 'DRIVE', dist, slopeAvg: 3, boostFrac: 0, bumps: 0, pos, heading: 0 });

describe('All missions are playable and clear', () => {
  it('every rover / crew / telescope package passes the readiness review', () => {
    for (const m of MISSIONS) for (const p of PACKAGES[m.id] ?? []) expect(blockingFailures(evaluateRules(m, p.design)).map((r) => r.id), `${m.id}/${p.id}`).toEqual([]);
  });

  it('every mission defines a 3-step checklist', () => {
    for (const m of [M1, M3, M4]) expect(m.objectives).toHaveLength(3);
  });
});

describe('Mission 01 — life aboard and Moon EVA', () => {
  const cruise = (choices: Record<string, string>): Action[] => [
    ...toLaunch(M1, 'rover-team'),
    { type: 'ADVANCE', to: 'orbit' },
    { type: 'ADVANCE', to: 'cruise' },
    ...M1.cruise!.map((st) => ({ type: 'CREW_CHOICE', stepId: st.id, optionId: choices[st.id] ?? st.options[0].id }) as Action),
    { type: 'ADVANCE', to: 'surface' },
  ];

  it('healthy choices aboard keep the crew rested and give a longer moonwalk', () => {
    const good = replay(M1, 1, cruise({}));
    const bad = replay(M1, 1, cruise({ meals: 'ration', exercise: 'skip', sleep: 'late' }));
    expect(good.stage).toBe('surface');
    expect(good.crew!.vitals.fatigue).toBeLessThan(bad.crew!.vitals.fatigue);
    expect(good.ops.evaMaxH).toBeGreaterThan(bad.ops.evaMaxH);
  });

  it('ignoring the solar flare aboard is unsafe and raises the radiation dose', () => {
    const s = replay(M1, 1, cruise({ flare: 'continue' }));
    expect(s.flags.unsafeChoices).toContain('cruise-flare');
    expect(s.crew!.vitals.doseMSv).toBeGreaterThan(10);
  });

  it('the crew cannot skip the life-aboard schedule', () => {
    const s = replay(M1, 1, [...toLaunch(M1, 'rover-team'), { type: 'ADVANCE', to: 'orbit' }, { type: 'ADVANCE', to: 'cruise' }, { type: 'ADVANCE', to: 'surface' }]);
    expect(s.stage).toBe('cruise');
  });

  it('entering the protected Apollo 15 zone is recorded as a heritage violation', () => {
    const site = M1.sites!.find((x) => x.kind === 'heritage')!;
    const s = replay(M1, 1, [...cruise({}), drive([site.pos[0] + 5, site.pos[1]], 200)]);
    expect(s.ops.keepOutViolations).toBe(1);
    expect(s.flags.unsafeChoices).toContain('keep-out');
  });

  it('documenting from the boundary works and resting is only possible at the lander', () => {
    const site = M1.sites!.find((x) => x.kind === 'heritage')!;
    const at: [number, number] = [site.pos[0] + 24, site.pos[1]];
    const s = replay(M1, 1, [...cruise({}), drive(at, 200), { type: 'INVESTIGATE', siteId: site.id, observationId: 'obs-heritage-photo' }, { type: 'REST' }]);
    expect(s.ops.keepOutViolations).toBe(0);
    expect(s.evidence.observations.map((o) => o.id)).toContain('obs-heritage-photo');
    expect(s.ops.rests).toBe(0);
  });
});

describe('Mission 03 — Opportunity', () => {
  it('documents Opportunity from outside the boundary and earns Heritage Protector', () => {
    const opp = M3.sites!.find((x) => x.kind === 'heritage')!;
    const s = replay(M3, 2, [
      ...toLaunch(M3, 'documenter'),
      { type: 'ADVANCE', to: 'orbit' },
      { type: 'ADVANCE', to: 'surface' },
      drive([-100, -80], 160),
      { type: 'EVENT_CHOICE', eventId: 'ev-power', optionId: 'shed' },
      drive([opp.pos[0] - 20, opp.pos[1] + 2], 180),
      { type: 'EVENT_CHOICE', eventId: 'ev-power', optionId: 'shed' },
      { type: 'INVESTIGATE', siteId: opp.id, observationId: 'obs-opp-photo' },
      { type: 'EVENT_CHOICE', eventId: 'ev-dust', optionId: 'wait' },
      { type: 'INVESTIGATE', siteId: opp.id, observationId: 'obs-opp-zoom' },
      { type: 'EVENT_CHOICE', eventId: 'ev-dust', optionId: 'wait' },
      { type: 'SEND_REPORT', conclusion: 'summary' },
    ]);
    expect(s.stage).toBe('debrief');
    expect(s.ops.keepOutViolations).toBe(0);
    expect(s.outcome?.achievements).toContain('heritage-protector');
  });
});

describe('Mission 04 — telescope observing', () => {
  const observe: Action[] = [...toLaunch(M4, 'uv-hunter'), { type: 'ADVANCE', to: 'observe' }];
  it('watching all three nights builds a light curve and scores better than one night', () => {
    const night = (): Action[] => [{ type: 'SCOPE_POINT' }, { type: 'SCOPE_IMAGE', filter: 'visible', exposure: 0.5 }];
    const three = replay(M4, 3, [
      ...observe,
      ...night(),
      { type: 'SCOPE_NEXT_NIGHT' },
      { type: 'EVENT_CHOICE', eventId: 'ev-solar-scope', optionId: 'safe' },
      ...night(),
      { type: 'SCOPE_IMAGE', filter: 'uv', exposure: 0.5 },
      { type: 'SCOPE_SPECTRUM' },
      { type: 'SCOPE_NEXT_NIGHT' },
      ...night(),
      { type: 'SEND_REPORT', conclusion: 'summary' },
    ]);
    const one = replay(M4, 3, [...observe, ...night(), { type: 'SEND_REPORT', conclusion: 'summary' }]);
    expect(three.stage).toBe('debrief');
    expect(three.scope!.images.length).toBeGreaterThanOrEqual(4);
    expect(three.outcome!.scienceScore).toBeGreaterThan(one.outcome!.scienceScore);
    expect(three.evidence.report).toContain('m4-st-curve');
  });

  it('filters need the right sensor', () => {
    const s = replay(M4, 3, [...toLaunch(M4, 'snapshot'), { type: 'ADVANCE', to: 'observe' }, { type: 'SCOPE_POINT' }, { type: 'SCOPE_IMAGE', filter: 'uv', exposure: 0.5 }]);
    expect(s.scope!.images).toHaveLength(0);
  });
});
