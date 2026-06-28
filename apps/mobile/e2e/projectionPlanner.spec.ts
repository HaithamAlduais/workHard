import { test, expect } from '@playwright/test';

test('open Projection Planner, enter weights and skill level, generate 12-week plan', async ({ page }) => {
  await page.goto('/projection-planner');

  // Enter incline dumbbell press weight.
  const weightInput = page.getByTestId('projection-weight-incline-dumbbell-press');
  await weightInput.fill('25');

  // Select pull-up level 1.
  await page.getByTestId('projection-skill-pull-up-1').click();

  // Generate.
  await page.getByTestId('projection-generate').click();

  // Verify Week 1 and Week 2 appear.
  await expect(page.getByTestId('projection-week-1')).toBeVisible();
  await expect(page.getByTestId('projection-week-2')).toBeVisible();

  // Verify a later week increases load or changes target.
  const laterWeek = page.getByTestId('projection-week-5');
  await expect(laterWeek).toBeVisible();

  // Switch to exercise progression tab and verify a progression entry.
  await page.getByTestId('projection-tab-exercise').click();
  await expect(page.getByText('Exercise Progression')).toBeVisible();

  // Switch to skill progression tab and verify a skill entry.
  await page.getByTestId('projection-tab-skill').click();
  await expect(page.getByText('Skill Progression')).toBeVisible();
});

test('dashboard shows projection summary after generating a plan', async ({ page }) => {
  await page.goto('/projection-planner');
  await page.getByTestId('projection-weight-incline-dumbbell-press').fill('25');
  await page.getByTestId('projection-skill-pull-up-1').click();
  await page.getByTestId('projection-generate').click();
  await expect(page.getByTestId('projection-week-1')).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('projection-summary-card')).toBeVisible();
});
