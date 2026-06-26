import { test, expect } from '@playwright/test';

test('onboarding selects handstand primary and Day 1 shows handstand skill', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText('Goal Template')).toBeVisible();

  await page.getByTestId('priority-handstand-primary').click();
  await page.getByText('Save').click();

  await page.goto('/');
  await expect(page.getByText('Primary: Handstand & HSPU')).toBeVisible();

  await page.goto('/workout/day1');
  await expect(page.getByTestId('exercise-name-handstand-wall')).toBeVisible();
});

test('switching primary to front lever updates Day 3 skill slot', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('Skill Priorities')).toBeVisible();

  await page.getByTestId('settings-priority-front-lever-primary').click();
  await page.getByText('Apply Priorities').click();

  await page.goto('/');
  await expect(page.getByText('Primary: Front Lever')).toBeVisible();

  await page.goto('/workout/day3');
  await expect(page.getByTestId('exercise-name-tuck-front-lever')).toBeVisible();
});
