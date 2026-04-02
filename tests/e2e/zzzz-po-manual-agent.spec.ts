import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const REVENUE_API = '/api/revenue/{retailer}';
const INVENTORY_API = '/api/inventory/{retailer}';
const REVENUE_API_ENCODED = encodeURIComponent(REVENUE_API);
const INVENTORY_API_ENCODED = encodeURIComponent(INVENTORY_API);
const TEST_DATE = '2026-03-19';

type RevenueSample = {
  retailer: string;
  revenue: number;
  orders: number;
};

type InventorySample = {
  retailer: string;
  inStock: number;
  sellThrough: number;
};

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: Array<Array<string | number>>): Buffer {
  const lines = rows.map((row) => row.map((cell) => csvCell(cell)).join(','));
  return Buffer.from(`${lines.join('\n')}\n`, 'utf-8');
}

function buildRevenueMismatchCsv(samples: RevenueSample[]): Buffer {
  const rows: Array<Array<string | number>> = [
    [
      'endpoint',
      'dimension_fields',
      'kpi_fields',
      'grain_data[].label',
      'grain_retailer',
      'expected_data[].revenue',
      'expected_data[].orders',
      'tolerance_pct',
    ],
  ];

  samples.forEach((sample) => {
    rows.push([
      REVENUE_API,
      'data[].label,retailer',
      'data[].revenue,data[].orders',
      'current',
      sample.retailer,
      Number((sample.revenue * 0.2).toFixed(2)),
      Math.max(1, Math.floor(sample.orders * 0.2)),
      5,
    ]);
  });

  return rowsToCsv(rows);
}

function buildInventoryMatchedCsv(sample: InventorySample): Buffer {
  return rowsToCsv([
    [
      'endpoint',
      'dimension_fields',
      'kpi_fields',
      'grain_data[].label',
      'grain_data[].sku_group',
      'grain_retailer',
      'expected_data[].in_stock',
      'expected_data[].sell_through',
      'tolerance_pct',
    ],
    [
      INVENTORY_API,
      'data[].label,data[].sku_group,retailer',
      'data[].in_stock,data[].sell_through',
      'current',
      'all',
      sample.retailer,
      sample.inStock,
      Number(sample.sellThrough.toFixed(4)),
      5,
    ],
  ]);
}

async function fetchRevenueSample(
  request: APIRequestContext,
  retailer: string,
): Promise<RevenueSample> {
  const response = await request.get(`/api/revenue/${retailer}?dates=${TEST_DATE}`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const first = (payload?.data || [])[0] || {};
  return {
    retailer,
    revenue: Number(first.revenue || 0),
    orders: Number(first.orders || 0),
  };
}

async function fetchInventorySample(request: APIRequestContext, retailer: string): Promise<InventorySample> {
  const response = await request.get(`/api/inventory/${retailer}?sku_group=all&dates=${TEST_DATE}`);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const first = (payload?.data || [])[0] || {};
  return {
    retailer,
    inStock: Number(first.in_stock || 0),
    sellThrough: Number(first.sell_through || 0),
  };
}

async function ensureDashboardAccess(page: Page): Promise<void> {
  await page.goto('/jin?y_view=api');
  if (/\/jin\/login(\?|$)/.test(page.url())) {
    const username = process.env.JIN_E2E_USERNAME || process.env.JIN_USERNAME || '';
    const password = process.env.JIN_E2E_PASSWORD || process.env.JIN_PASSWORD || '';
    expect(username, 'Set JIN_E2E_USERNAME/JIN_E2E_PASSWORD when auth is enabled for this flow.').not.toBe('');
    expect(password, 'Set JIN_E2E_USERNAME/JIN_E2E_PASSWORD when auth is enabled for this flow.').not.toBe('');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/jin(\?|$)/);
  }
  await expect(page.locator('#nav')).toBeVisible();
}

async function chooseRole(
  page: Page,
  fieldName: string,
  role: 'dimension' | 'kpi' | 'time',
  fallbackMatcher?: RegExp,
): Promise<void> {
  const byFieldName = page.locator(`.field-role-card[data-field-name="${fieldName}"]`);
  const card = (await byFieldName.count()) > 0
    ? byFieldName.first()
    : page.locator('.field-role-card').filter({ hasText: fallbackMatcher || new RegExp(fieldName, 'i') }).first();
  await expect(card).toBeVisible();
  const button = card.locator(`button[data-role="${role}"]`);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toHaveClass(/active/);
}

async function configureRevenueApi(page: Page): Promise<void> {
  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=configuration`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);
  await chooseRole(page, 'retailer', 'dimension');
  await chooseRole(page, 'data[].date', 'time', /date/i);
  await chooseRole(page, 'data[].revenue', 'kpi', /revenue/i);
  await chooseRole(page, 'data[].orders', 'kpi', /orders/i);
  await page.click('#save-config-story-button');
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
}

async function configureInventoryApi(page: Page): Promise<void> {
  await page.goto(`/jin?y_view=api&y_api=${INVENTORY_API_ENCODED}&y_tab=configuration`);
  await expect(page.locator('#api-title')).toContainText(INVENTORY_API);
  await chooseRole(page, 'retailer', 'dimension');
  await chooseRole(page, 'data[].sku_group', 'dimension', /sku_group|sku group/i);
  await chooseRole(page, 'data[].snapshot_date', 'time', /snapshot|date/i);
  await chooseRole(page, 'data[].in_stock', 'kpi', /in_stock|in stock/i);
  await chooseRole(page, 'data[].sell_through', 'kpi', /sell_through|sell through/i);
  await page.click('#save-config-story-button');
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
}

async function uploadCsv(page: Page, filename: string, csvBuffer: Buffer): Promise<void> {
  await expect(page.locator('#upload-file')).toBeVisible();
  await page.setInputFiles('#upload-file', {
    name: filename,
    mimeType: 'text/csv',
    buffer: csvBuffer,
  });
  await page.click('#preview-upload-button');
  await expect(page.locator('#upload-preview-step')).toBeVisible();
  await page.click('#upload-button');
  await expect
    .poll(async () => (await page.locator('#upload-feedback').textContent()) || '', { timeout: 60_000 })
    .toMatch(/Imported|failed|Failed/i);
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('history');
}

test.setTimeout(180_000);

test('PO manual agent flow: configure, upload wrong/right data, triage, report, schedule watch', async ({ page, request }) => {
  await ensureDashboardAccess(page);

  const revenueSamples = await Promise.all([
    fetchRevenueSample(request, 'amazon'),
    fetchRevenueSample(request, 'shopify'),
    fetchRevenueSample(request, 'walmart'),
  ]);
  const inventorySample = await fetchInventorySample(request, 'amazon');

  await configureRevenueApi(page);
  await uploadCsv(page, 'po-revenue-mismatch.csv', buildRevenueMismatchCsv(revenueSamples));

  const revenueMonitoring = page.locator('#api-monitoring-progress');
  await expect(revenueMonitoring).toContainText(/Upload Analysis Found Mismatches/i);
  await revenueMonitoring.getByRole('button', { name: 'Open Issues' }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe('incidents');
  await expect
    .poll(async () => await page.locator('#incidents-list .issue-card').count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await expect(page.locator('#incidents-list')).toContainText(REVENUE_API);

  await configureInventoryApi(page);
  await uploadCsv(page, 'po-inventory-matched.csv', buildInventoryMatchedCsv(inventorySample));

  const inventoryMonitoring = page.locator('#api-monitoring-progress');
  await expect(inventoryMonitoring).toContainText(/Upload Analysis Passed|matched/i);

  await page.goto('/jin?y_view=reports');
  await expect(page.locator('#run-report-button')).toBeVisible();
  await page.click('#run-report-button');
  await expect(page.locator('#reports-feedback')).toContainText('Report pack generated');
  await expect(page.locator('#reports-content')).toContainText('Leadership Digest');
  await expect(page.locator('#reports-content')).toContainText('Recommended Next Step');

  await page.goto('/jin?y_view=playbook');
  await page.fill('#project-policy-schedule', 'every 2h');
  await page.click('#project-policy-save-button');
  await expect
    .poll(async () => (await page.locator('#project-workflow-feedback').textContent())?.trim() || '', { timeout: 90_000 })
    .toMatch(/saved and applied|re-applied/i);

  await page.goto('/jin?y_view=scheduler');
  await expect(page.locator('#scheduler-list')).toBeVisible();
  const watchRow = page.locator('#scheduler-list tbody tr').filter({ hasText: '/api/' }).first();
  await expect(watchRow).toBeVisible();
  const runResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/jin/api/v2/scheduler/')
    && response.url().endsWith('/run')
    && response.status() === 200
  ));
  await watchRow.getByRole('button', { name: 'Run Now' }).click();
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await page.locator('#confirm-accept').click();
  const runResponse = await runResponsePromise;
  const runPayload = await runResponse.json();
  expect(runPayload?.ok).toBeTruthy();
  expect(runPayload?.started).toBeTruthy();
});
