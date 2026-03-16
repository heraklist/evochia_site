import { existsSync, readFileSync } from "node:fs";

import { writeJsonReport, writeTextReport } from "./audit-utils.mjs";

const pass = process.argv[2] === "pass2" ? "pass2" : "pass1";
const reportSpecs = {
  pass1: [
    ["Pass 1 commands", ".reports/summary/pass1-command-status.json", "commands"],
    ["SEO rules", ".reports/custom/seo-rules.json"],
    ["Hreflang", ".reports/custom/hreflang-local.json"],
    ["Structured data", ".reports/custom/structured-data-local.json"],
    ["Links", ".reports/custom/links.json"],
    ["Pa11y", ".reports/pa11y/summary.json"],
    ["Nu Html Checker", ".reports/vnu/summary.json"],
    ["LHCI local mobile", ".reports/lhci/local-mobile/summary.json"],
    ["LHCI local desktop", ".reports/lhci/local-desktop/summary.json"],
  ],
  pass2: [
    ["Pass 2 commands", ".reports/summary/pass2-command-status.json", "commands"],
    ["Hreflang live", ".reports/custom/hreflang-live.json"],
    ["Structured data live", ".reports/custom/structured-data-live.json"],
    ["Security headers", ".reports/headers/security-headers.json"],
    ["CrUX", ".reports/crux/crux.json"],
    ["Search Console", ".reports/search-console/search-console.json"],
    ["ZAP", ".reports/zap/zap-report.json", "zap"],
    ["LHCI live mobile", ".reports/lhci/live-mobile/summary.json"],
    ["LHCI live desktop", ".reports/lhci/live-desktop/summary.json"],
  ],
};

const tools = reportSpecs[pass].map(([label, filePath, parser]) => readReport(label, filePath, parser));
const totals = {
  passed: tools.filter((tool) => tool.status === "passed").length,
  warning: tools.filter((tool) => tool.status === "warning").length,
  failed: tools.filter((tool) => tool.status === "failed").length,
  skipped: tools.filter((tool) => tool.status === "skipped").length,
  missing: tools.filter((tool) => tool.status === "missing").length,
};
const topPriorities = tools
  .filter((tool) => tool.status === "failed")
  .map((tool) => `${tool.label}: ${tool.message}`)
  .slice(0, 5);
const quickWins = tools
  .filter((tool) => tool.status === "warning" || tool.status === "skipped")
  .map((tool) => `${tool.label}: ${tool.message}`)
  .slice(0, 5);
const fixPlan = buildFixPlan(tools);

const summary = {
  pass,
  generatedAt: new Date().toISOString(),
  totals,
  tools,
  topPriorities,
  quickWins,
  fixPlan,
};

writeJsonReport(["summary", `${pass}-summary.json`], summary);
writeTextReport(
  ["summary", `${pass}-summary.md`],
  [
    `# ${pass.toUpperCase()} Summary`,
    "",
    `- Passed: ${totals.passed}`,
    `- Warning: ${totals.warning}`,
    `- Failed: ${totals.failed}`,
    `- Skipped: ${totals.skipped}`,
    `- Missing: ${totals.missing}`,
    "",
    "## Top priorities",
    ...(topPriorities.length ? topPriorities.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Quick wins",
    ...(quickWins.length ? quickWins.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Fix plan",
    ...fixPlan.map((item) => `- ${item}`),
  ].join("\n"),
);

console.table(
  tools.map((tool) => ({
    tool: tool.label,
    status: tool.status,
    message: tool.message,
  })),
);

function readReport(label, filePath, parser = "default") {
  if (!existsSync(filePath)) {
    return {
      label,
      status: "missing",
      message: `Missing report at ${filePath}`,
    };
  }

  const payload = JSON.parse(readFileSync(filePath, "utf8"));
  if (parser === "commands") {
    const failed = (payload.results ?? []).filter((entry) => entry.exitCode);
    return {
      label,
      status: failed.length ? "failed" : "passed",
      message: failed.length
        ? `${failed.length} command(s) failed: ${failed.map((entry) => entry.script).join(", ")}`
        : "All pass commands completed successfully.",
    };
  }

  if (parser === "zap") {
    const sites = payload.site ?? [];
    const alerts = sites.flatMap((site) => site.alerts ?? []);
    const highOrMedium = alerts.filter((alert) => Number(alert.riskcode ?? 0) >= 2);
    return {
      label,
      status: highOrMedium.length ? "warning" : "passed",
      message: `${alerts.length} total alerts, ${highOrMedium.length} medium/high.`,
    };
  }

  return {
    label,
    status: payload.status ?? deriveStatus(payload),
    message: buildMessage(payload),
  };
}

function deriveStatus(payload) {
  if (payload.status) {
    return payload.status;
  }

  if (payload.errorCount) {
    return payload.errorCount > 0 ? "failed" : payload.warningCount > 0 ? "warning" : "passed";
  }

  return "passed";
}

function buildMessage(payload) {
  if (payload.reason) {
    return truncate(payload.reason);
  }

  if (typeof payload.errorCount === "number" || typeof payload.warningCount === "number") {
    return `errors=${payload.errorCount ?? 0}, warnings=${payload.warningCount ?? 0}`;
  }

  if (typeof payload.exitCode === "number") {
    return `exitCode=${payload.exitCode}`;
  }

  return "Report loaded.";
}

function truncate(value, maxLength = 240) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function buildFixPlan(tools) {
  const plan = [];

  if (tools.some((tool) => tool.label.includes("CrUX") && tool.status === "failed")) {
    plan.push("Investigate poor field Core Web Vitals from the CrUX report before changing lab budgets.");
  }
  if (tools.some((tool) => tool.label.includes("Search Console") && tool.status === "warning")) {
    plan.push("Review Search Console impressions and URL inspection warnings for indexing or crawl issues.");
  }
  if (tools.some((tool) => tool.label.includes("Security headers") && tool.status !== "passed")) {
    plan.push("Fix missing or unexpected live security headers before rerunning Pass 2.");
  }
  if (tools.some((tool) => tool.label.includes("Pa11y") && tool.status === "failed")) {
    plan.push("Resolve WCAG issues surfaced by Pa11y, then rerun browser a11y checks.");
  }
  if (tools.some((tool) => tool.label.includes("Nu Html Checker") && tool.status === "failed")) {
    plan.push("Clean HTML validation errors and rerun vnu plus html-validate.");
  }
  if (tools.some((tool) => tool.label.includes("Links") && tool.status !== "passed")) {
    plan.push("Fix broken internal links or redirect chains before the next crawl.");
  }

  return plan.length ? plan : ["No immediate follow-up is required beyond normal monitoring."];
}
