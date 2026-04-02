import { expect, test } from '@playwright/test';

const REVENUE_API = '/api/revenue/{retailer}';
const REVENUE_API_ENCODED = encodeURIComponent(REVENUE_API);

test('no baseline run guides user to set baseline from monitor table', async ({ page, request }) => {
  const observe = await request.get('/api/revenue/walmart?dates=2026-03-19');
  expect(observe.ok()).toBeTruthy();

  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=history`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);

  const historySection = page.locator('[data-api-section="history"]');
  await expect(historySection).toBeVisible();
  await expect(historySection.getByText(/needs baseline|baseline required/i).first()).toBeVisible();

  await historySection.getByRole('button', { name: 'Set baseline' }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
  await expect(page.locator('#upload-file')).toBeVisible();
});
