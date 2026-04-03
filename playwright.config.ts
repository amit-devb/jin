import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8010',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      'rm -f demo-jin.duckdb* .jin/active_project.json .jin/projects_catalog.json .jin/bundle_runs.json .jin/license-projects.e2e.json && PYTHONPATH=python .venv/bin/python examples/fastapi_demo/seed_app_db.py && JIN_DISABLE_NATIVE_CONFIG_LOAD=1 JIN_LICENSE_PROJECTS_PATH=.jin/license-projects.e2e.json PYTHONPATH=python .venv/bin/uvicorn examples.fastapi_demo.app:app --host 127.0.0.1 --port 8010',
    url: 'http://127.0.0.1:8010/jin',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
