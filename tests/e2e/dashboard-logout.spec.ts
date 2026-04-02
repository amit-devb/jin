import { expect, test } from '@playwright/test';

test('logout sends operator to login page', async ({ page }) => {
  await page.goto('/jin?y_view=overview');
  await expect(page.locator('#logout-button')).toBeVisible();

  await page.click('#logout-button');

  await expect(page).toHaveURL(/\/jin\/login(\?|$)/);
  await expect(page.locator('h1')).toContainText('Jin');
  await expect(page.locator('body')).toContainText('You are signed out.');
});
