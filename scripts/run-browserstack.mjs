import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { localBaseURL } from "./qa-config.mjs";

const validModes = new Set(["local", "public"]);
const mode = validModes.has(process.argv[2]) ? process.argv[2] : "local";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const browserstackConfigFile =
  mode === "public" ? "browserstack.public.yml" : "browserstack.yml";

const localTargetBaseURL = (process.env.BROWSERSTACK_TEST_BASE_URL ?? localBaseURL).replace(/\/$/, "");
const publicBaseURL = (
  process.env.BROWSERSTACK_PUBLIC_BASE_URL ??
  process.env.LIGHTHOUSE_BASE_URL ??
  "https://www.evochia.gr"
).replace(/\/$/, "");
const targetBaseURL = mode === "public" ? publicBaseURL : localTargetBaseURL;
const testEntry =
  mode === "public"
    ? "tests/playwright/browserstack-ios.spec.mjs"
    : "tests/playwright/smoke.spec.mjs";

process.env.BROWSERSTACK_TEST_BASE_URL = targetBaseURL;
process.env.BROWSERSTACK_CONFIG_FILE = browserstackConfigFile;
process.env.BROWSERSTACK_TEST_MATCH =
  mode === "public" ? "browserstack-ios.spec.mjs" : "smoke.spec.mjs";

const command = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "browserstack-node-sdk.cmd" : "browserstack-node-sdk",
);
const args = [
  "playwright",
  "test",
  testEntry,
  "--config",
  "playwright.browserstack.config.mjs",
];

const child = spawn(command, args, {
  cwd: repoRoot,
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
