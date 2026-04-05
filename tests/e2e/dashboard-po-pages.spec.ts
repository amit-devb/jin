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

test('first-time onboarding guides a customer project from overview to api setup', async ({ page }) => {
  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: {
          name: 'Customer project',
          tier: 'free',
          project_limit: 1,
          projects_active: 0,
          is_unlicensed: false,
          license_enforced: false,
          is_maintainer: false,
          policy: { tier: 'free', max_projects: 1, features: [] },
        },
        summary: {
          total_endpoints: 0,
          healthy: 0,
          anomalies: 0,
          unconfirmed: 0,
        },
        endpoints: [],
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });
  await page.route('**/jin/api/v2/endpoint/**', async (route) => {
    const requestUrl = route.request().url();
    const encodedPath = requestUrl.split('/jin/api/v2/endpoint/')[1] || '';
    const endpointPath = `/${decodeURIComponent(encodedPath.split('?')[0] || '').replace(/^\/+/, '')}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        endpoint_path: endpointPath,
        http_method: 'GET',
        operator_metadata: {
          confirmed: true,
          last_observed_at: null,
          last_upload_at: null,
          observation_count: 0,
        },
        config: {
          dimension_fields: [],
          kpi_fields: [],
        },
        current_kpis: [],
        trend_summary: [],
        recent_history: [],
        upload_activity: [],
        anomaly_history: [
          {
            id: 1,
            status: 'active',
            kpi_field: 'revenue',
            actual_value: 120,
            baseline_used: 100,
          },
        ],
        monitoring_runs: [],
        references: [],
        upload_analysis_history: [],
        last_upload_analysis: null,
      }),
    });
  });

  await page.goto('/jin?y_view=overview');
  await expect(page.locator('#view-overview')).toContainText('Create your project');
  await expect(page.locator('#view-overview')).toContainText('Set Up APIs');
  await expect(page.locator('#view-overview')).toContainText('Open Getting Started');

  await page.goto('/jin?y_view=api&y_api=%2Fapi%2Fitems%2F0');
  await expect(page.locator('#view-api')).toContainText('No APIs connected yet.');
  await expect(page.locator('#view-api')).toContainText('Open Overview');
  await expect(page.locator('#view-api')).toContainText('Open Getting Started');
});

test('api browser switches among grouped, compact, and table modes for large projects', async ({ page }) => {
  const endpoints = Array.from({ length: 30 }, (_, index) => ({
    endpoint_path: `/api/items/${index}`,
    http_method: index % 2 === 0 ? 'GET' : 'POST',
    status: index % 7 === 0 ? 'warning' : 'healthy',
    active_anomalies: index % 6 === 0 ? 1 : 0,
    dimension_fields: ['retailer'],
    kpi_fields: ['revenue'],
    confirmed: index % 4 !== 0,
    time_field: 'date',
    time_required: true,
  }));

  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: {
          name: 'Customer project',
          tier: 'free',
          project_limit: 1,
          projects_active: 0,
          is_unlicensed: false,
          license_enforced: false,
          is_maintainer: false,
          policy: { tier: 'free', max_projects: 1, features: [] },
        },
        summary: {
          total_endpoints: endpoints.length,
          healthy: endpoints.filter((item) => item.status === 'healthy').length,
          anomalies: endpoints.filter((item) => item.active_anomalies > 0).length,
          unconfirmed: endpoints.filter((item) => !item.confirmed).length,
        },
        endpoints,
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });

  await page.goto('/jin?y_view=api');
  await expect(page.locator('[data-api-browser-mode="grouped"]')).toBeVisible();
  await expect(page.locator('[data-api-browser-mode="compact"]')).toBeVisible();
  await expect(page.locator('[data-api-browser-mode="table"]')).toBeVisible();
  await expect(page.locator('#api-list')).toContainText('Visible APIs');
  await expect(page.locator('#api-workspace')).toBeHidden();
  await page.click('[data-api="/api/items/0"]');
  await expect(page.locator('#api-workspace')).toBeVisible();
  await expect(page.locator('#view-api')).toHaveClass(/api-browser-detail-open/);
  await page.click('#api-workspace-close');
  await expect(page.locator('#api-workspace')).toBeHidden();
  await expect(page.locator('#view-api')).not.toHaveClass(/api-browser-detail-open/);
  await expect(page.locator('#api-list')).toContainText('Visible APIs');

  await page.click('[data-api-browser-mode="compact"]');
  await expect(page.locator('[data-api-browser-mode="compact"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#api-list')).toContainText('Compact scan');
  await expect(page.locator('#api-list')).toContainText('/api/items/0');

  await page.click('[data-api-browser-mode="table"]');
  await expect(page.locator('[data-api-browser-mode="table"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#api-list')).toContainText('Table index');
  await expect(page.locator('#api-list')).toContainText('Sorted by path asc');
  await page.click('[data-api-browser-density="dense"]');
  await expect(page.getByRole('button', { name: 'Dense' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.api-browser-table-shell')).toHaveAttribute('data-api-browser-density', 'dense');
  await expect(page.locator('.api-browser-head-cell.pinned-path')).toBeVisible();
  await expect(page.locator('.api-browser-head-cell.pinned-status')).toBeVisible();
  await expect(page.locator('.api-browser-head-cell.pinned-issues')).toBeVisible();
  await page.locator('[data-api-browser-column-drag="setup"]').dragTo(page.locator('[data-api-browser-column-drop="status"]'));
  await expect
    .poll(async () => await page.evaluate(() => localStorage.getItem('jin-api-browser-column-order')))
    .toBe('["method","setup","status","issues"]');
  await expect
    .poll(async () => await page.locator('#api-list .api-browser-table-head .api-table-sort > span:first-child').allTextContents())
    .toEqual(['Path', 'Method', 'Setup', 'Status', 'Issues']);
  await page.evaluate(() => {
    (window as any).setApiBrowserColumnWidth('setup', 160);
  });
  await expect
    .poll(async () => await page.evaluate(() => {
      const raw = localStorage.getItem('jin-api-browser-column-widths');
      if (!raw) return 0;
      try {
        return Number(JSON.parse(raw).setup || 0);
      } catch (_error) {
        return 0;
      }
    }))
    .toBeGreaterThan(112);
  await page.click('button:has-text("Save browser view")');
  await page.goto('/jin?y_view=settings');
  await expect(page.locator('#saved-views')).toContainText('API table index');
  await expect(page.locator('#saved-views')).toContainText('dense rows');
  await expect(page.locator('#saved-views')).toContainText('order: method, setup, status, issues');
  await expect(page.locator('#saved-views')).toContainText(/widths: .*setup/i);
});

test('api setup can auto-fill from the response model without sample traffic', async ({ page }) => {
  const endpointPath = '/api/snapshot';
  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: {
          name: 'Customer project',
          tier: 'free',
          project_limit: 1,
          projects_active: 0,
          is_unlicensed: false,
          license_enforced: false,
          is_maintainer: false,
          policy: { tier: 'free', max_projects: 1, features: [] },
        },
        summary: {
          total_endpoints: 1,
          healthy: 1,
          anomalies: 0,
          unconfirmed: 0,
        },
        endpoints: [
          {
            endpoint_path: endpointPath,
            http_method: 'GET',
            status: 'healthy',
            active_anomalies: 0,
            dimension_fields: [],
            kpi_fields: [],
            confirmed: false,
            time_required: true,
          },
        ],
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });
  await page.route('**/jin/api/v2/endpoint/**', async (route) => {
    const requestUrl = route.request().url();
    const encodedPath = requestUrl.split('/jin/api/v2/endpoint/')[1] || '';
    const detailPath = `/${decodeURIComponent(encodedPath.split('?')[0] || '').replace(/^\/+/, '')}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        endpoint_path: detailPath,
        http_method: 'GET',
        response_model_present: true,
        fields: [
          { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true, example: 'amazon' },
          { name: 'snapshot_date', kind: 'exclude', annotation: 'str', time_candidate: true, suggested_role: 'time', suggested: true, example: '2026-03-01' },
          { name: 'data.RSV', kind: 'kpi', annotation: 'float', suggested: true, example: 42.5 },
        ],
        schema_contract: {
          path: detailPath,
          method: 'GET',
          field_count: 3,
          fields: [
            { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true, example: 'amazon' },
            { name: 'snapshot_date', kind: 'exclude', annotation: 'str', time_candidate: true, suggested_role: 'time', suggested: true, example: '2026-03-01' },
            { name: 'data.RSV', kind: 'kpi', annotation: 'float', suggested: true, example: 42.5 },
          ],
          dimension_fields: [],
          kpi_fields: [],
          time_candidates: ['snapshot_date'],
        },
        setup_config: {
          dimension_fields: [],
          kpi_fields: [],
          excluded_fields: [],
          time_field: null,
          time_required: true,
          time_candidates: ['snapshot_date'],
        },
        config: {
          dimension_fields: [],
          kpi_fields: [],
          time_field: null,
          time_required: true,
          time_candidates: ['snapshot_date'],
        },
        current_kpis: [],
        trend_summary: [],
        recent_history: [],
        upload_activity: [],
        anomaly_history: [],
        monitoring_runs: [],
        references: [],
        upload_analysis_history: [],
        last_upload_analysis: null,
      }),
    });
  });

  await page.goto(`/jin?y_view=api&y_api=${encodeURIComponent(endpointPath)}`);
  await expect(page.locator('#view-api')).toContainText(endpointPath);
  await expect(page.locator('#auto-suggest-button')).toBeEnabled();
  await page.evaluate(() => {
    (document.getElementById('auto-suggest-button') as HTMLButtonElement | null)?.click();
  });
  await expect(page.locator('#auto-suggest-summary')).toContainText('Jin can pre-fill Segment, Metric, and Time from the Pydantic response model even before traffic arrives.');
  await expect(page.locator('.field-role-card[data-field-name="retailer"] .role-btn[data-role="dimension"]')).toHaveClass(/active/);
  await expect(page.locator('.field-role-card[data-field-name="snapshot_date"] .role-btn[data-role="time"]')).toHaveClass(/active/);
  await expect(page.locator('.field-role-card[data-field-name="data.RSV"] .role-btn[data-role="kpi"]')).toHaveClass(/active/);
});

test('api setup keeps the model-selected time preview explicit without sample values', async ({ page }) => {
  const endpointPath = '/api/snapshot';
  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          total_endpoints: 1,
          healthy: 1,
          anomalies: 0,
          unconfirmed: 0,
        },
        endpoints: [
          {
            endpoint_path: endpointPath,
            http_method: 'GET',
            status: 'healthy',
            active_anomalies: 0,
            dimension_fields: [],
            kpi_fields: [],
            confirmed: false,
            time_required: true,
          },
        ],
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });
  await page.route('**/jin/api/v2/endpoint/**', async (route) => {
    const requestUrl = route.request().url();
    const encodedPath = requestUrl.split('/jin/api/v2/endpoint/')[1] || '';
    const detailPath = `/${decodeURIComponent(encodedPath.split('?')[0] || '').replace(/^\/+/, '')}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        endpoint_path: detailPath,
        http_method: 'GET',
        response_model_present: true,
        fields: [
          { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true },
          { name: 'snapshot_date', kind: 'exclude', annotation: 'str', time_candidate: true, suggested_role: 'time', suggested: true },
          { name: 'data.RSV', kind: 'kpi', annotation: 'float', suggested: true },
        ],
        schema_contract: {
          path: detailPath,
          method: 'GET',
          field_count: 3,
          fields: [
            { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true },
            { name: 'snapshot_date', kind: 'exclude', annotation: 'str', time_candidate: true, suggested_role: 'time', suggested: true },
            { name: 'data.RSV', kind: 'kpi', annotation: 'float', suggested: true },
          ],
          dimension_fields: [],
          kpi_fields: [],
          time_candidates: ['snapshot_date'],
        },
        setup_config: {
          dimension_fields: [],
          kpi_fields: [],
          excluded_fields: [],
          time_field: null,
          time_required: true,
          time_candidates: ['snapshot_date'],
        },
        config: {
          dimension_fields: [],
          kpi_fields: [],
          time_field: null,
          time_required: true,
          time_candidates: ['snapshot_date'],
        },
        current_kpis: [],
        trend_summary: [],
        recent_history: [],
        upload_activity: [],
        anomaly_history: [],
        monitoring_runs: [],
        references: [],
        upload_analysis_history: [],
        last_upload_analysis: null,
      }),
    });
  });

  await page.goto(`/jin?y_view=api&y_api=${encodeURIComponent(endpointPath)}`);
  await page.evaluate(() => {
    (window as any).runMagicGuess?.(true);
  });
  await expect(page.locator('#auto-suggest-summary')).toContainText('Jin can pre-fill Segment, Metric, and Time from the Pydantic response model even before traffic arrives.');
  await expect(page.locator('.field-role-card[data-field-name="snapshot_date"] .role-btn[data-role="time"]')).toHaveClass(/active/);
  await expect
    .poll(async () => (await page.locator('#time-preview-val').textContent()) || '')
    .toContain('Model-selected time field: snapshot_date');
  await expect(page.locator('#time-preview-val')).not.toContainText('No sample value found');
});

test('api setup warns specifically when the response model still needs clearer roles', async ({ page }) => {
  const endpointPath = '/api/inventory/{retailer}';
  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          total_endpoints: 1,
          healthy: 1,
          anomalies: 0,
          unconfirmed: 0,
        },
        endpoints: [
          {
            endpoint_path: endpointPath,
            http_method: 'GET',
            status: 'healthy',
            active_anomalies: 0,
            dimension_fields: [],
            kpi_fields: [],
            confirmed: false,
            time_required: false,
          },
        ],
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });
  await page.route('**/jin/api/v2/endpoint/**', async (route) => {
    const requestUrl = route.request().url();
    const encodedPath = requestUrl.split('/jin/api/v2/endpoint/')[1] || '';
    const detailPath = `/${decodeURIComponent(encodedPath.split('?')[0] || '').replace(/^\/+/, '')}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        endpoint_path: detailPath,
        http_method: 'GET',
        response_model_present: true,
        fields: [
          { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true, example: 'amazon' },
          { name: 'sku_group', kind: 'dimension', annotation: 'str', suggested: true, example: 'shoes' },
          { name: 'label', kind: 'dimension', annotation: 'str', suggested: true, example: 'best-seller' },
        ],
        schema_contract: {
          path: detailPath,
          method: 'GET',
          field_count: 3,
          fields: [
            { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true, example: 'amazon' },
            { name: 'sku_group', kind: 'dimension', annotation: 'str', suggested: true, example: 'shoes' },
            { name: 'label', kind: 'dimension', annotation: 'str', suggested: true, example: 'best-seller' },
          ],
          dimension_fields: ['retailer', 'sku_group', 'label'],
          kpi_fields: [],
          time_candidates: [],
        },
        setup_config: {
          dimension_fields: [],
          kpi_fields: [],
          excluded_fields: [],
          time_field: null,
          time_required: false,
          time_candidates: [],
        },
        config: {
          dimension_fields: [],
          kpi_fields: [],
          time_field: null,
          time_required: false,
          time_candidates: [],
        },
        current_kpis: [],
        trend_summary: [],
        recent_history: [],
        upload_activity: [],
        anomaly_history: [],
        monitoring_runs: [],
        references: [],
        upload_analysis_history: [],
        last_upload_analysis: null,
      }),
    });
  });

  await page.goto(`/jin?y_view=api&y_api=${encodeURIComponent(endpointPath)}`);
  await expect(page.locator('#view-api')).toContainText(endpointPath);
  await expect(page.locator('#auto-suggest-summary')).toContainText('No clear Metric fields yet.');
  await expect(page.locator('#auto-suggest-summary')).toContainText('No clear Time field yet.');
  await expect(page.locator('#auto-suggest-summary')).toContainText('Best Segment candidate: retailer. Next: sku_group.');
});

test('api setup ranks the strongest time candidate first when several are available', async ({ page }) => {
  const endpointPath = '/api/history/{retailer}';
  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          total_endpoints: 1,
          healthy: 1,
          anomalies: 0,
          unconfirmed: 0,
        },
        endpoints: [
          {
            endpoint_path: endpointPath,
            http_method: 'GET',
            status: 'healthy',
            active_anomalies: 0,
            dimension_fields: [],
            kpi_fields: [],
            confirmed: false,
            time_required: true,
          },
        ],
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });
  await page.route('**/jin/api/v2/endpoint/**', async (route) => {
    const requestUrl = route.request().url();
    const encodedPath = requestUrl.split('/jin/api/v2/endpoint/')[1] || '';
    const detailPath = `/${decodeURIComponent(encodedPath.split('?')[0] || '').replace(/^\/+/, '')}`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        endpoint_path: detailPath,
        http_method: 'GET',
        response_model_present: true,
        fields: [
          { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true, example: 'amazon' },
          { name: 'snapshot_date', kind: 'exclude', annotation: 'str', time_candidate: true, suggested_role: 'time', suggested: true, example: '2026-03-01' },
          { name: 'created_at', kind: 'exclude', annotation: 'datetime', time_candidate: true, suggested_role: 'time', suggested: true, example: '2026-03-02T00:00:00Z' },
        ],
        schema_contract: {
          path: detailPath,
          method: 'GET',
          field_count: 3,
          fields: [
            { name: 'retailer', kind: 'dimension', annotation: 'str', suggested: true, example: 'amazon' },
            { name: 'snapshot_date', kind: 'exclude', annotation: 'str', time_candidate: true, suggested_role: 'time', suggested: true, example: '2026-03-01' },
            { name: 'created_at', kind: 'exclude', annotation: 'datetime', time_candidate: true, suggested_role: 'time', suggested: true, example: '2026-03-02T00:00:00Z' },
          ],
          dimension_fields: [],
          kpi_fields: [],
          time_candidates: ['snapshot_date', 'created_at'],
        },
        setup_config: {
          dimension_fields: [],
          kpi_fields: [],
          excluded_fields: [],
          time_field: null,
          time_required: true,
          time_candidates: ['snapshot_date', 'created_at'],
        },
        config: {
          dimension_fields: [],
          kpi_fields: [],
          time_field: null,
          time_required: true,
          time_candidates: ['snapshot_date', 'created_at'],
        },
        current_kpis: [],
        trend_summary: [],
        recent_history: [],
        upload_activity: [],
        anomaly_history: [],
        monitoring_runs: [],
        references: [],
        upload_analysis_history: [],
        last_upload_analysis: null,
      }),
    });
  });

  await page.goto(`/jin?y_view=api&y_api=${encodeURIComponent(endpointPath)}`);
  await expect(page.locator('#view-api')).toContainText(endpointPath);
  await expect(page.locator('#auto-suggest-summary')).toContainText('Best Time candidate: snapshot_date. Next: created_at.');
  await expect(page.locator('#auto-suggest-summary')).toContainText('No clear Metric fields yet.');
  await expect(page.locator('[data-field-name="retailer"]')).toContainText('Best Segment');
  await expect(page.locator('[data-field-name="snapshot_date"]')).toContainText('Best Time');
});

test('api browser virtualizes the table index for very large projects', async ({ page }) => {
  const endpoints = Array.from({ length: 180 }, (_, index) => ({
    endpoint_path: `/api/records/${String(index).padStart(3, '0')}`,
    http_method: index % 2 === 0 ? 'GET' : 'POST',
    status: index % 11 === 0 ? 'warning' : 'healthy',
    active_anomalies: index % 17 === 0 ? 1 : 0,
    dimension_fields: ['retailer'],
    kpi_fields: ['revenue'],
    confirmed: index % 5 !== 0,
    time_field: 'date',
    time_required: true,
  }));

  await page.route(/\/jin\/api\/v2\/status(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: {
          name: 'Customer project',
          tier: 'free',
          project_limit: 1,
          projects_active: 0,
          is_unlicensed: false,
          license_enforced: false,
          is_maintainer: false,
          policy: { tier: 'free', max_projects: 1, features: [] },
        },
        summary: {
          total_endpoints: endpoints.length,
          healthy: endpoints.filter((item) => item.status === 'healthy').length,
          anomalies: endpoints.filter((item) => item.active_anomalies > 0).length,
          unconfirmed: endpoints.filter((item) => !item.confirmed).length,
        },
        endpoints,
        recent_errors: [],
      }),
    });
  });
  await page.route(/\/jin\/api\/v2\/anomalies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ anomalies: [], history: [] }),
    });
  });
  await page.route(/\/jin\/api\/v2\/scheduler(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobs: [] }),
    });
  });

  await page.goto('/jin?y_view=api');
  await page.click('[data-api-browser-mode="table"]');
  await expect(page.locator('.api-browser-table-body.virtualized')).toBeVisible();
  await expect
    .poll(async () => await page.locator('.api-browser-row').count())
    .toBeLessThan(endpoints.length);
  await expect(page.locator('.api-browser-row').first()).toContainText('/api/records/000');

  const virtualBody = page.locator('.api-browser-table-body.virtualized');
  await page.evaluate(() => {
    (window as any).setApiBrowserTableScrollTop?.(8400);
  });

  await expect
    .poll(async () => await page.locator('.api-browser-row').first().textContent())
    .toMatch(/\/api\/records\/1\d{2}/);
  await expect(virtualBody).toBeVisible();
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
  if (['Activate Business License', 'Run Legacy Demo Activation', 'Review Business License', 'Review License Settings'].includes(settingsAction)) {
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
  await expect(page.locator('#reports-content')).toContainText('Report Snapshot');
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

test('issues page gives review-first guidance', async ({ page }) => {
  await page.goto('/jin?y_view=incidents');

  await expect(page.locator('#view-incidents')).toContainText('Review project changes, confirm what is expected, and close out anything unresolved.');
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
  await expect(page.locator('#incidents-list')).toContainText('Issue Review Queue');
  await expect(page.locator('#incidents-list')).toContainText('Review Top Issue');
  await expect(page.locator('#incidents-list')).toContainText('/api/revenue/{retailer}');
  await expect(page.locator('#incidents-list .issue-card')).toHaveCount(1);
  await expect(page.locator('#incidents-list .bulk-incident').first()).toHaveAttribute('aria-label', /Select issue 424242/i);
  await expect(page.locator('#incidents-list details.more-actions summary').first()).toHaveAttribute('aria-label', /More actions for issue 424242/i);
});
