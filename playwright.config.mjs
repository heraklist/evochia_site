import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

import {
  auditBaseURL,
  localBaseURL,
  previewHost,
  previewPort,
  useLocalAuditTarget,
} from "./scripts/qa-config.mjs";

const enableFirefoxProjects = process.env.PLAYWRIGHT_ENABLE_FIREFOX === "1";
const enableWebkitProjects = process.env.PLAYWRIGHT_ENABLE_WEBKIT === "1";

function pickExistingPath(paths) {
  return paths.find((candidate) => existsSync(candidate));
}

const edgeExecutable = pickExistingPath([
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
]);

const projects = [
  {
    name: "desktop-chromium",
    use: {
      ...devices["Desktop Chrome"],
      ...(edgeExecutable ? { channel: "msedge" } : {}),
    },
  },
  {
    name: "mobile-chromium",
    use: {
      ...devices["Pixel 7"],
      ...(edgeExecutable ? { channel: "msedge" } : {}),
    },
  },
];

if (enableFirefoxProjects) {
  projects.push({
    name: "desktop-firefox",
    use: {
      ...devices["Desktop Firefox"],
    },
  });
}

if (enableWebkitProjects) {
  projects.push(
    {
      name: "desktop-webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 13"] },
    },
  );
}

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  timeout: 45000,
  workers: 2,
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.015,
    },
  },
  outputDir: ".reports/playwright/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: ".reports/playwright/html", open: "never" }],
  ],
  use: {
    baseURL: auditBaseURL,
    colorScheme: "light",
    ignoreHTTPSErrors: true,
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects,
  webServer: useLocalAuditTarget
    ? {
        command: `node scripts/preview-server.mjs --host ${previewHost} --port ${previewPort}`,
        url: `${localBaseURL}/__qa__/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : undefined,
});