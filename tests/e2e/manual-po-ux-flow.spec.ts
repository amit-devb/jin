import { expect, test } from '@playwright/test';

const REVENUE_API = '/api/revenue/{retailer}';
const REVENUE_API_ENCODED = encodeURIComponent(REVENUE_API);

test('manual PO can move through every primary page and stay oriented', async ({ page }) => {
  await page.goto('/jin?y_view=overview');

  const views = [
    { navView: 'overview', view: 'overview', section: '#view-overview' },
    { navView: 'playbook', view: 'playbook', section: '#view-playbook' },
    { navView: 'api', view: 'api', section: '#view-api' },
    { navView: 'incidents', view: 'incidents', section: '#view-incidents' },
    { navView: 'scheduler', view: 'scheduler', section: '#view-scheduler' },
    { navView: 'reports', view: 'reports', section: '#view-reports' },
    { navView: 'settings', view: 'settings', section: '#view-settings' },
  ] as const;

  for (const target of views) {
    await page.locator(`.nav button[data-view="${target.navView}"]`).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe(target.view);
    await expect(page.locator(target.section)).toBeVisible();
    await expect(page.locator('#view-guide')).toContainText('What this page is for');
    await expect(page.locator('#view-guide')).toContainText('Primary next action');
    await expect(page.locator('#view-guide-action')).toBeVisible();
  }
});

test('manual PO can navigate api setup steps and reach key controls quickly', async ({ page, request }) => {
  const observe = await request.get('/api/revenue/walmart?dates=2026-03-19');
  expect(observe.ok()).toBeTruthy();

  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=configuration`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);
  await expect(page.locator('[data-api-section="configuration"]')).toBeVisible();

  const poModeToggle = page.locator('#po-mode-toggle');
  await expect(poModeToggle).toBeVisible();
  if (await poModeToggle.isChecked()) {
    await poModeToggle.click();
  }

  const firstRoleCard = page.locator('.field-role-card').first();
  await expect(firstRoleCard).toBeVisible();
  await firstRoleCard.locator('button[data-role="dimension"]').click();
  await expect(firstRoleCard).toContainText(/segment|dimension/i);

  await page.locator('[data-api-tab="uploads"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
  await expect(page.locator('#upload-file')).toBeVisible();
  await expect(page.locator('#template-csv-link-upload')).toBeVisible();

  await page.locator('[data-api-tab="history"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('history');
  await expect(page.locator('[data-api-section="history"]')).toBeVisible();
  await expect(page.locator('#api-run-table')).toBeVisible();

  await page.locator('[data-api-tab="configuration"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('configuration');
  await expect(page.locator('#save-config-story-button')).toBeVisible();
});

test('manual PO can move between Issues and Errors without losing context', async ({ page }) => {
  await page.goto('/jin?y_view=incidents');
  await expect(page.locator('#incident-status-select')).toBeVisible();
  await expect(page.locator('#incidents-list')).toBeVisible();

  await page.locator('#view-incidents button[data-view="errors"]').first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe('errors');
  await expect(page.locator('#errors-list')).toBeVisible();
  await expect(page.locator('#view-errors button[data-view="incidents"]').first()).toBeVisible();

  await page.locator('#view-errors button[data-view="incidents"]').first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe('incidents');
  await expect(page.locator('#incident-status-select')).toBeVisible();
});

test('inventory api default sku_group=all returns data for watch-friendly defaults', async ({ request }) => {
  const response = await request.get('/api/inventory/amazon?dates=2026-03-19');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload?.retailer).toBe('amazon');
  expect(Array.isArray(payload?.data)).toBeTruthy();
  expect((payload?.data || []).length).toBeGreaterThan(0);
  expect(payload.data[0]?.sku_group).toBe('all');
});
