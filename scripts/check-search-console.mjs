import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { createSkipReport, fetchWithTimeout, writeJsonReport, writeTextReport } from "./audit-utils.mjs";
import { liveBaseURL } from "./qa-config.mjs";

const siteUrl = process.env.GSC_SITE_URL?.trim();
const accessToken = process.env.GSC_ACCESS_TOKEN?.trim();
const rawServiceAccount = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
const inspectionUrls = (process.env.GSC_INSPECTION_URLS ??
  `${liveBaseURL}/en/,${liveBaseURL}/el/,${liveBaseURL}/en/contact/`)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const lookbackDays = Math.max(7, Number.parseInt(process.env.GSC_LOOKBACK_DAYS ?? "28", 10));

if (!siteUrl || (!accessToken && !rawServiceAccount)) {
  const summary = createSkipReport(
    "check-search-console",
    "GSC_SITE_URL and either GSC_ACCESS_TOKEN or GSC_SERVICE_ACCOUNT_JSON are required.",
  );
  writeJsonReport(["search-console", "search-console.json"], summary);
  process.exit(0);
}

const token = accessToken || (await getServiceAccountAccessToken(rawServiceAccount));
const endDate = resolveEndDate();
const startDate = new Date(endDate.getTime() - (lookbackDays - 1) * 24 * 60 * 60 * 1000);

const analytics = await requestJson(
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ["page"],
      rowLimit: 25,
      dataState: "final",
    }),
  },
);

const inspections = [];
const warnings = [];

for (const inspectionUrl of inspectionUrls) {
  const payload = await requestJson("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
      languageCode: "en-US",
    }),
  });

  const indexStatus = payload.inspectionResult?.indexStatusResult ?? {};
  const row = {
    url: inspectionUrl,
    verdict: indexStatus.verdict ?? "UNKNOWN",
    coverageState: indexStatus.coverageState ?? "UNKNOWN",
    indexingState: indexStatus.indexingState ?? "UNKNOWN",
    lastCrawlTime: indexStatus.lastCrawlTime ?? null,
    pageFetchState: indexStatus.pageFetchState ?? "UNKNOWN",
  };

  if (row.verdict !== "PASS") {
    warnings.push(`${inspectionUrl} inspection verdict is ${row.verdict}.`);
  }

  inspections.push(row);
}

const topPages = (analytics.rows ?? []).map((row) => ({
  page: row.keys?.[0] ?? "",
  clicks: row.clicks ?? 0,
  impressions: row.impressions ?? 0,
  ctr: row.ctr ?? 0,
  position: row.position ?? 0,
}));

const totals = topPages.reduce(
  (result, row) => ({
    clicks: result.clicks + row.clicks,
    impressions: result.impressions + row.impressions,
  }),
  { clicks: 0, impressions: 0 },
);

const summary = {
  tool: "check-search-console",
  status: warnings.length ? "warning" : "passed",
  siteUrl,
  dateRange: {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  },
  totals,
  topPages,
  inspections,
  warningCount: warnings.length,
  warnings,
};

writeJsonReport(["search-console", "search-console.json"], summary);
writeTextReport(
  ["search-console", "search-console.md"],
  [
    "# Search Console",
    "",
    `- Status: ${summary.status}`,
    `- Site URL: ${summary.siteUrl}`,
    `- Date range: ${summary.dateRange.startDate} to ${summary.dateRange.endDate}`,
    `- Clicks: ${summary.totals.clicks}`,
    `- Impressions: ${summary.totals.impressions}`,
    `- Warnings: ${summary.warningCount}`,
  ].join("\n"),
);

console.table(
  topPages.slice(0, 10).map((row) => ({
    page: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Number((row.ctr * 100).toFixed(2)),
    position: Number(row.position.toFixed(2)),
  })),
);

async function requestJson(url, options) {
  const response = await fetchWithTimeout(url, {
    ...options,
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Search Console request failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function getServiceAccountAccessToken(rawValue) {
  const serviceAccount = parseServiceAccount(rawValue);
  const header = encodeSegment({ alg: "RS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const claim = encodeSegment({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  });
  const unsignedToken = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsignedToken).sign(serviceAccount.private_key);
  const assertion = `${unsignedToken}.${signature.toString("base64url")}`;
  const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    timeoutMs: 20_000,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to exchange Search Console JWT: ${response.status} ${body}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Search Console token response did not include access_token.");
  }

  return payload.access_token;
}

function parseServiceAccount(rawValue) {
  const source = existsSync(rawValue) ? readFileSync(rawValue, "utf8") : rawValue;
  const parsed = JSON.parse(source);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GSC service account JSON is missing client_email or private_key.");
  }

  return parsed;
}

function resolveEndDate() {
  if (process.env.GSC_END_DATE) {
    return new Date(`${process.env.GSC_END_DATE}T00:00:00Z`);
  }

  return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
}

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
