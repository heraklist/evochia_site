import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

import {
  lighthouseRoutes,
  localBaseURL,
  previewHost,
  previewPort,
  reportPath,
  repoRoot,
  resolveLighthouseUrl,
  useLocalLighthouseTarget,
} from "./qa-config.mjs";

const profile = process.argv[2] === "desktop" ? "desktop" : "mobile";
const runCount = Math.max(1, Number.parseInt(process.env.LIGHTHOUSE_RUNS ?? "1", 10));
const lighthouseLogLevel = process.env.LIGHTHOUSE_LOG_LEVEL ?? "error";
const reportDir = reportPath("lighthouse", profile);

function pickExistingPath(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}

function slugifyRoute(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, "");
  return trimmed ? trimmed.replace(/\//g, "-") : "home";
}

function formatScore(score) {
  return score == null ? null : Number((score * 100).toFixed(0));
}

function formatMetric(value) {
  return value == null ? null : Number(value.toFixed(0));
}

function evaluateRun(lhr) {
  const performance = lhr.categories.performance?.score ?? null;
  const accessibility = lhr.categories.accessibility?.score ?? null;
  const bestPractices = lhr.categories["best-practices"]?.score ?? null;
  const seo = lhr.categories.seo?.score ?? null;
  const lcp = lhr.audits["largest-contentful-paint"]?.numericValue ?? null;
  const tbt = lhr.audits["total-blocking-time"]?.numericValue ?? null;
  const cls = lhr.audits["cumulative-layout-shift"]?.numericValue ?? null;
  const runtimeError = lhr.runtimeError?.message ?? null;
  const consoleErrorsAudit = lhr.audits["errors-in-console"];
  const consoleErrors =
    !consoleErrorsAudit ||
    consoleErrorsAudit.scoreDisplayMode === "notApplicable" ||
    consoleErrorsAudit.score === 1;
  const runWarnings = Array.isArray(lhr.runWarnings)
    ? lhr.runWarnings.filter(Boolean)
    : [];

  const errors = [];
  const warnings = [];

  if (runtimeError) {
    errors.push(`Runtime error: ${runtimeError}`);
  }

  if (!runtimeError && performance == null) {
    errors.push("Lighthouse did not return category scores.");
  }

  if (accessibility != null && accessibility < 0.9) {
    errors.push(`Accessibility score ${formatScore(accessibility)} is below 90.`);
  }

  if (seo != null && seo < 0.9) {
    errors.push(`SEO score ${formatScore(seo)} is below 90.`);
  }

  if (cls != null && cls > 0.1) {
    errors.push(`CLS ${cls.toFixed(3)} exceeds 0.1.`);
  }

  if (!consoleErrors) {
    errors.push("Console errors were detected during Lighthouse collection.");
  }

  warnings.push(...runWarnings);

  if (performance != null && performance < 0.8) {
    warnings.push(`Performance score ${formatScore(performance)} is below 80.`);
  }

  if (lcp != null && lcp > 3000) {
    warnings.push(`LCP ${formatMetric(lcp)} ms is above 3000 ms.`);
  }

  if (tbt != null && tbt > 300) {
    warnings.push(`TBT ${formatMetric(tbt)} ms is above 300 ms.`);
  }

  if (bestPractices != null && bestPractices < 0.9) {
    warnings.push(`Best Practices score ${formatScore(bestPractices)} is below 90.`);
  }

  return {
    errors,
    warnings,
    metrics: {
      performance: formatScore(performance),
      accessibility: formatScore(accessibility),
      bestPractices: formatScore(bestPractices),
      seo: formatScore(seo),
      lcpMs: formatMetric(lcp),
      tbtMs: formatMetric(tbt),
      cls: cls == null ? null : Number(cls.toFixed(3)),
    },
  };
}

function toMarkdown(summaryRows) {
  const lines = [
    "| URL | Perf | A11y | BP | SEO | LCP ms | TBT ms | CLS | Errors | Warnings |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
  ];

  for (const row of summaryRows) {
    lines.push(
      `| ${row.url} | ${row.metrics.performance ?? "-"} | ${row.metrics.accessibility ?? "-"} | ${row.metrics.bestPractices ?? "-"} | ${row.metrics.seo ?? "-"} | ${row.metrics.lcpMs ?? "-"} | ${row.metrics.tbtMs ?? "-"} | ${row.metrics.cls ?? "-"} | ${row.errors.length ? row.errors.join("<br>") : "-"} | ${row.warnings.length ? row.warnings.join("<br>") : "-"} |`,
    );
  }

  return lines.join("\n");
}

async function healthcheck(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

function startPreviewServer() {
  const stdout = [];
  const stderr = [];
  const child = spawn(process.execPath, [path.join(repoRoot, "scripts", "preview-server.mjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PREVIEW_HOST: previewHost,
      PREVIEW_PORT: String(previewPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => {
    stdout.push(String(chunk));
  });

  child.stderr?.on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  return {
    child,
    getLogs() {
      return [...stdout, ...stderr].join("").trim();
    },
  };
}

async function ensureLocalPreviewServer() {
  const healthUrl = `${localBaseURL}/__qa__/health`;

  if (await healthcheck(healthUrl)) {
    return null;
  }

  const server = startPreviewServer();
  const timeoutAt = Date.now() + 30_000;

  while (Date.now() < timeoutAt) {
    if (server.child.exitCode != null) {
      throw new Error(`Preview server exited before Lighthouse could connect.\n${server.getLogs()}`);
    }

    if (await healthcheck(healthUrl)) {
      return server;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  server.child.kill();
  throw new Error(`Timed out waiting for preview server at ${healthUrl}.\n${server.getLogs()}`);
}

const chromePath = pickExistingPath([
  process.env.CHROME_PATH ?? "",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
]);

if (!chromePath) {
  throw new Error("No Chromium-based browser executable was found for Lighthouse.");
}

mkdirSync(reportDir, { recursive: true });

const summaryRows = [];
let hasErrors = false;
const previewServer = useLocalLighthouseTarget ? await ensureLocalPreviewServer() : null;

try {
  for (const route of lighthouseRoutes) {
    const slug = slugifyRoute(route);
    const url = resolveLighthouseUrl(route);

    for (let runIndex = 1; runIndex <= runCount; runIndex += 1) {
      const profileDir = path.join(reportDir, `${slug}-profile-${runIndex}`);
      mkdirSync(profileDir, { recursive: true });

      const chrome = await launch({
        chromePath,
        logLevel: "silent",
        chromeFlags: [
          "--headless=new",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-background-networking",
        ],
        userDataDir: profileDir,
      });

      try {
        const runnerResult = await lighthouse(
          url,
          {
            logLevel: lighthouseLogLevel,
            onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
            output: ["html", "json"],
            port: chrome.port,
          },
          profile === "desktop" ? desktopConfig : undefined,
        );

        if (!runnerResult) {
          throw new Error(`No Lighthouse result returned for ${url}`);
        }

        const reports = Array.isArray(runnerResult.report)
          ? runnerResult.report
          : [String(runnerResult.report)];
        const [htmlReport, jsonReport] = reports;
        const baseName = `${slug}-run${runIndex}`;
        const htmlPath = path.join(reportDir, `${baseName}.report.html`);
        const jsonPath = path.join(reportDir, `${baseName}.report.json`);

        if (htmlReport) {
          writeFileSync(htmlPath, htmlReport);
        }
        if (jsonReport) {
          writeFileSync(jsonPath, jsonReport);
        }

        const evaluation = evaluateRun(runnerResult.lhr);
        const summary = {
          url,
          run: runIndex,
          profile,
          reportHtml: htmlPath,
          reportJson: jsonPath,
          ...evaluation,
        };

        summaryRows.push(summary);
        if (summary.errors.length) {
          hasErrors = true;
        }
      } finally {
        await chrome.kill();
      }
    }
  }
} finally {
  previewServer?.child.kill();
}

const summaryPath = path.join(reportDir, `${profile}-summary.json`);
const markdownPath = path.join(reportDir, `${profile}-summary.md`);
writeFileSync(summaryPath, JSON.stringify(summaryRows, null, 2));
writeFileSync(markdownPath, toMarkdown(summaryRows));

console.table(
  summaryRows.map((row) => ({
    url: row.url,
    run: row.run,
    performance: row.metrics.performance,
    accessibility: row.metrics.accessibility,
    bestPractices: row.metrics.bestPractices,
    seo: row.metrics.seo,
    lcpMs: row.metrics.lcpMs,
    tbtMs: row.metrics.tbtMs,
    cls: row.metrics.cls,
    errors: row.errors.length,
    warnings: row.warnings.length,
  })),
);

if (hasErrors) {
  process.exit(1);
}
