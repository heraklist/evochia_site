import { indexedLocalizedPages } from "./content-routes.mjs";
import {
  extractJsonLd,
  fetchWithTimeout,
  flattenJsonLdTypes,
  readRepoText,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import { liveBaseURL } from "./qa-config.mjs";

const mode = process.argv[2] === "live" ? "live" : "local";
const liveOrigin = new URL(liveBaseURL).origin;
const expectedTypes = new Map([
  ["index", ["Organization", "CateringBusiness", "WebSite", "WebPage"]],
  ["about", ["AboutPage", "BreadcrumbList"]],
  ["menus", ["CollectionPage", "BreadcrumbList"]],
  ["contact", ["ContactPage", "BreadcrumbList"]],
  ["faq", ["FAQPage"]],
  ["lookbook", ["WebPage", "BreadcrumbList"]],
]);
const servicePages = new Set([
  "catering",
  "wedding-catering",
  "corporate-catering",
  "private-chef",
  "villa-private-chef",
  "yacht-private-chef",
  "athens-private-chef",
  "greek-islands-private-chef",
]);
const rows = [];

for (const entry of indexedLocalizedPages) {
  const html =
    mode === "live"
      ? await fetchPage(entry.url.replace("https://www.evochia.gr", liveOrigin))
      : readRepoText(entry.file);
  const blocks = extractJsonLd(html);
  const errors = [];

  if (!blocks.length) {
    errors.push("Missing JSON-LD.");
  }

  for (const block of blocks) {
    if (block.error) {
      errors.push(`Invalid JSON-LD: ${block.error}`);
      continue;
    }

    const context =
      block.parsed && typeof block.parsed === "object" ? block.parsed["@context"] : null;
    if (!context) {
      errors.push("JSON-LD block is missing @context.");
    }
  }

  const discoveredTypes = new Set();
  for (const block of blocks) {
    if (!block.parsed) {
      continue;
    }

    for (const item of flattenJsonLdTypes(block.parsed)) {
      discoveredTypes.add(item);
    }
  }

  const requiredTypes = servicePages.has(entry.page)
    ? ["Service", "BreadcrumbList"]
    : (expectedTypes.get(entry.page) ?? ["WebPage"]);

  for (const type of requiredTypes) {
    if (!discoveredTypes.has(type)) {
      errors.push(`Missing expected JSON-LD type ${type}.`);
    }
  }

  rows.push({
    ...entry,
    mode,
    errors,
    discoveredTypes: [...discoveredTypes].sort(),
  });
}

const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
const summary = {
  tool: "check-structured-data",
  mode,
  status: errorCount ? "failed" : "passed",
  checkedPages: rows.length,
  errorCount,
  rows,
};

writeJsonReport(["custom", `structured-data-${mode}.json`], summary);
writeTextReport(
  ["custom", `structured-data-${mode}.md`],
  [
    `# Structured Data (${mode})`,
    "",
    `- Status: ${summary.status}`,
    `- Checked pages: ${summary.checkedPages}`,
    `- Errors: ${summary.errorCount}`,
  ].join("\n"),
);

console.table(
  rows.map((row) => ({
    page: row.file,
    types: row.discoveredTypes.join(", "),
    errors: row.errors.length,
  })),
);

if (errorCount) {
  process.exit(1);
}

async function fetchPage(url) {
  const response = await fetchWithTimeout(url, { timeoutMs: 15_000 });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
