import { test, expect } from '@playwright/test';

test('dashboard loads and navigation works', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=GravityPath')).toBeVisible();
  await expect(page.locator('text=Next Workout')).toBeVisible();

  await page.click('text=Skill Tree');
  await expect(page.getByText('Pull-up', { exact: true })).toBeVisible();

  await page.click('text=Back');
  await expect(page.locator('text=Next Workout')).toBeVisible();
});

test('language switches to Arabic', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('text=Settings')).toBeVisible();
  await page.click('text=العربية');
  await expect(page.getByText('الإعدادات')).toBeVisible();
});
