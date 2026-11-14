import { expect, test, type Page } from '@playwright/test';
import AR from '../../src/game/ar.json' with { type: 'json' };
import { MISSIONS } from '../../src/content/missions';
import { PACKAGES } from '../../src/content/packages';
import { step } from '../../src/core/reducer';
import type { Action, MissionId, MissionState } from '../../src/core/types';

const arabic = AR as Record<string, string>;
const ar = (text: string) => arabic[text];

test.use({ viewport: { width: 1280, height: 720 }, launchOptions: { args: [] }, actionTimeout: 15_000 });

type Snapshot = { state: MissionState; actions: Action[]; seed: number };
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => {
  const { state, actions, seed } = (window as any).__legacy.useGame.getState();
  return { state, actions, seed };
});

async function workshop(page: Page, id: MissionId) {
  const mission = MISSIONS.find((m) => m.id === id)!;
  const design = PACKAGES[id]![1].design;
  await page.goto('/?test=1');
  await page.waitForFunction(() => !!(window as any).__legacy);
  await page.evaluate(({ id, priority, design }) => {
    const game = (window as any).__legacy.useGame.getState;
    game().setSettings({ quality: 'high', reducedMotion: false, narration: false, sfx: false });
    game().startMission(id);
    game().dispatch({ type: 'ANSWER_PRE_QUIZ', answers: {} });
    game().dispatch({ type: 'SET_PRIORITY', hypothesisId: priority });
    game().dispatch({ type: 'ADVANCE', to: 'workshop' });
    for (const [slot, optionId] of Object.entries(design.selections)) game().dispatch({ type: 'SELECT_COMPONENT', slot, optionId });
    for (const optionId of design.addons) game().dispatch({ type: 'TOGGLE_ADDON', optionId });
  }, { id, priority: mission.hypotheses[0].id, design });
  await expect(page.getByText('Ready to launch ✓')).toBeVisible();
  // The launch button performs this mission's real review and CONFIRM_LAUNCH.
  await page.getByRole('button', { name: /LAUNCH MISSION/ }).click();
  await expect(page.locator('.lx-hud')).toBeVisible();
  await expect(page.locator('.story-card')).toHaveAttribute('data-story-id', 'mission-launch');
  expect((await snapshot(page)).state.launched).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
}

async function handoff(page: Page, before: Snapshot, id: MissionId) {
  const mission = MISSIONS.find((m) => m.id === id)!;
  const next = mission.stages[mission.stages.indexOf('launch') + 1];
  await expect.poll(async () => (await snapshot(page)).state.stage, { timeout: 65_000 }).toBe(next);
  const after = await snapshot(page);
  expect(after.actions.slice(before.actions.length)).toEqual([{ type: 'ADVANCE', to: next }]);
  // Preserve the game's existing handoff, including Mission 04's observing-state initialization.
  expect(after.state).toEqual(step(mission, before.state, { type: 'ADVANCE', to: next }, before.actions.length));
  await expect(page.locator('.lx-hud')).toHaveCount(0);
}

for (const mission of MISSIONS) {
  test(`${mission.id}: full cinematic, all phases, pause/resume, natural handoff and save`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await workshop(page, mission.id);
    const before = await snapshot(page);
    await expect(page.locator('.lx-title h1')).toHaveText(mission.title.en);
    await page.evaluate(() => {
      const frames: number[] = [];
      (window as any).__launchFrames = frames;
      let previous = performance.now();
      const sample = (now: number) => {
        frames.push(now - previous); previous = now;
        if ((window as any).__legacy.useGame.getState().state.stage === 'launch') requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const progress = page.locator('.lx-hud').getByRole('progressbar');
    for (const [phase, time] of [['pad', 1], ['countdown', 4], ['ignition', 8], ['liftoff', 12], ['ascent', 19]] as const) {
      await expect.poll(async () => Number(await progress.getAttribute('aria-valuenow')), { timeout: 30_000 }).toBeGreaterThanOrEqual(time);
      if (phase === 'ignition') {
        await page.locator('.lx-hud').getByRole('button', { name: 'Pause', exact: true }).click();
        const paused = await progress.getAttribute('aria-valuenow');
        await page.waitForTimeout(700);
        await expect(progress).toHaveAttribute('aria-valuenow', paused!);
      }
      await page.screenshot({ path: info.outputPath(`${phase}.png`) });
      if (phase === 'ignition') await page.locator('.lx-hud').getByRole('button', { name: 'Resume', exact: true }).click();
    }
    await handoff(page, before, mission.id);
    const frames = await page.evaluate(() => (window as any).__launchFrames as number[]);
    const sorted = frames.filter((v) => v > 0).sort((a,b) => a-b);
    const timings = { medianMs: sorted[Math.floor(sorted.length*0.5)], p95Ms: sorted[Math.floor(sorted.length*0.95)], samples: sorted.length };
    console.log(`${mission.id} launch timings: ${JSON.stringify(timings)}`);
    await info.attach('frame-times.json', { body: JSON.stringify(timings), contentType: 'application/json' });
    const after = await snapshot(page);
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__legacy);
    await page.evaluate((id) => (window as any).__legacy.useGame.getState().continueMission(id), mission.id);
    expect(await snapshot(page)).toEqual(after);
    expect(errors).toEqual([]);
  });

  test(`${mission.id}: saved launch, Arabic controls, cameras, quality, reduced motion and skip`, async ({ page }, info) => {
    await workshop(page, mission.id);
    const before = await snapshot(page);
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__legacy);
    await page.evaluate((id) => (window as any).__legacy.useGame.getState().continueMission(id), mission.id);
    await expect(page.locator('.lx-hud')).toBeVisible();
    expect(await snapshot(page)).toEqual(before);
    await page.locator('.lx-hud').getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.lx-title h1')).toHaveText(mission.title.ar ?? ar(mission.title.en));
    await page.getByRole('button', { name: 'خيارات', exact: true }).click();
    for (const camera of ['Engines', 'Pad', 'Vehicle', 'Director']) {
      await page.getByRole('combobox', { name: 'الكاميرا', exact: true }).selectOption(camera);
      await expect(page.getByRole('combobox', { name: 'الكاميرا', exact: true })).toHaveValue(camera);
    }
    await page.getByRole('combobox', { name: 'الرسوميات', exact: true }).selectOption('low');
    await page.getByRole('checkbox', { name: 'تقليل الحركة', exact: true }).check();
    const audio = page.getByRole('checkbox', { name: 'الصوت', exact: true });
    await audio.check();
    await expect(audio).toBeChecked();
    await page.screenshot({ path: info.outputPath('arabic-paused.png') });
    await page.getByRole('button', { name: ar('Skip cinematic'), exact: true }).click();
    await handoff(page, before, mission.id);
  });
}
