import { expect, test, type Page } from '@playwright/test';

const REVENUE_API = '/api/revenue/{retailer}';
const REVENUE_API_ENCODED = encodeURIComponent(REVENUE_API);

function utf8Bytes(text: string): Uint8Array {
  // Minimal UTF-8 encoder so this spec does not require Node's Buffer types.
  const encoded = unescape(encodeURIComponent(text));
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) out[i] = encoded.charCodeAt(i);
  return out;
}

function isoDateDaysAgo(daysAgo: number): string {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  return value.toISOString().slice(0, 10);
}

function buildLargeMismatchCsv(): Uint8Array {
  const header = [
    'endpoint',
    'dimension_fields',
    'kpi_fields',
    'grain_data[].date',
    'grain_data[].label',
    'grain_retailer',
    'expected_data[].revenue',
    'expected_data[].orders',
    'tolerance_pct',
  ].join(',');

  const retailers = ['amazon', 'shopify', 'walmart', 'target'];
  const dates = [isoDateDaysAgo(1), isoDateDaysAgo(2), isoDateDaysAgo(3)];
  const rows: string[] = [header];

  dates.forEach((date) => {
    retailers.forEach((retailer) => {
      rows.push(
        [
          `"/api/revenue/{retailer}"`,
          `"data[].date,data[].label,retailer"`,
          `"data[].revenue,data[].orders"`,
          date,
          'current',
          retailer,
          '1',
          '1',
          '1',
        ].join(','),
      );
    });
  });

  return utf8Bytes(`${rows.join('\n')}\n`);
}

async function uploadLargeMismatchReference(page: Page): Promise<void> {
  const configResponse = await page.request.post(`/jin/api/config/${REVENUE_API_ENCODED}`, {
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
  expect(configResponse.ok()).toBeTruthy();

  await page.goto(`/jin?y_view=api&y_api=${REVENUE_API_ENCODED}&y_tab=uploads`);
  await expect(page.locator('#api-title')).toContainText(REVENUE_API);
  if (new URL(page.url()).searchParams.get('y_tab') !== 'uploads') {
    await page.locator('[data-wizard-step="uploads"]').first().click();
  }
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('uploads');
  await page.setInputFiles('#upload-file', {
    name: 'large-mismatch.csv',
    mimeType: 'text/csv',
    buffer: buildLargeMismatchCsv() as any,
  });
  await page.click('#preview-upload-button');
  await expect(page.locator('#upload-preview-step')).toBeVisible();
  await expect(page.locator('#upload-button')).toBeVisible();
  await page.click('#upload-button');
  await expect
    .poll(async () => (await page.locator('#upload-feedback').textContent()) || '', {
      timeout: 45_000,
    })
    .toMatch(/Imported|failed|Failed/i);
}

test('upload analysis keeps large result set readable with expandable flagged rows', async ({ page }) => {
  await uploadLargeMismatchReference(page);
  await expect.poll(() => new URL(page.url()).searchParams.get('y_tab')).toBe('history');

  const monitoringProgress = page.locator('#api-monitoring-progress');
  await expect(monitoringProgress).toBeVisible();
  await expect(monitoringProgress.getByText('Upload Analysis Found Mismatches')).toBeVisible();
  await expect(monitoringProgress.getByText(/Needs attention \(\d+\)/i)).toBeVisible();
  await expect(monitoringProgress.getByText(/Recommended next step/i)).toBeVisible();
  await expect(monitoringProgress.getByText('Priority', { exact: true })).toBeVisible();
  await expect(monitoringProgress.getByRole('button', { name: 'Review Issues' })).toBeVisible();

  const moreDetails = monitoringProgress.locator('details.upload-analysis-more-runs').first();
  const moreSummary = moreDetails.locator(':scope > summary');
  await expect(moreSummary).toContainText(/Show 4 more flagged row\(s\)/);

  const visibleBefore = await monitoringProgress.locator('.upload-analysis-card:visible').count();
  await moreSummary.click();
  await expect(moreDetails).toHaveAttribute('open', '');
  const visibleAfter = await monitoringProgress.locator('.upload-analysis-card:visible').count();
  expect(visibleAfter).toBeGreaterThan(visibleBefore);
});
