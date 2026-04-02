import { expect, test } from '@playwright/test';

test('issues defaults to business-impact sort', async ({ page }) => {
  await page.goto('/jin?y_view=incidents');
  await expect(page.locator('#incident-sort')).toHaveValue('business');
  await expect(page.locator('#incident-sort')).toContainText('Business Impact First');
});

test('operator can save owner in incident notes and payload carries owner', async ({ page }) => {
  let savedOwner = '';
  let ownerState: string | null = null;

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
            owner: ownerState,
            grain_key: '/api/revenue/{retailer}|retailer=shopify|data[].label=current',
            detection_method: 'upload_validation',
          },
        ],
        history: [],
      }),
    });
  });

  await page.route(/\/jin\/api\/v2\/anomaly\/424242\/status$/, async (route) => {
    const payload = (route.request().postDataJSON() || {}) as { action?: string; owner?: string };
    savedOwner = String(payload.owner || '');
    ownerState = savedOwner || ownerState;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        id: 424242,
        status: payload.action || 'active',
        owner: ownerState,
      }),
    });
  });

  await page.goto('/jin?y_view=incidents');
  await page.locator('#incidents-list button:has-text("Open Details")').first().click();
  await page.locator('#drawer-owner').scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    const ownerInput = document.getElementById('drawer-owner') as HTMLInputElement | null;
    if (ownerInput) ownerInput.value = 'PO Oncall';
    await (window as any).saveIncidentNotes(424242);
  });

  await expect.poll(() => savedOwner).toBe('po-oncall');
  await expect(page.locator('#incidents-list')).toContainText('Owner: po-oncall');
});

test('saved views are isolated by operator handle', async ({ page }) => {
  await page.goto('/jin?y_view=settings');

  await page.fill('#operator-handle-input', 'alice');
  await page.click('#operator-handle-save');
  await page.fill('#named-view-input', 'Alice view');
  await page.click('#save-named-view');
  await expect(page.locator('#saved-views')).toContainText('Alice view');

  await page.fill('#operator-handle-input', 'bob');
  await page.click('#operator-handle-save');
  await expect(page.locator('#saved-views')).toContainText('No saved views yet');
  await page.fill('#named-view-input', 'Bob view');
  await page.click('#save-named-view');
  await expect(page.locator('#saved-views')).toContainText('Bob view');

  await page.fill('#operator-handle-input', 'alice');
  await page.click('#operator-handle-save');
  await expect(page.locator('#saved-views')).toContainText('Alice view');
  await expect(page.locator('#saved-views')).not.toContainText('Bob view');

  const scopedStorage = await page.evaluate(() => ({
    alice: localStorage.getItem('jin-named-views:alice'),
    bob: localStorage.getItem('jin-named-views:bob'),
  }));
  expect(scopedStorage.alice || '').toContain('Alice view');
  expect(scopedStorage.bob || '').toContain('Bob view');
});
