import { expect, test, type Page } from '@playwright/test';

const LONG_TIMEOUT_MS = 90_000;
test.setTimeout(120_000);

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function expectFeedbackContains(page: Page, text: string): Promise<void> {
  await expect
    .poll(async () => (await page.locator('#project-workflow-feedback').textContent())?.trim() || '', {
      timeout: LONG_TIMEOUT_MS,
    })
    .toContain(text);
}

async function waitForWorkflowReady(page: Page): Promise<void> {
  await page.goto('/jin?y_view=playbook');
  await expect(page.locator('#project-register-button')).toBeVisible();
  await expect.poll(() => page.locator('#project-active-select option').count()).toBeGreaterThan(0);
}

async function selectProjectByLabel(page: Page, labelPart: string): Promise<string | null> {
  const options = await page.$$eval('#project-active-select option', (nodes) =>
    nodes.map((node) => ({ value: node.getAttribute('value') || '', label: node.textContent?.trim() || '' })),
  );
  const match = options.find((item) => item.label.includes(labelPart) && item.value);
  if (!match) return null;
  await page.selectOption('#project-active-select', match.value);
  return match.value;
}

test('core workflow supports register, project lifecycle, monitor, baseline, health, and digest reporting', async ({ page, request }) => {
  const registeredProject = uniqueName('workflow-register');
  const addedProject = uniqueName('workflow-project');

  await waitForWorkflowReady(page);
  await expect(page.locator('#project-report-digest-button')).toBeDisabled();

  await page.fill('#project-register-name', registeredProject);
  await page.click('#project-register-button');
  await expect(page.locator('#project-register-button')).toBeEnabled({ timeout: LONG_TIMEOUT_MS });
  await expect
    .poll(async () => await page.locator('#project-active-select').textContent(), {
      timeout: LONG_TIMEOUT_MS,
    })
    .toContain(registeredProject);
  await expectFeedbackContains(page, `Project "${registeredProject}" is ready.`);

  const licenseActivation = await request.post('/jin/api/v2/license/activate', {
    data: { key: 'BUS-E2E-CORE-ACCOUNT' },
  });
  expect(licenseActivation.ok()).toBeTruthy();

  await page.fill('#project-add-name', addedProject);
  await page.click('#project-add-button');
  await expect(page.locator('#project-add-button')).toBeEnabled({ timeout: LONG_TIMEOUT_MS });
  await expect
    .poll(async () => await page.locator('#project-active-select').textContent(), {
      timeout: LONG_TIMEOUT_MS,
    })
    .toContain(addedProject);
  await expectFeedbackContains(page, `Added and switched to project "${addedProject}"`);

  await page.selectOption('#project-policy-cadence', 'balanced');
  await page.fill('#project-policy-schedule', 'every 2h');
  await page.selectOption('#project-policy-baseline-mode', 'fixed');
  await page.fill('#project-policy-threshold', '12');
  await page.fill('#project-policy-bundle-schedule', 'daily 09:00');
  await page.selectOption('#project-policy-bundle-format', 'markdown');
  if (!(await page.isChecked('#project-policy-bundle-enabled'))) {
    await page.check('#project-policy-bundle-enabled');
  }

  await page.click('#project-policy-save-button');
  await expectFeedbackContains(page, 'Check setup saved and applied');

  await page.click('#project-policy-apply-button');
  await expectFeedbackContains(page, 'Schedule setup re-applied to');

  await page.click('#project-run-bundle-button');
  await expectFeedbackContains(page, 'Checks finished:');
  await expect(page.locator('#project-workflow-runs')).toContainText('Recent Check Runs');
  await expect(page.locator('#project-report-digest-button')).toBeEnabled();

  await page.click('#project-baseline-promote-button');
  await expectFeedbackContains(page, 'Targets refreshed for');

  await page.click('#project-health-check-button');
  await expect(page.locator('#project-workflow-health')).toContainText('Health Snapshot');
  await expectFeedbackContains(page, 'Health status refreshed.');

  await page.click('#project-monitor-refresh-button');
  await expect(page.locator('#project-workflow-monitor')).toContainText('Portfolio Health');
  await expectFeedbackContains(page, 'Portfolio health refreshed.');

  await page.click('#project-report-digest-button');
  await expect(page.locator('#project-workflow-report')).toContainText('Leadership Digest');
  await expectFeedbackContains(page, 'Leadership report generated');

  await page.locator('#project-lifecycle-advanced summary').click();
  await selectProjectByLabel(page, addedProject);
  await expect(page.locator('#project-archive-button')).toBeEnabled();
  await page.click('#project-archive-button');
  await expectFeedbackContains(page, `Project "${addedProject}" archived.`);
  await expect
    .poll(async () => await page.locator('#project-active-select').textContent(), { timeout: LONG_TIMEOUT_MS })
    .toContain('[archived]');

  await expect(page.locator('#project-restore-button')).toBeEnabled();
  await page.click('#project-restore-button');
  await expectFeedbackContains(page, `Project "${addedProject}" restored.`);

  await page.click('#project-archive-button');
  await expectFeedbackContains(page, `Project "${addedProject}" archived.`);

  await page.fill('#project-delete-confirm', addedProject);
  await expect(page.locator('#project-delete-button')).toBeEnabled();
  await page.click('#project-delete-button');
  await expectFeedbackContains(page, `Project "${addedProject}" deleted.`);
  await expect
    .poll(async () => await page.locator('#project-active-select').textContent(), { timeout: LONG_TIMEOUT_MS })
    .not.toContain(addedProject);
});
