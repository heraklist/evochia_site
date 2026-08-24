import { defineConfig, devices } from '@playwright/test';

import { HEALTH_URL } from './tests/e2e/server.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  timeout: 20_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: 'test-results/playwright',
  use: {
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--host-resolver-rules=MAP www.evochia.gr 127.0.0.1',
            '--no-proxy-server',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `"${process.execPath}" tests/e2e/server.mjs`,
    url: HEALTH_URL,
    reuseExistingServer: false,
    timeout: 10_000,
  },
});
