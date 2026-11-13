import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).first();

async function answerQuiz(page: Page, correct: RegExp[]) {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio', { name: correct[i] }).click();
    await page.waitForTimeout(600);
  }
}

test('Mission 2 can be played end to end with real recomputed results', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'Choose your mission' })).toBeVisible();
  await expect(page.getByText('3-question knowledge check')).toBeVisible();

  // Mission choice first, then the baseline quiz
  await page.locator('article', { hasText: 'The Martian Mystery' }).getByRole('button', { name: 'Start Mission' }).click();
  await expect(page.getByText('Before you launch — knowledge check')).toBeVisible();
  await answerQuiz(page, [/Check whether the complete design/, /I'm not sure/, /Life on Mars has been proven/]);

  // Briefing: question before instruments
  await expect(page.getByText('Find out what made the leopard spots on a mysterious Mars rock.')).toBeVisible();
  await page.getByRole('radio', { name: /Ancient microbial activity/ }).click();

  // Workshop: an overweight design is blocked with an exact explanation
  await expect(page.getByRole('heading', { name: 'Build your rover' })).toBeVisible();
  await expect(page.getByText('Balanced Explorer')).toBeVisible();
  await page.getByText('Customize parts (advanced)').click();
  for (const n of ['Robotic arm', 'Abrasion & coring drill', 'X-ray chemistry spectrometer']) await btn(page, new RegExp(n)).click();
  await btn(page, 'Run Pre-Launch Readiness Review').click();
  await expect(page.getByText('Rover exceeds the landing system limit by 19 kg (469 kg vs 450 kg).')).toBeVisible();
  await expect(btn(page, 'LAUNCH MISSION')).toBeDisabled();
  await btn(page, /Return to Workshop/).click();

  // Fix the design with the recommended package, then launch in one click
  await page.locator('.pkg-card', { hasText: 'Balanced Explorer' }).click();
  await expect(page.getByText('Ready to launch ✓')).toBeVisible();
  await btn(page, /LAUNCH MISSION/).click();

  // Orbit + puzzle hint
  await expect(page.getByText('In orbit around Earth')).toBeVisible();
  await expect(page.getByText(/Starlink satellites are operated by SpaceX, not NASA/)).toBeVisible();
  await btn(page, /Continue to Mars/).click();

  // Landing site (best reachable site is preselected)
  await expect(page.getByRole('radio', { name: /Delta Front/ })).toHaveAttribute('aria-checked', 'true');
  await btn(page, /Begin entry, descent and landing/).click();

  // Surface: free-roaming exploration
  await expect(page.getByText('Is there a sign of ancient life in this rock?')).toBeVisible();
  await btn(page, "Let's go!").click();
  await expect(page.locator('.checklist li.current', { hasText: 'Find the leopard-spot rock' })).toBeVisible();
  await page.locator('canvas').first().click({ position: { x: 640, y: 450 } });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyW');
  await expect.poll(() => page.evaluate(() => (window as any).__legacy.useGame.getState().state.ops.distanceU), { timeout: 20000 }).toBeGreaterThan(0);
  // Test hook: jump the rest of the way to the rock (the drive itself is covered above)
  await page.evaluate(() => (window as any).__legacy.useGame.getState().dispatch({ type: 'DRIVE', dist: 150, slopeAvg: 4, boostFrac: 0, bumps: 0, pos: [62, -244], heading: 0.5 }));
  await expect(page.locator('.event-card', { hasText: 'Power anomaly' })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.event-card', { hasText: 'Solar particle event warning' })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('.prompt', { hasText: 'Investigate Leopard-Spot Rock' })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.locator('.action-panel')).toBeVisible();
  for (const k of ['1', '3', '4']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(250);
  }
  await expect(page.locator('.event-card', { hasText: 'Possible biosignature?' })).toBeVisible();
  await page.keyboard.press('2');
  const dust = page.locator('.event-card', { hasText: 'Dust storm approaching' });
  if (await dust.isVisible()) await page.keyboard.press('2');
  if (!(await page.locator('.action-panel').isVisible())) await page.keyboard.press('e');
  await expect(page.locator('.action-panel')).toBeVisible();
  for (const k of ['5', '6']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(250);
    if (await dust.isVisible()) await page.keyboard.press('2');
  }
  await expect.poll(() => page.evaluate(() => (window as any).__legacy.useGame.getState().state.evidence.observations.length)).toBe(5);
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
  await page.getByRole('button', { name: /A potential biosignature/ }).click();

  // Debrief, recomputed What-If, final quiz
  await expect(page.locator('.eyebrow', { hasText: 'Mission debrief' })).toBeVisible();
  await expect(page.getByText('What your choices changed')).toBeVisible();
  await expect(page.getByText('Careful Investigator')).toBeVisible();
  await page.getByRole('tab', { name: 'What-If machine' }).click();
  await page.locator('select').nth(2).selectOption('comms-basic');
  await btn(page, /Re-run mission with this design/).click();
  await expect(page.getByRole('columnheader', { name: 'What-If' })).toBeVisible();
  await btn(page, /Take the final knowledge check/).click();
  await answerQuiz(page, [/Redesign or reprioritize/, /Follow the applicable hazard plan/, /Not necessarily/]);
  await expect(page.getByRole('heading', { name: 'Before: 1/3 · After: 3/3' })).toBeVisible();

  // Persistence: reload keeps progress and the archive
  await page.reload();
  await expect(page.locator('article', { hasText: 'The Martian Mystery' }).getByRole('button', { name: 'Continue Mission' })).toBeVisible();
  await btn(page, 'Legacy Archive').click();
  await expect(page.getByText('Cheyava Falls: the "leopard spots" rock')).toBeVisible();
});

test('Arabic switches the whole layout to right-to-left', async ({ page }) => {
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('home and quiz screens have no serious accessibility violations', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'Choose your mission' })).toBeVisible();
  const home = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(home.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await page.locator('article', { hasText: 'The Martian Mystery' }).getByRole('button', { name: 'Start Mission' }).click();
  await expect(page.getByText('Before you launch — knowledge check')).toBeVisible();
  const quiz = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(quiz.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

test('Mission 04: build a telescope, launch, observe the supernova over 3 nights, report', async ({ page }) => {
  await page.goto('/?test=1');
  await page.locator('article', { hasText: 'The Cosmic Photographer' }).getByRole('button', { name: 'Start Mission' }).click();
  await answerQuiz(page, [/Check whether the complete design/, /Review the hazard plan/, /It deserves follow-up/]);
  await page.getByRole('radio', { name: /What is it made of/ }).click();
  await expect(page.getByRole('heading', { name: 'Build your observatory' })).toBeVisible();
  await page.locator('.pkg-card', { hasText: 'UV Hunter' }).click();
  await expect(page.getByText('Ready to launch ✓')).toBeVisible();
  await btn(page, /LAUNCH MISSION/).click();
  await expect(page.getByRole('heading', { name: 'Catch the supernova' })).toBeVisible();
  await btn(page, /Point at the Pinwheel Galaxy/).click();
  await btn(page, /3. Take image/).click();
  await btn(page, /Next night/).click();
  const safe = page.locator('.event-card', { hasText: 'Solar storm warning' });
  if (await safe.isVisible()) await page.keyboard.press('1');
  await btn(page, /Point at the Pinwheel Galaxy/).click();
  await btn(page, /3. Take image/).click();
  await btn(page, /Next night/).click();
  await btn(page, /Point at the Pinwheel Galaxy/).click();
  await btn(page, /3. Take image/).click();
  await btn(page, /Send results/).click();
  await btn(page, /brightness changed over the nights/).click();
  await expect(page.locator('.eyebrow', { hasText: 'Mission debrief' })).toBeVisible();
});

test('Mission 01: life aboard with crew health, then a safe moonwalk', async ({ page }) => {
  await page.goto('/?test=1');
  await page.locator('article', { hasText: 'Echoes of Apollo' }).getByRole('button', { name: 'Start Mission' }).click();
  await answerQuiz(page, [/Check whether the complete design/, /Review the hazard plan/, /Document it from a safe distance/]);
  await page.getByRole('radio', { name: /Document Apollo 15 heritage/ }).click();
  await page.locator('.pkg-card', { hasText: 'Apollo-style Rover Team' }).click();
  await btn(page, /LAUNCH MISSION/).click();
  await btn(page, /Continue to the Moon/).click();
  // Life aboard: five quick choices with live crew health
  await expect(page.getByRole('heading', { name: 'A day in space' })).toBeVisible();
  await expect(page.getByText('Crew health').first()).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('1');
    await page.waitForTimeout(1900);
  }
  await btn(page, /Land on the Moon/).click();
  await btn(page, "Let's go!").click();
  await expect(page.getByText('Suit oxygen')).toBeVisible();
  // Test hook: drive to the boundary of the Apollo 15 site
  await page.evaluate(() => (window as any).__legacy.useGame.getState().dispatch({ type: 'DRIVE', dist: 200, slopeAvg: 3, boostFrac: 0, bumps: 0, pos: [-161, 45], heading: 0 }));
  await expect(page.locator('.prompt', { hasText: 'Apollo 15 Site' })).toBeVisible();
  await page.keyboard.press('e');
  await page.keyboard.press('1');
  await expect.poll(() => page.evaluate(() => (window as any).__legacy.useGame.getState().state.evidence.observations.length)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
  await btn(page, /Send summary to Earth/).click();
  await expect(page.getByText('Heritage Protector')).toBeVisible();
});
