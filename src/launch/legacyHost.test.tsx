// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MISSIONS } from '../content/missions';
import { PACKAGES } from '../content/packages';
import { step } from '../core/reducer';
import { blockingFailures, evaluateRules } from '../core/evaluate';
import { useGame } from '../game/store';
import { LAUNCH_MISSIONS } from './missions';
import { localize } from '../game/i18n';
import { proceedFromLaunch, useMissionLaunch } from './legacyHost';

afterEach(() => { cleanup(); useGame.getState().exitToHome(); });

describe.each(MISSIONS)('$id shared cinematic integration', (mission) => {
  function review() {
    const game = useGame.getState;
    game().startMission(mission.id);
    game().dispatch({ type: 'ANSWER_PRE_QUIZ', answers: {} });
    game().dispatch({ type: 'SET_PRIORITY', hypothesisId: mission.hypotheses[0].id });
    game().dispatch({ type: 'ADVANCE', to: 'workshop' });
    const { design } = PACKAGES[mission.id]![1];
    for (const [slot, optionId] of Object.entries(design.selections)) game().dispatch({ type: 'SELECT_COMPONENT', slot, optionId });
    for (const optionId of design.addons) game().dispatch({ type: 'TOGGLE_ADDON', optionId });
    expect(blockingFailures(evaluateRules(mission, game().state!.design))).toEqual([]);
    game().dispatch({ type: 'REQUEST_REVIEW' });
  }

  it('waits for authorization, freezes when paused, and finishes exactly once with the existing state intact', () => {
    review();
    const { result } = renderHook(useMissionLaunch, { wrapper: StrictMode });
    expect(result.current).toBeNull();
    proceedFromLaunch(mission.id, useGame.getState().seed);
    expect(useGame.getState().state!.stage).toBe('review');
    act(() => { useGame.getState().dispatch({ type: 'CONFIRM_LAUNCH' }); });
    const launch = result.current!;
    expect(launch.getSnapshot().status).toBe('playing');
    const { state, seed, actions } = useGame.getState();
    const to = mission.stages[mission.stages.indexOf('launch') + 1];
    const expected = step(mission, state!, { type: 'ADVANCE', to }, actions.length);
    act(() => { launch.advance(0.1); launch.pause(); launch.advance(2); });
    expect(launch.time).toBe(0.1);
    act(() => { launch.resume(); for (let i = 0; i < 300; i++) launch.advance(0.1); launch.skip(); });
    proceedFromLaunch(mission.id, seed);
    expect(useGame.getState().state).toEqual(expected);
    expect(useGame.getState().actions.slice(actions.length)).toEqual([{ type: 'ADVANCE', to }]);
    act(() => { useGame.getState().exitToHome(); useGame.getState().continueMission(mission.id); });
    expect(useGame.getState().state).toEqual(expected);
  });

  it('skips while paused, restores an authorized save, and ignores callbacks after leaving the mission', () => {
    review();
    useGame.getState().dispatch({ type: 'CONFIRM_LAUNCH' });
    const { result } = renderHook(useMissionLaunch);
    const stale = result.current!;
    act(() => { useGame.getState().exitToHome(); });
    expect(result.current).toBeNull();
    stale.skip();
    expect(useGame.getState().state!.stage).toBe('launch');
    act(() => { useGame.getState().continueMission(mission.id); });
    const launch = result.current!;
    expect(launch).not.toBe(stale);
    const count = useGame.getState().actions.length;
    act(() => { launch.pause(); launch.skip(); launch.skip(); });
    expect(useGame.getState().state!.stage).toBe(mission.stages[mission.stages.indexOf('launch') + 1]);
    expect(useGame.getState().actions).toHaveLength(count + 1);
  });

  it('blocks a failed readiness review and translates its launch identity and every caption', () => {
    review();
    act(() => {
      const state = useGame.getState().state!;
      useGame.setState({ state: { ...state, design: { selections: {}, addons: [] } } });
    });
    expect(useGame.getState().dispatch({ type: 'CONFIRM_LAUNCH' })).toBe(false);
    const { result } = renderHook(useMissionLaunch);
    expect(result.current).toBeNull();
    for (const text of [LAUNCH_MISSIONS[mission.id].title, LAUNCH_MISSIONS[mission.id].missionLabel,
      LAUNCH_MISSIONS[mission.id].expedition, LAUNCH_MISSIONS[mission.id].readiness,
      LAUNCH_MISSIONS[mission.id].description, ...Object.values(LAUNCH_MISSIONS[mission.id].captions)]) {
      expect(localize(text, 'ar'), text).not.toBe(text);
    }
  });
});
