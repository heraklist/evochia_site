import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "./qa-config.mjs";

const targetUrl = process.argv[2] ?? process.env.PAGESPEED_URL ?? "https://www.evochia.gr/en/";
const strategies = (process.env.PAGESPEED_STRATEGIES ?? "mobile,desktop")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const categories = ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"];
const apiKey = process.env.PAGESPEED_API_KEY?.trim();
const retryCount = Math.max(0, Number.parseInt(process.env.PAGESPEED_RETRIES ?? "2", 10));

const reportDir = path.join(repoRoot, ".reports", "pagespeed");
mkdirSync(reportDir, { recursive: true });

function slugify(value) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function getSummary(payload) {
  const categories = payload.lighthouseResult.categories;
  const audits = payload.lighthouseResult.audits;

  return {
    performance: categories.performance?.score ?? null,
    accessibility: categories.accessibility?.score ?? null,
    bestPractices: categories["best-practices"]?.score ?? null,
    seo: categories.seo?.score ?? null,
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    inpMs: audits.interaction_to_next_paint?.numericValue ?? null,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
    fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
    speedIndexMs: audits["speed-index"]?.numericValue ?? null,
  };
}

function getRetryDelay(response, attempt) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000;
  }

  return Math.min(10_000, 2_000 * attempt);
}

function isRetriableStatus(status) {
  return status === 429 || status >= 500;
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestPageSpeed(strategy) {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", targetUrl);
  endpoint.searchParams.set("strategy", strategy);

  for (const category of categories) {
    endpoint.searchParams.append("category", category);
  }

  if (apiKey) {
    endpoint.searchParams.set("key", apiKey);
  }

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const response = await fetch(endpoint);
    if (response.ok) {
      return response.json();
    }

    if (attempt < retryCount && isRetriableStatus(response.status)) {
      await sleep(getRetryDelay(response, attempt + 1));
      continue;
    }

    const body = await response.text();
    const excerpt = body.replace(/\s+/g, " ").slice(0, 240);
    throw new Error(
      `PageSpeed request failed for ${strategy}: ${response.status} ${response.statusText}${excerpt ? ` | ${excerpt}` : ""}`,
    );
  }

  throw new Error(`PageSpeed request failed for ${strategy}: retries exhausted.`);
}

const failures = [];

for (const strategy of strategies) {
  try {
    const payload = await requestPageSpeed(strategy);
    const summary = getSummary(payload);
    const slug = slugify(`${targetUrl}-${strategy}`);

    writeFileSync(
      path.join(reportDir, `${slug}.json`),
      JSON.stringify(payload, null, 2),
    );

    writeFileSync(
      path.join(reportDir, `${slug}.summary.json`),
      JSON.stringify(summary, null, 2),
    );

    console.log(`\nPageSpeed ${strategy}: ${targetUrl}`);
    console.table(summary);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(failure);
  }

  process.exit(1);
}