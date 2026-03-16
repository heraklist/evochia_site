import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

import {
  ensurePreviewServer,
  resetDirectory,
  slugify,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import {
  lighthouseRoutes,
  liveBaseURL,
  localBaseURL,
  repoRoot,
} from "./qa-config.mjs";

const require = createRequire(import.meta.url);
const { saveLHR } = require("@lhci/utils/src/saved-reports.js");
const { getAllAssertionResults } = require("@lhci/utils/src/assertions.js");

const scope = process.argv[2] === "live" ? "live" : "local";
const profile = process.argv[3] === "desktop" ? "desktop" : "mobile";
const baseURL = scope === "live" ? liveBaseURL : localBaseURL;
const reportDir = path.join(repoRoot, ".reports", "lhci", `${scope}-${profile}`);
const profilesDir = path.join(reportDir, ".profiles");
const chromePath = pickExistingPath([
  process.env.CHROME_PATH ?? "",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
]);

if (!chromePath) {
  throw new Error("No Chromium-based executable was found for Lighthouse CI.");
}

resetDirectory(reportDir);
mkdirSync(profilesDir, { recursive: true });

const previewServer = await ensurePreviewServer(baseURL);
const lhrs = [];
const collectionRows = [];

try {
  for (const route of lighthouseRoutes) {
    const url = new URL(route, `${baseURL}/`).toString();
    const userDataDir = path.join(profilesDir, slugify(route));
    mkdirSync(userDataDir, { recursive: true });

    const chrome = await launch({
      chromePath,
      logLevel: "silent",
      userDataDir,
      chromeFlags: [
        "--headless=new",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
      ],
    });

    try {
      const runnerResult = await lighthouse(
        url,
        {
          logLevel: "error",
          output: "json",
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
          port: chrome.port,
        },
        profile === "desktop" ? desktopConfig : undefined,
      );

      if (!runnerResult) {
        throw new Error(`Lighthouse returned no result for ${url}`);
      }

      const jsonReport = Array.isArray(runnerResult.report)
        ? String(runnerResult.report.find((entry) => String(entry).startsWith("{")) ?? runnerResult.report[0])
        : String(runnerResult.report);

      lhrs.push(runnerResult.lhr);
      await saveLHR(jsonReport, reportDir);

      collectionRows.push({
        url,
        performance: runnerResult.lhr.categories.performance?.score ?? null,
        accessibility: runnerResult.lhr.categories.accessibility?.score ?? null,
        bestPractices: runnerResult.lhr.categories["best-practices"]?.score ?? null,
        seo: runnerResult.lhr.categories.seo?.score ?? null,
        lcpMs: runnerResult.lhr.audits["largest-contentful-paint"]?.numericValue ?? null,
        tbtMs: runnerResult.lhr.audits["total-blocking-time"]?.numericValue ?? null,
        cls: runnerResult.lhr.audits["cumulative-layout-shift"]?.numericValue ?? null,
      });
    } finally {
      await chrome.kill();
    }
  }
} finally {
  previewServer?.child.kill();
}

const assertionResults = getAllAssertionResults(
  {
    assertions: {
      "categories:accessibility": ["error", { minScore: 0.9 }],
      "categories:seo": ["error", { minScore: 0.9 }],
      "categories:best-practices": ["warn", { minScore: 0.9 }],
      "categories:performance": ["warn", { minScore: 0.8 }],
      "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      "largest-contentful-paint": ["warn", { maxNumericValue: 3000 }],
      "total-blocking-time": ["warn", { maxNumericValue: 300 }],
    },
    includePassedAssertions: true,
  },
  lhrs,
);

const failingAssertions = assertionResults.filter((result) => !result.passed && result.level === "error");
const warningAssertions = assertionResults.filter((result) => !result.passed && result.level === "warn");
const summary = {
  tool: "run-lhci",
  scope,
  profile,
  baseURL,
  status: failingAssertions.length ? "failed" : warningAssertions.length ? "warning" : "passed",
  checkedUrls: collectionRows.length,
  failingAssertions: failingAssertions.length,
  warningAssertions: warningAssertions.length,
  collectionRows,
};

writeJsonReport(["lhci", `${scope}-${profile}`, "summary.json"], summary);
writeJsonReport(["lhci", `${scope}-${profile}`, "assertion-results.json"], assertionResults);
writeTextReport(
  ["lhci", `${scope}-${profile}`, "lhci.log"],
  [
    `scope=${scope}`,
    `profile=${profile}`,
    `baseURL=${baseURL}`,
    `checkedUrls=${collectionRows.length}`,
    `failingAssertions=${failingAssertions.length}`,
    `warningAssertions=${warningAssertions.length}`,
  ].join("\n"),
);

console.table(
  collectionRows.map((row) => ({
    url: row.url,
    performance: score(row.performance),
    accessibility: score(row.accessibility),
    bestPractices: score(row.bestPractices),
    seo: score(row.seo),
    lcpMs: row.lcpMs == null ? null : Math.round(row.lcpMs),
    tbtMs: row.tbtMs == null ? null : Math.round(row.tbtMs),
    cls: row.cls == null ? null : Number(row.cls.toFixed(3)),
  })),
);

if (failingAssertions.length) {
  process.exit(1);
}

function pickExistingPath(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}

function score(value) {
  return value == null ? null : Math.round(value * 100);
}
