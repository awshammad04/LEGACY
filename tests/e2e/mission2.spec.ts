import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const btn = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).first();

async function answerQuiz(page: Page, correct: RegExp[]) {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio', { name: correct[i] }).click();
    if (i < 2) await btn(page, 'Next question').click();
  }
}

test('Mission 2 can be played end to end with real recomputed results', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'Choose your mission' })).toBeVisible();
  await expect(page.getByText('3-question knowledge check')).toBeVisible();

  // Mission choice first, then the baseline quiz
  await btn(page, 'Start Mission').click();
  await expect(page.getByText('Before you launch — knowledge check')).toBeVisible();
  await answerQuiz(page, [/Check whether the complete design/, /I'm not sure/, /Life on Mars has been proven/]);
  await btn(page, 'Save baseline & continue').click();

  // Briefing: question before instruments
  await expect(page.getByRole('heading', { name: 'Which explanation will your mission test first?' })).toBeVisible();
  await expect(btn(page, /Enter the Build Workshop/)).toBeDisabled();
  await page.getByRole('radio', { name: /Ancient microbial activity/ }).click();
  await btn(page, /Enter the Build Workshop/).click();

  // Workshop: an overweight design is blocked with an exact explanation
  await expect(page.getByRole('heading', { name: 'Build your rover' })).toBeVisible();
  for (const n of ['Robotic arm', 'Abrasion & coring drill', 'X-ray chemistry spectrometer']) await btn(page, new RegExp(n)).click();
  await btn(page, 'Run Pre-Launch Readiness Review').click();
  await expect(page.getByText('Rover exceeds the landing system limit by 19 kg (469 kg vs 450 kg).')).toBeVisible();
  await expect(btn(page, 'LAUNCH MISSION')).toBeDisabled();
  await btn(page, /Return to Workshop/).click();

  // Fix the design
  for (const n of ['Heavy-lift launcher', 'terrain-relative navigation', 'Rocker-bogie chassis', 'Visual-odometry autonav', 'Large solar arrays', 'High-gain antenna \\+ relay', '4 GB recorder', 'Heated enclosure', 'Balanced scientific imager', 'UV Raman']) {
    await btn(page, new RegExp(n)).click();
  }
  await btn(page, 'Run Pre-Launch Readiness Review').click();
  await expect(page.getByRole('heading', { name: 'Mission authorization granted' })).toBeVisible();
  await btn(page, 'LAUNCH MISSION').click();

  // Orbit + puzzle hint
  await expect(page.getByRole('heading', { name: 'Orbit Explorer' })).toBeVisible();
  await expect(page.getByText(/Starlink satellites are operated by SpaceX, not NASA/)).toBeVisible();
  await btn(page, 'Perseverance Valley').click();
  await btn(page, /Perseverance \(2021/).click();
  await expect(page.getByText(/Not quite — hint/)).toBeVisible();
  await btn(page, /Perform transfer burn to Mars/).click();

  // Landing site
  await page.getByRole('radio', { name: /Delta Front/ }).click();
  await btn(page, /Begin entry, descent and landing/).click();

  // Surface: plan, uplink, drive, events
  await expect(page.getByRole('heading', { name: 'Plan the drive' })).toBeVisible();
  await btn(page, /Waypoint toward target/).click();
  await btn(page, /◎ Target rock/).click();
  await expect(page.getByText(/Mobility risk/)).toBeVisible();
  await btn(page, /Uplink drive commands/).click();
  await expect(page.getByRole('heading', { name: 'Power anomaly' })).toBeVisible({ timeout: 30_000 });
  await btn(page, /Shed non-essential loads/).click();
  await expect(page.getByRole('heading', { name: 'Solar particle event warning' })).toBeVisible();
  await btn(page, /Enter safe mode/).click();
  await btn(page, /Begin the investigation/).click();

  // Evidence: instrument-gated, alert, evidence before certainty
  await expect(page.getByRole('heading', { name: 'Choose measurements' })).toBeVisible();
  await expect(page.getByText('Not possible — this rover lacks the instrument.').first()).toBeVisible();
  const run = async (name: string) => page.locator('.slot', { hasText: name }).getByRole('button', { name: 'Run' }).click();
  await run('Panoramic context imaging');
  await run('Abrade the rock surface');
  await run('X-ray chemistry map');
  await expect(page.getByRole('heading', { name: 'Possible biosignature? Further investigation required.' })).toBeVisible();
  await btn(page, /Gather independent supporting measurements/).click();
  await run('UV Raman organics scan');
  await run('Core and cache a sample');
  await btn(page, /Write the science report/).click();

  // Report
  for (const o of ['X-ray chemistry map', 'UV Raman organics scan', 'Panoramic context imaging', 'Core and cache a sample']) {
    await page.getByRole('checkbox', { name: new RegExp(o) }).click();
  }
  for (const s of ['potential biosignature that deserves', 'Non-biological chemistry could', 'Iron-phosphate', 'Signals consistent with organic', 'Water once moved', 'A sample is cached', 'Confirming or ruling out']) {
    await page.getByRole('checkbox', { name: new RegExp(s) }).click();
  }
  await btn(page, /Send report to Earth/).click();

  // Debrief, recomputed What-If, final quiz
  await expect(page.locator('.eyebrow', { hasText: 'Mission debrief' })).toBeVisible();
  await expect(page.getByText('Careful Investigator')).toBeVisible();
  await page.getByRole('tab', { name: 'What-If machine' }).click();
  await page.locator('select').nth(2).selectOption('comms-basic');
  await btn(page, /Re-run mission with this design/).click();
  await expect(page.getByRole('columnheader', { name: 'What-If' })).toBeVisible();
  await btn(page, /Take the final knowledge check/).click();
  await answerQuiz(page, [/Redesign or reprioritize/, /Follow the applicable hazard plan/, /Not necessarily/]);
  await btn(page, 'Submit final answers').click();
  await expect(page.getByRole('heading', { name: 'Before: 1/3 · After: 3/3' })).toBeVisible();

  // Persistence: reload keeps progress and the archive
  await page.reload();
  await expect(btn(page, 'Continue Mission')).toBeVisible();
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
  await btn(page, 'Start Mission').click();
  await expect(page.getByText('Before you launch — knowledge check')).toBeVisible();
  const quiz = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(quiz.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
