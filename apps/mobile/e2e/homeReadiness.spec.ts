import { test, expect } from '@playwright/test';

test('onboarding with equipment, contract selection, home readiness and replacement review', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText('Equipment Inventory')).toBeVisible();

  await page.getByTestId('equipment-pull-up-bar').click();
  await page.getByTestId('equipment-rings').click();

  await page.getByTestId('graduation-PRACTICAL_HOME_INDEPENDENCE').click();

  await page.getByText('Save').click();

  await page.goto('/');
  await expect(page.getByTestId('menu-home-readiness')).toBeVisible();

  await page.getByTestId('menu-home-readiness').click();
  await expect(page).toHaveURL('/home-readiness');
  await expect(page.getByTestId('home-readiness-title')).toBeVisible();
  await expect(page.getByTestId('pattern-VERTICAL_PULL')).toBeVisible();

  // Unblock a pattern by toggling an additional piece of equipment.
  await page.getByTestId('home-readiness-equipment-wall').click();
  await expect(page.getByTestId('pattern-VERTICAL_PUSH')).toBeVisible();

  await page.goto('/weekly-review');
  await expect(page.getByText('Replacement Candidates', { exact: true })).toBeVisible();

  const approveButton = page.locator('[data-testid^="approve-replacement-"]').first();
  if (await approveButton.isVisible().catch(() => false)) {
    await approveButton.click();
    await expect(page.getByText('Approved').first()).toBeVisible();
  } else {
    await expect(page.getByText('No replacement candidates this week.')).toBeVisible();
  }
});
