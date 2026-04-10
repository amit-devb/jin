import { expect, test } from '@playwright/test';

const REVENUE_API = '/api/revenue/{retailer}';
const REVENUE_API_ENCODED = encodeURIComponent(REVENUE_API);

function utf8Bytes(text: string): Uint8Array {
  // Minimal UTF-8 encoder so this spec does not require Node's Buffer types.
  const encoded = unescape(encodeURIComponent(text));
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) out[i] = encoded.charCodeAt(i);
  return out;
}

function buildMismatchCsv(): Uint8Array {
  const header = [
    'endpoint',
    'dimension_fields',
    'kpi_fields',
    'grain_data[].label',
    'grain_retailer',
    'expected_data[].revenue',
    'expected_data[].orders',
    'tolerance_pct',
  ].join(',');

  const retailers = ['amazon', 'shopify', 'walmart'];
  const rows: string[] = [header];

  retailers.forEach((retailer) => {
    rows.push(
      [
        `"/api/revenue/{retailer}"`,
        `"data[].label,retailer"`,
        `"data[].revenue,data[].orders"`,
        'current',
        retailer,
        '1',
        '1',
        '1',
      ].join(','),
    );
  });

  return utf8Bytes(`${rows.join('\n')}\n`);
}

test('MVP acceptance: configure, upload mismatch, review issue, resolve', async ({ page }) => {
  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=configuration`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);
  await expect(page.locator('#po-mode-toggle')).not.toBeChecked();

  const retailerCard = page.locator('.field-role-card', { hasText: 'retailer' }).first();
  await expect(retailerCard).toBeVisible();
  await retailerCard.locator('button[data-role="dimension"]').click();

  const revenueCard = page.locator('.field-role-card', { hasText: /revenue/i }).first();
  await expect(revenueCard).toBeVisible();
  await revenueCard.locator('button[data-role="kpi"]').click();

  const timeCard = page.locator('.field-role-card').filter({ hasText: /date|snapshot/i }).first();
  await expect(timeCard).toBeVisible();
  await timeCard.locator('button[data-role="time"]').click();
  const tweakLink = timeCard.locator('a.tweak-link').first();
  await expect(tweakLink).toBeVisible();
  await tweakLink.click();
  const granularitySelect = timeCard.locator('.time-settings-tweak select').first();
  await expect(granularitySelect).toBeVisible();
  await granularitySelect.selectOption('week');
  await expect(granularitySelect).toHaveValue('week');

  await page.click('#save-config-story-button');
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');

  await page.setInputFiles('#upload-file', {
    name: 'mvp-mismatch.csv',
    mimeType: 'text/csv',
    // Playwright accepts a Node Buffer here, but Uint8Array works at runtime.
    buffer: buildMismatchCsv() as any,
  });
  await page.click('#preview-upload-button');
  await expect(page.locator('#upload-preview-step')).toBeVisible();
  await page.click('#upload-button');
  await expect
    .poll(async () => (await page.locator('#upload-feedback').textContent()) || '', { timeout: 45_000 })
    .toMatch(/Imported|failed|Failed/i);

  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('history');
  const monitoringProgress = page.locator('#api-monitoring-progress');
  await expect(monitoringProgress).toContainText(/Upload Analysis Found Mismatches/i);
  await expect(monitoringProgress).toContainText(/Issues/i);
  await expect(monitoringProgress).toContainText(/Recommended next step/i);
  await expect(monitoringProgress).toContainText(/Confidence/i);
  await monitoringProgress.getByRole('button', { name: /Review Issues|Open Issues/i }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe('incidents');

  const issueRows = page.locator('#incidents-list .issue-card');
  await expect
    .poll(async () => await issueRows.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
  const countBeforeRefresh = await issueRows.count();
  expect(countBeforeRefresh).toBeGreaterThan(0);

  await page.reload();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe('incidents');
  const issueRowsAfterRefresh = page.locator('#incidents-list .issue-card');
  await expect
    .poll(async () => await issueRowsAfterRefresh.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);

  await page.locator('#incident-status-select').selectOption('resolved');
  const incidentsPanel = page.locator('#incidents-list');
  await expect
    .poll(async () => ((await incidentsPanel.textContent()) || '').trim(), { timeout: 10_000 })
    .toMatch(/No issues match these filters|Resolved|Open Details/i);
  const clearFiltersButton = page.getByRole('button', { name: 'Clear filters' });
  if (await clearFiltersButton.count()) {
    await clearFiltersButton.click();
  } else {
    await page.locator('#incident-status-select').selectOption('');
  }
  await expect(page.locator('#incident-status-select')).toHaveValue(/^(|all)$/i);
  await expect
    .poll(async () => await page.locator('#incidents-list .issue-card').count(), { timeout: 30_000 })
    .toBeGreaterThan(0);

  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=history`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);
  await page.locator('#api-monitoring-progress').getByRole('button', { name: /Review Issues|Open Issues/i }).first().click();
  await expect(page.locator('#incident-status-select')).toHaveValue('');
  await expect
    .poll(async () => await page.locator('#incidents-list .issue-card').count(), { timeout: 30_000 })
    .toBeGreaterThan(0);

  const firstCheckbox = issueRows.first().locator('.bulk-incident');
  const selectedIssueId = String((await firstCheckbox.getAttribute('value')) || '');
  expect(selectedIssueId).not.toBe('');
  await page.evaluate((id) => {
    (window as any).confirmIncident(Number(id), 'resolved', 0);
  }, Number(selectedIssueId));
  await expect(page.locator('#confirm-modal')).toBeVisible();
  await page.locator('#confirm-accept').click({ force: true });
  await expect
    .poll(
      async () => {
        const response = await page.request.get('/jin/api/v2/anomalies');
        const payload = await response.json();
        const active = Array.isArray(payload?.anomalies) ? payload.anomalies : [];
        return active.some((item: any) => String(item?.id || '') === selectedIssueId);
      },
      { timeout: 20_000 },
    )
    .toBe(false);
});
