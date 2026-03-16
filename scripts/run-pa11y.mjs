import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pa11y from "pa11y";

import {
  ensurePreviewServer,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import { accessibilityRoutes } from "./qa-config.mjs";
import { auditBaseURL, repoRoot, resolveAuditUrl } from "./qa-config.mjs";

const baseConfigPath = path.join(repoRoot, ".pa11yci.base.json");

const browserPath = pickExistingPath([
  process.env.CHROME_PATH ?? "",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
]);

if (!browserPath) {
  throw new Error("No Chromium-based executable was found for pa11y.");
}

const previewServer = await ensurePreviewServer(auditBaseURL);

try {
  const config = JSON.parse(readFileSync(baseConfigPath, "utf8"));
  const defaults = {
    ...config.defaults,
    chromeLaunchConfig: {
      executablePath: browserPath,
      args: ["--no-sandbox", "--blink-settings=forceDarkModeEnabled=false"],
    },
  };
  config.urls = accessibilityRoutes.map((route) => resolveAuditUrl(route));
  config.defaults = defaults;
  writeJsonReport(["pa11y", "pa11y.config.json"], config);

  const results = {};
  const logLines = [];
  let errorCount = 0;
  let passes = 0;
  let runnerErrors = 0;

  for (const url of config.urls) {
    try {
      const result = await pa11y(url, {
        standard: defaults.standard,
        timeout: defaults.timeout,
        wait: defaults.wait,
        includeWarnings: defaults.includeWarnings,
        hideElements: defaults.hideElements,
        chromeLaunchConfig: {
          executablePath: browserPath,
          args: defaults.chromeLaunchConfig.args,
        },
      });

      const issues = Array.isArray(result.issues)
        ? result.issues.filter((issue) => defaults.includeWarnings || issue.typeCode === 1 || issue.type === "error")
        : [];

      if (issues.length) {
        results[url] = issues;
        errorCount += issues.length;
      } else {
        passes += 1;
      }

      logLines.push(`${url}: ${issues.length ? `${issues.length} issues` : "passed"}`);
    } catch (error) {
      results[url] = [
        {
          type: "error",
          typeCode: 1,
          message: error.message,
          code: "pa11y.runtime",
          context: url,
          selector: null,
          runner: "pa11y",
          runnerExtras: {},
        },
      ];
      logLines.push(`${url}: runtime error - ${error.message}`);
      runnerErrors += 1;
    }
  }

  const rawOutput = JSON.stringify({
    total: config.urls.length,
    passes,
    errors: errorCount,
    runnerErrors,
    results,
  });
  const resultGroups = Object.keys(results).length;

  const summary = {
    tool: "run-pa11y",
    status: errorCount || runnerErrors ? "failed" : "passed",
    exitCode: errorCount || runnerErrors ? 2 : 0,
    checkedUrls: config.urls.length,
    total: config.urls.length,
    passes,
    errorCount,
    issueGroups: resultGroups,
    issues: results,
    rawOutput,
  };

  writeJsonReport(["pa11y", "summary.json"], summary);
  writeTextReport(["pa11y", "pa11y.log"], logLines.join("\n"));

  console.table([
    {
      checkedUrls: summary.checkedUrls,
      exitCode: summary.exitCode,
      issueGroups: summary.issueGroups,
      errorCount: summary.errorCount,
    },
  ]);

  if (summary.exitCode) {
    process.exit(summary.exitCode);
  }
} finally {
  previewServer?.child.kill();
}

function pickExistingPath(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}
