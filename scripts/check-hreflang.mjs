import { localizedContentPages } from "./content-routes.mjs";
import {
  extractAlternateLinks,
  fetchWithTimeout,
  readRepoText,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import { liveBaseURL } from "./qa-config.mjs";

const mode = process.argv[2] === "live" ? "live" : "local";
const liveOrigin = new URL(liveBaseURL).origin;
const rows = [];

for (const entry of localizedContentPages) {
  const html =
    mode === "live"
      ? await fetchPage(entry.url.replace("https://www.evochia.gr", liveOrigin))
      : readRepoText(entry.file);
  const alternates = extractAlternateLinks(html);
  const map = new Map(alternates.map((item) => [item.hreflang, item.href]));
  const expected = {
    en: entry.url.replace(`/${entry.locale}/`, "/en/"),
    el: entry.url.replace(`/${entry.locale}/`, "/el/"),
    "x-default": entry.url.replace(`/${entry.locale}/`, "/en/"),
  };
  const errors = [];

  for (const [hreflang, href] of Object.entries(expected)) {
    const actual = map.get(hreflang);
    if (!actual) {
      errors.push(`Missing hreflang="${hreflang}".`);
      continue;
    }

    if (actual !== href) {
      errors.push(`hreflang="${hreflang}" should point to ${href} but found ${actual}.`);
    }
  }

  rows.push({
    ...entry,
    checkedMode: mode,
    errors,
  });
}

const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
const summary = {
  tool: "check-hreflang",
  mode,
  status: errorCount ? "failed" : "passed",
  checkedPages: rows.length,
  errorCount,
  rows,
};

writeJsonReport(["custom", `hreflang-${mode}.json`], summary);
writeTextReport(
  ["custom", `hreflang-${mode}.md`],
  [
    `# Hreflang (${mode})`,
    "",
    `- Status: ${summary.status}`,
    `- Checked pages: ${summary.checkedPages}`,
    `- Errors: ${summary.errorCount}`,
  ].join("\n"),
);

console.table(
  rows.map((row) => ({
    page: row.file,
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
