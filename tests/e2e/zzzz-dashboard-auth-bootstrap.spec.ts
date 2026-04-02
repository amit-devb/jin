import { expect, test } from '@playwright/test';

function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

test('register with credentials enables smooth logout/login flow', async ({ page }) => {
  const projectName = uniqueName('auth-bootstrap');
  const username = 'e2e-owner';
  const password = 'Secret-e2e-owner-2026';

  await page.goto('/jin?y_view=playbook');
  await expect(page.locator('#project-register-button')).toBeVisible();

  await page.fill('#project-register-name', projectName);
  await page.locator('#project-register-auth-advanced summary').click();
  await page.fill('#project-register-user', username);
  await page.fill('#project-register-pass', password);
  await page.click('#project-register-button');

  await expect
    .poll(async () => (await page.locator('#project-workflow-feedback').textContent())?.trim() || '')
    .toContain(`Project "${projectName}" is ready.`);

  await page.click('#logout-button');
  await expect(page).toHaveURL(/\/jin\/login(\?|$)/);
  await expect(page.locator('body')).toContainText('You are signed out.');

  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/jin(\?|$)/);
  await expect(page.locator('#logout-button')).toBeVisible();

  const reset = await page.request.post('/jin/api/register', {
    data: {
      project_name: uniqueName('auth-reset'),
      disable_auth: true,
      bootstrap_monitoring: false,
    },
  });
  expect(reset.ok()).toBeTruthy();

  await page.goto('/jin?y_view=playbook');
  await expect(page.locator('#project-register-button')).toBeVisible();
});
