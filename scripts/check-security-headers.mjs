import { headerCheckRoutes } from "./content-routes.mjs";
import {
  fetchWithTimeout,
  toAbsoluteUrl,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import { liveBaseURL } from "./qa-config.mjs";

const baseURL = process.argv[2] ? process.argv[2].replace(/\/$/, "") : liveBaseURL;
const isHttpsTarget = baseURL.startsWith("https://");
const requiredHeaders = [
  ["content-security-policy", /form-action 'self' https:\/\/formspree\.io/],
  ["access-control-allow-origin", /^https:\/\/www\.evochia\.gr$/i],
  ["x-content-type-options", /^nosniff$/i],
  ["referrer-policy", /^strict-origin-when-cross-origin$/i],
  ["permissions-policy", /camera=\(\)/],
  ["x-frame-options", /^DENY$/i],
  ["cross-origin-opener-policy", /^same-origin$/i],
  ["cross-origin-resource-policy", /^same-site$/i],
];
const rows = [];

for (const route of headerCheckRoutes) {
  const response = await fetchWithTimeout(toAbsoluteUrl(route, baseURL), { timeoutMs: 15_000 });
  const errors = [];

  if (!response.ok) {
    errors.push(`Route returned ${response.status}.`);
  }

  for (const [headerName, pattern] of requiredHeaders) {
    const value = response.headers.get(headerName);
    if (!value) {
      errors.push(`Missing ${headerName}.`);
      continue;
    }

    if (!pattern.test(value)) {
      errors.push(`${headerName} has unexpected value: ${value}`);
    }
  }

  const hsts = response.headers.get("strict-transport-security");
  if (isHttpsTarget) {
    if (!hsts) {
      errors.push("Missing strict-transport-security.");
    } else if (!/max-age=63072000/i.test(hsts)) {
      errors.push(`strict-transport-security has unexpected value: ${hsts}`);
    }
  }

  rows.push({
    route,
    status: response.status,
    errors,
  });
}

const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
const summary = {
  tool: "check-security-headers",
  status: errorCount ? "failed" : "passed",
  baseURL,
  checkedRoutes: rows.length,
  errorCount,
  rows,
};

writeJsonReport(["headers", "security-headers.json"], summary);
writeTextReport(
  ["headers", "security-headers.md"],
  [
    "# Security Headers",
    "",
    `- Status: ${summary.status}`,
    `- Base URL: ${summary.baseURL}`,
    `- Checked routes: ${summary.checkedRoutes}`,
    `- Errors: ${summary.errorCount}`,
  ].join("\n"),
);

console.table(
  rows.map((row) => ({
    route: row.route,
    status: row.status,
    errors: row.errors.length,
  })),
);

if (errorCount) {
  process.exit(1);
}
