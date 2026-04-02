import { expect, test, type Page } from '@playwright/test';

const REVENUE_API = '/api/revenue/{retailer}';
const REVENUE_API_ENCODED = encodeURIComponent(REVENUE_API);
const UPLOAD_SAMPLE = 'examples/upload_samples/demo_reference_internal_v5.csv';

async function ensureRevenueConfigForUploadTemplate(page: Page): Promise<void> {
  const response = await page.request.post(`/jin/api/config/${REVENUE_API_ENCODED}`, {
    data: {
      dimension_fields: ['data[].date', 'data[].label', 'retailer'],
      kpi_fields: ['data[].revenue', 'data[].orders'],
      tolerance_pct: 10,
      tolerance_relaxed: 20,
      tolerance_normal: 10,
      tolerance_strict: 5,
      active_tolerance: 'normal',
      confirmed: true,
      time_field: 'data[].date',
      time_granularity: 'day',
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function openApiTab(page: Page, tab: 'summary' | 'uploads' | 'history'): Promise<void> {
  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=${tab}`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);
  const expectedTab = tab;
  const currentTab = () => new URL(page.url()).searchParams.get('y_tab');
  if (currentTab() !== expectedTab) {
    await page.locator(`[data-wizard-step="${tab}"]`).first().click();
  }
  await expect.poll(currentTab).toBe(expectedTab);
}

async function uploadBaselineReference(page: Page): Promise<void> {
  await ensureRevenueConfigForUploadTemplate(page);
  await openApiTab(page, 'uploads');
  await page.setInputFiles('#upload-file', UPLOAD_SAMPLE);
  await page.click('#preview-upload-button');
  await expect(page.locator('#upload-preview-step')).toBeVisible();
  await expect(page.locator('#upload-button')).toBeVisible();
  await page.click('#upload-button');
  await expect
    .poll(async () => (await page.locator('#upload-feedback').textContent()) || '', {
      timeout: 45_000,
    })
    .toMatch(/Imported|failed|Failed/i);
  const currentTab = () => new URL(page.url()).searchParams.get('y_tab');
  if (currentTab() !== 'history') {
    await page.locator('[data-wizard-step="history"]').first().click();
  }
  await expect.poll(currentTab).toBe('history');
}

test('upload switches to monitor/history and shows upload analysis', async ({ page }) => {
  await uploadBaselineReference(page);

  const historySection = page.locator('[data-api-section="history"]');
  await expect(historySection).toBeVisible();
  await expect(historySection.getByRole('heading', { name: 'Checks' })).toBeVisible();
  await expect(historySection.getByRole('button', { name: /Examine details|Set baseline/i }).first()).toBeVisible();
});

test('Open Uploads button takes user to uploads tab', async ({ page }) => {
  await uploadBaselineReference(page);
  await openApiTab(page, 'summary');

  await page.locator('#api-trends').getByRole('button', { name: 'Open Uploads' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
  await expect(page.locator('#upload-file')).toBeVisible();
});

test('upload analysis history rows can reopen monitor details', async ({ page }) => {
  await uploadBaselineReference(page);
  await openApiTab(page, 'uploads');
  await page.locator('[data-wizard-step="uploads"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');

  const historyTable = page.locator('#upload-activity table.row-table').first();
  await expect(historyTable).toBeVisible();
  await historyTable.getByRole('button', { name: /Open|Viewing/i }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('history');
  await expect(page.locator('#api-monitoring-progress')).toContainText(/Upload Analysis|Action Required|Data Quality/i);
});

test('browser back/forward restores selected API tab state', async ({ page }) => {
  await openApiTab(page, 'summary');

  await page.locator('[data-wizard-step="uploads"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');

  await page.locator('[data-wizard-step="history"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('history');

  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');

  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('summary');

  await page.goForward();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
});

test('summary shows a clear 5-step checklist with one next action after upload', async ({ page }) => {
  await uploadBaselineReference(page);
  await openApiTab(page, 'summary');

  const starter = page.locator('#api-start-panel');
  await expect(starter).toBeVisible();
  await expect(starter).toContainText('What to do next');
  await expect(starter).toContainText('Identify segments & metrics');
  await expect(starter).toContainText('Set baselines');
  await expect(starter).toContainText('Monitor checks');
  await expect(starter).toContainText('Review issues');
  await expect(starter).toContainText('Generate report');
  await expect(starter.getByRole('button', { name: /Open Monitor|Open Issues|Open Reports/i }).first()).toBeVisible();
});

test('configuration keeps roles and time controls editable when PO mode is off', async ({ page }) => {
  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=configuration`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);

  const poModeToggle = page.locator('#po-mode-toggle');
  await expect(poModeToggle).not.toBeChecked();

  const focusedViewCard = page.locator('#field-role-grid').getByText('Focused view');
  if (await focusedViewCard.count()) {
    await expect(focusedViewCard.first()).toBeVisible();
    await page.getByRole('button', { name: 'Show all fields' }).first().click();
    await expect(page.locator('#field-role-grid')).toContainText(/Showing all .* fields|Use focused view/i);
  }

  const firstRoleCard = page.locator('.field-role-card').first();
  const segmentButton = firstRoleCard.locator('button[data-role="dimension"]');
  const excludeButton = firstRoleCard.locator('button[data-role="exclude"]');

  await expect(segmentButton).toBeEnabled();
  await expect(excludeButton).toBeEnabled();

  await excludeButton.click();
  await expect(excludeButton).toHaveClass(/active/);
  await segmentButton.click();
  await expect(segmentButton).toHaveClass(/active/);

  const timeRoleCard = page
    .locator('.field-role-card')
    .filter({ has: page.locator('[data-role="time"]') })
    .filter({ hasText: /date|time|snapshot/i })
    .first();
  await expect(timeRoleCard).toBeVisible();

  const timeButton = timeRoleCard.locator('button[data-role="time"]');
  await expect(timeButton).toBeEnabled();
  await timeButton.click();
  await expect(timeButton).toHaveClass(/active/);
  await expect(page.locator('#field-role-grid')).not.toContainText('Waiting for sample API data');
  await expect(page.locator('#field-role-grid')).toContainText(/Setup is not blocked|No sample run yet|No recent sample yet|Chronology Pulse/i);

  const timeSettingsToggle = timeRoleCard.locator('a.tweak-link').first();
  await expect(timeSettingsToggle).toBeVisible();
  await timeSettingsToggle.click();

  const granularitySelect = timeRoleCard.locator('.time-settings-tweak select').first();
  await expect(granularitySelect).toBeVisible();
  await granularitySelect.selectOption('week');
  await expect(granularitySelect).toHaveValue('week');
});

test('configuration keeps core role and time controls editable in PO Mode', async ({ page }) => {
  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=configuration`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);

  const poModeToggle = page.locator('#po-mode-toggle');
  await poModeToggle.check();
  await expect(poModeToggle).toBeChecked();

  await expect(page.locator('#field-role-grid')).toContainText('PO Mode keeps advanced sections simplified');

  const firstRoleCard = page.locator('.field-role-card').first();
  const segmentButton = firstRoleCard.locator('button[data-role="dimension"]');
  await expect(segmentButton).toBeEnabled();
  await segmentButton.click();
  await expect(segmentButton).toHaveClass(/active/);

  const timeRoleCard = page
    .locator('.field-role-card')
    .filter({ has: page.locator('[data-role="time"]') })
    .filter({ hasText: /date|time|snapshot/i })
    .first();
  const timeButton = timeRoleCard.locator('button[data-role="time"]');
  await expect(timeButton).toBeEnabled();
  await timeButton.click();

  const timeSettingsToggle = timeRoleCard.locator('a.tweak-link').first();
  await expect(timeSettingsToggle).toBeVisible();
  await timeSettingsToggle.click();
  await expect(timeRoleCard.locator('.time-settings-tweak')).toBeVisible();
});
