import { defineConfig } from "@playwright/test";

import {
  localBaseURL,
  previewHost,
  previewPort,
} from "./scripts/qa-config.mjs";

const browserstackBaseURL = (
  process.env.BROWSERSTACK_TEST_BASE_URL ?? localBaseURL
).replace(/\/$/, "");
const useLocalBrowserstackTarget = browserstackBaseURL === localBaseURL;

export default defineConfig({
  testDir: "./tests/playwright",
  testMatch: [process.env.BROWSERSTACK_TEST_MATCH ?? "smoke.spec.mjs"],
  fullyParallel: false,
  timeout: 60000,
  workers: 1,
  outputDir: ".reports/browserstack/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: ".reports/browserstack/html", open: "never" }],
  ],
  use: {
    baseURL: browserstackBaseURL,
    ignoreHTTPSErrors: useLocalBrowserstackTarget,
    screenshot: useLocalBrowserstackTarget ? "only-on-failure" : "off",
    trace: useLocalBrowserstackTarget ? "retain-on-failure" : "off",
    video: "off",
  },
  projects: [
    {
      name: "mobile-browserstack",
    },
  ],
  webServer: useLocalBrowserstackTarget
    ? {
        command: `node scripts/preview-server.mjs --host ${previewHost} --port ${previewPort}`,
        url: `${localBaseURL}/__qa__/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : undefined,
});
