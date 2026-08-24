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
            '--proxy-server=http://127.0.0.1:9',
            '--proxy-bypass-list=<-loopback>;127.0.0.1;www.evochia.gr',
            '--host-resolver-rules=MAP www.evochia.gr 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
            '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
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
