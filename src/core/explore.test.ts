import { describe, expect, it } from 'vitest';
import { M2 } from '../content/missions/m2';
import { replay, step, whatIfDesign } from './reducer';
import { consequences } from './outcome';
import { rockField, isObstacle } from './explore';
import type { Action, Design } from './types';

const GOOD: Design = {
  selections: {
    launcher: 'launcher-balanced', edl: 'edl-advanced', chassis: 'chassis-balanced', nav: 'nav-balanced', power: 'power-balanced',
    comms: 'comms-balanced', storage: 'storage-balanced', protection: 'protection-balanced', camera: 'camera-balanced',
  },
  addons: ['inst-arm', 'inst-abrasion', 'inst-xrf', 'inst-raman'],
};
const designActions = (d: Design): Action[] => [
  ...Object.entries(d.selections).map(([slot, optionId]) => ({ type: 'SELECT_COMPONENT', slot, optionId }) as Action),
  ...d.addons.map((optionId) => ({ type: 'TOGGLE_ADDON', optionId }) as Action),
];
const dust: Action = { type: 'EVENT_CHOICE', eventId: 'ev-dust', optionId: 'continue' };
const inv = (observationId: string, siteId = 'site-rock'): Action[] => [{ type: 'INVESTIGATE', siteId, observationId }, dust];

function launchToSurface(d: Design = GOOD): Action[] {
  return [
    { type: 'ANSWER_PRE_QUIZ', answers: { 'pre-q1': 'b', 'pre-q2': 'd', 'pre-q3': 'a' } },
    { type: 'SET_PRIORITY', hypothesisId: 'h-bio' },
    { type: 'ADVANCE', to: 'workshop' },
    ...designActions(d),
    { type: 'REQUEST_REVIEW' },
    { type: 'CONFIRM_LAUNCH' },
    { type: 'ADVANCE', to: 'orbit' },
    { type: 'ADVANCE', to: 'landingSite' },
    { type: 'CHOOSE_LANDING_SITE', siteId: 'site-delta' },
  ];
}

/** A careful open-world run: drive in stretches, handle events, investigate, report cautiously. */
function golden(o: { solar?: string; alert?: 'announce' | 'gather' | 'cautious'; conclusion?: 'proven' | 'potential' | 'untested' | 'nothing'; chem?: boolean } = {}): Action[] {
  const drive = (pos: [number, number], dist: number): Action => ({ type: 'DRIVE', dist, slopeAvg: 5, boostFrac: 0, bumps: 0, pos, heading: 0 });
  return [
    ...launchToSurface(),
    drive([-20, -200], 64),
    drive([20, -225], 47),
    { type: 'EVENT_CHOICE', eventId: 'ev-power', optionId: 'shed' },
    drive([62, -244], 46),
    { type: 'EVENT_CHOICE', eventId: 'ev-power', optionId: 'shed' },
    { type: 'EVENT_CHOICE', eventId: 'ev-solar', optionId: o.solar ?? 'safe' },
    ...inv('obs-context'),
    ...inv('obs-zoom'),
    ...(o.chem === false
      ? []
      : [...inv('obs-abrasion'), ...inv('obs-xrf'), { type: 'ALERT_CHOICE', choice: o.alert ?? 'gather' } as Action, ...inv('obs-raman'), ...inv('obs-cache')]),
    dust,
    { type: 'SEND_REPORT', conclusion: o.conclusion ?? 'potential' },
  ];
}

describe('Open-world Mars (Mission 02)', () => {
  it('a careful, well-designed run reaches an exemplary outcome', () => {
    const s = replay(M2, 7, golden());
    expect(s.stage).toBe('debrief');
    expect(s.ops.arrived).toBe(true);
    expect(s.ops.sitesFound).toContain('site-rock');
    expect(s.outcome?.tier).toBe('exemplary');
    expect(s.outcome?.achievements).toEqual(expect.arrayContaining(['careful-investigator', 'scientific-pioneer']));
  });

  it('replay is deterministic', () => {
    expect(replay(M2, 7, golden())).toEqual(replay(M2, 7, golden()));
  });

  it('driving costs energy and time from the player\'s own design', () => {
    const s = replay(M2, 7, [...launchToSurface(), { type: 'DRIVE', dist: 100, slopeAvg: 0, boostFrac: 0, bumps: 0, pos: [0, -200], heading: 0 }]);
    expect(s.ops.batteryWh).toBeLessThan(1600);
    expect(s.ops.sol).toBeGreaterThan(1);
    expect(s.ops.distanceU).toBe(100);
  });

  it('investigations only work when the rover is at the site', () => {
    const s = replay(M2, 7, [...launchToSurface(), { type: 'INVESTIGATE', siteId: 'site-rock', observationId: 'obs-context' }]);
    expect(s.evidence.observations).toHaveLength(0);
  });

  it('ignoring the radiation warning is unsafe and never earns an advantage', () => {
    const s = replay(M2, 7, golden({ solar: 'ignore' }));
    expect(s.flags.unsafeChoices).toContain('ev-solar');
    expect(s.outcome?.achievements).not.toContain('scientific-pioneer');
    expect(s.outcome?.tier).not.toBe('exemplary');
  });

  it('claiming life is graded as an overclaim', () => {
    const careful = replay(M2, 7, golden());
    const bold = replay(M2, 7, golden({ conclusion: 'proven' }));
    expect(bold.flags.overclaimed).toBe(true);
    expect(bold.outcome!.reportScore).toBeLessThan(careful.outcome!.reportScore);
    expect(bold.outcome?.achievements).not.toContain('careful-investigator');
  });

  it('without chemistry data, an honest "untested" report beats claiming a potential biosignature', () => {
    const untested = replay(M2, 7, golden({ chem: false, conclusion: 'untested' }));
    const potential = replay(M2, 7, golden({ chem: false, conclusion: 'potential' }));
    expect(untested.outcome!.reportScore).toBeGreaterThan(potential.outcome!.reportScore);
  });

  it('What-If with a weaker antenna recomputes fewer data products reaching Earth', () => {
    const r = whatIfDesign(M2, 7, golden(), [{ type: 'SELECT_COMPONENT', slot: 'comms', optionId: 'comms-basic' }]);
    expect(r.passedReview).toBe(true);
    expect(r.alternative.evidence.downlinked.length).toBeLessThan(r.original.evidence.downlinked.length);
  });

  it('What-If with a smaller battery forces extra recharge stops', () => {
    const small: Action[] = [{ type: 'SELECT_COMPONENT', slot: 'power', optionId: 'power-basic' }, { type: 'SELECT_COMPONENT', slot: 'protection', optionId: 'protection-basic' }, { type: 'TOGGLE_ADDON', optionId: 'inst-raman' }];
    const drives: Action[] = [...launchToSurface(), ...Array.from({ length: 6 }, (_, i) => ({ type: 'DRIVE', dist: 60, slopeAvg: 6, boostFrac: 0, bumps: 0, pos: [-60 + i * 5, -170] as [number, number], heading: 0 }) as Action)];
    const r = whatIfDesign(M2, 7, drives, small);
    if (r.passedReview) expect(r.alternative.ops.rests).toBeGreaterThanOrEqual(r.original.ops.rests);
    else expect(r.failures.length).toBeGreaterThan(0);
  });

  it('the dust storm cuts solar recharge while it lasts', () => {
    const base = [...launchToSurface(), ...Array.from({ length: 3 }, () => ({ type: 'REST' }) as Action)];
    const stormy = replay(M2, 7, [...base, { type: 'EVENT_CHOICE', eventId: 'ev-dust', optionId: 'continue' }, { type: 'DRIVE', dist: 200, slopeAvg: 0, boostFrac: 0, bumps: 0, pos: [0, -200], heading: 0 }, { type: 'REST' }]);
    const clear = replay(M2, 7, [...base, { type: 'EVENT_CHOICE', eventId: 'ev-dust', optionId: 'wait' }, { type: 'DRIVE', dist: 200, slopeAvg: 0, boostFrac: 0, bumps: 0, pos: [0, -200], heading: 0 }, { type: 'REST' }]);
    expect(stormy.ops.dustUntil).toBeGreaterThan(stormy.ops.sol - 1);
    // From the same low battery, one rest recharges less while the storm lasts
    const low = (st: typeof stormy) => ({ ...st, pendingEvent: undefined, ops: { ...st.ops, batteryWh: st.ops.batteryCapWh * 0.25 } });
    const s2 = step(M2, low(stormy), { type: 'REST' }, 999);
    const c2 = step(M2, low(clear), { type: 'REST' }, 999);
    expect(stormy.ops.sol).toBeLessThan(stormy.ops.dustUntil);
    expect(s2.ops.batteryWh).toBeLessThan(c2.ops.batteryWh);
  });

  it('debrief consequences explain the player\'s own choices', () => {
    const lines = consequences(M2, replay(M2, 7, golden({ conclusion: 'proven' }))).map((c) => c.text.en).join(' ');
    expect(lines).toMatch(/Claiming life went beyond/);
  });

  it('the rock field is deterministic and keeps site centres clear', () => {
    const a = rockField(M2);
    expect(rockField(M2)).toEqual(a);
    for (const site of M2.sites!) expect(a.filter(isObstacle).some((r) => Math.hypot(r.x - site.pos[0], r.z - site.pos[1]) < 9)).toBe(false);
  });
});
