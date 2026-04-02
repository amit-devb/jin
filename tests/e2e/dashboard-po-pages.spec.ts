import { expect, test } from '@playwright/test';

test('every main page starts with purpose and one primary action', async ({ page }) => {
  for (const view of ['overview', 'playbook', 'api', 'incidents', 'errors', 'scheduler', 'settings', 'reports']) {
    await page.goto(`/jin?y_view=${view}`);
    await expect(page.locator('#view-guide')).toContainText('What this page is for');
    await expect(page.locator('#view-guide')).toContainText('Primary next action');
    await expect(page.locator('#view-guide-action')).toBeVisible();
  }
});

test('playbook guide action jumps to project registration input', async ({ page }) => {
  await page.goto('/jin?y_view=playbook');
  await expect(page.locator('#view-guide-action')).toHaveText('Start With Register');
  await page.click('#view-guide-action');
  await expect(page.locator('#project-register-name')).toBeFocused();
});

test('reports guide action generates report pack', async ({ page, request }) => {
  await request.get('/api/sales/amazon/YTD?value=100');
  await page.goto('/jin?y_view=reports');
  await expect(page.locator('#view-guide-action')).toHaveText('Generate Report Pack');
  await page.click('#view-guide-action');
  await expect(page.locator('#reports-feedback')).toContainText('Report pack generated');
});

test('errors and settings guide actions route to the next operator step', async ({ page }) => {
  await page.goto('/jin?y_view=errors');
  await expect(page.locator('#view-guide-action')).toHaveText('Back To Issues');
  await page.click('#view-guide-action');
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe('incidents');

  await page.goto('/jin?y_view=settings');
  const settingsAction = (await page.locator('#view-guide-action').textContent())?.trim() || '';
  if (settingsAction === 'Activate Business License') {
    await page.click('#view-guide-action');
    await expect(page.locator('#license-key-input')).toBeFocused();
  } else {
    await page.click('#view-guide-action');
    await expect
      .poll(() => {
        const view = new URL(page.url()).searchParams.get('y_view');
        return view === 'api' || view === 'playbook' || view === 'incidents';
      })
      .toBe(true);
  }
});

test('reports page generates a PO-ready report pack', async ({ page, request }) => {
  // Seed at least one observation so report cards are meaningful.
  await request.get('/api/sales/amazon/YTD?value=100');

  await page.goto('/jin?y_view=reports');
  await expect(page.locator('#run-report-button')).toBeVisible();

  await page.click('#run-report-button');
  await expect(page.locator('#reports-content')).toContainText('Project Health');
  await expect(page.locator('#reports-content')).toContainText('Recommended Next Step');
  await expect(page.locator('#reports-content')).toContainText('Leadership Digest');
  await expect(page.locator('#reports-feedback')).toContainText('Report pack generated');

  const nextStepAction = page.locator('#reports-content [data-view]').first();
  await expect(nextStepAction).toBeVisible();
  const targetView = (await nextStepAction.getAttribute('data-view')) || '';
  expect(['incidents', 'api', 'overview']).toContain(targetView);
  await nextStepAction.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('y_view')).toBe(targetView);
});

test('reports export can auto-generate and download in one click', async ({ page, request }) => {
  await request.get('/api/revenue/amazon?dates=2026-03-19');
  await page.goto('/jin?y_view=reports');

  const downloadPromise = page.waitForEvent('download');
  await page.click('#export-report-csv');
  const download = await downloadPromise;

  expect(download.suggestedFilename().toLowerCase()).toContain('jin-report');
  await expect(page.locator('#reports-feedback')).toContainText(/generated|exported/i);
});

test('issues page gives triage-first guidance', async ({ page }) => {
  await page.goto('/jin?y_view=incidents');

  await expect(page.locator('#view-incidents')).toContainText('Review what changed, decide if expected, then resolve or escalate.');
  await expect(page.locator('#bulk-preview')).toContainText('Select one or more issues to apply one action.');
  await expect
    .poll(async () => ((await page.locator('#incidents-list').textContent()) || '').trim(), { timeout: 10_000 })
    .not.toBe('');
  const incidentsText = ((await page.locator('#incidents-list').textContent()) || '').trim();
  if (/Review Top Issue/i.test(incidentsText)) {
    await expect(page.locator('#incidents-list')).toContainText('Review Top Issue');
  } else if (/Primary Action/i.test(incidentsText)) {
    await expect(page.locator('#incidents-list')).toContainText('Primary Action');
  } else {
    await expect(page.locator('#incidents-list')).toContainText(/No issues right now|No issues match these filters/i);
  }
});

test('issues page shows persistent in-page feedback after an incident action', async ({ page }) => {
  await page.goto('/jin?y_view=incidents');
  await page.evaluate(() => {
    (window as any).confirmIncident(99999999, 'acknowledged', 0);
  });
  await page.click('#confirm-accept');
  await expect
    .poll(async () => (await page.locator('#incidents-feedback').textContent())?.trim() || '')
    .toContain('99999999');
});

test('issues page renders active incidents even when history is empty', async ({ page }) => {
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        anomalies: [
          {
            id: 424242,
            endpoint_path: '/api/revenue/{retailer}',
            kpi_field: 'data[].revenue',
            pct_change: 63,
            baseline_used: 100,
            actual_value: 163,
            severity: 'high',
            status: 'active',
            detected_at: '2026-03-27T09:00:00Z',
            why_flagged: 'Revenue moved above tolerance.',
            grain_key: '/api/revenue/{retailer}|retailer=shopify|data[].label=current',
            detection_method: 'upload_validation',
          },
        ],
        history: [],
      }),
    });
  });

  await page.goto('/jin?y_view=incidents');
  await expect(page.locator('#incidents-list')).toContainText('Triage Queue');
  await expect(page.locator('#incidents-list')).toContainText('Review Top Issue');
  await expect(page.locator('#incidents-list')).toContainText('/api/revenue/{retailer}');
  await expect(page.locator('#incidents-list .issue-card')).toHaveCount(1);
  await expect(page.locator('#incidents-list .bulk-incident').first()).toHaveAttribute('aria-label', /Select issue 424242/i);
  await expect(page.locator('#incidents-list details.more-actions summary').first()).toHaveAttribute('aria-label', /More actions for issue 424242/i);
});
