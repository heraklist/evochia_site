import path from "node:path";

import { localizedContentPages } from "./content-routes.mjs";
import {
  extractLinkHref,
  extractMetaContent,
  extractTitle,
  readRepoText,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";

const sitemap = readRepoText("sitemap.xml");
const rows = [];
const duplicateTitleMap = new Map();
const duplicateDescriptionMap = new Map();

for (const entry of localizedContentPages) {
  const html = readRepoText(entry.file);
  const title = extractTitle(html);
  const description = extractMetaContent(html, "name", "description");
  const robots = extractMetaContent(html, "name", "robots");
  const canonical = extractLinkHref(html, "canonical");
  const ogTitle = extractMetaContent(html, "property", "og:title");
  const ogDescription = extractMetaContent(html, "property", "og:description");
  const ogUrl = extractMetaContent(html, "property", "og:url");
  const ogImage = extractMetaContent(html, "property", "og:image");
  const errors = [];
  const warnings = [];

  if (!title) {
    errors.push("Missing <title>.");
  } else {
    if (title.length < 20 || title.length > 70) {
      warnings.push(`Title length ${title.length} is outside the 20-70 range.`);
    }
    if (entry.indexed) {
      duplicateTitleMap.set(title, [...(duplicateTitleMap.get(title) ?? []), entry.file]);
    }
  }

  if (!description) {
    errors.push("Missing meta description.");
  } else {
    if (description.length < 50 || description.length > 170) {
      warnings.push(`Meta description length ${description.length} is outside the 50-170 range.`);
    }
    if (entry.indexed) {
      duplicateDescriptionMap.set(description, [
        ...(duplicateDescriptionMap.get(description) ?? []),
        entry.file,
      ]);
    }
  }

  if (!robots) {
    errors.push("Missing robots meta tag.");
  } else if (entry.page === "privacy") {
    if (!/noindex/i.test(robots)) {
      errors.push("Privacy page should stay noindex.");
    }
  } else if (!/index/i.test(robots)) {
    errors.push("Indexed page is missing index in robots meta.");
  }

  if (!canonical) {
    errors.push("Missing canonical link.");
  } else if (canonical !== entry.url) {
    errors.push(`Canonical should be ${entry.url} but found ${canonical}.`);
  }

  if (entry.indexed) {
    if (!ogTitle || !ogDescription || !ogUrl || !ogImage) {
      errors.push("Indexed page is missing one or more Open Graph tags.");
    }

    if (ogUrl && ogUrl !== entry.url) {
      errors.push(`og:url should be ${entry.url} but found ${ogUrl}.`);
    }

    if (!sitemap.includes(`<loc>${entry.url}</loc>`)) {
      errors.push("Indexed page is missing from sitemap.xml.");
    }
  } else if (sitemap.includes(`<loc>${entry.url}</loc>`)) {
    errors.push("Non-indexed page should not appear in sitemap.xml.");
  }

  rows.push({
    ...entry,
    title,
    description,
    robots,
    canonical,
    ogUrl,
    errors,
    warnings,
  });
}

for (const [title, files] of duplicateTitleMap) {
  if (files.length < 2) {
    continue;
  }

  for (const row of rows.filter((entry) => entry.title === title)) {
    row.errors.push(`Duplicate title shared by: ${files.join(", ")}`);
  }
}

for (const [description, files] of duplicateDescriptionMap) {
  if (files.length < 2) {
    continue;
  }

  for (const row of rows.filter((entry) => entry.description === description)) {
    row.warnings.push(`Duplicate meta description shared by: ${files.join(", ")}`);
  }
}

const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
const warningCount = rows.reduce((sum, row) => sum + row.warnings.length, 0);

const summary = {
  tool: "check-seo-rules",
  status: errorCount ? "failed" : warningCount ? "warning" : "passed",
  checkedPages: rows.length,
  errorCount,
  warningCount,
  rows,
};

writeJsonReport(["custom", "seo-rules.json"], summary);
writeTextReport(
  ["custom", "seo-rules.md"],
  [
    "# SEO Rules",
    "",
    `- Status: ${summary.status}`,
    `- Checked pages: ${summary.checkedPages}`,
    `- Errors: ${summary.errorCount}`,
    `- Warnings: ${summary.warningCount}`,
    "",
    ...rows.map(
      (row) =>
        `- ${path.normalize(row.file)} | errors=${row.errors.length} | warnings=${row.warnings.length}`,
    ),
  ].join("\n"),
);

console.table(
  rows.map((row) => ({
    file: row.file,
    errors: row.errors.length,
    warnings: row.warnings.length,
  })),
);

if (errorCount) {
  process.exit(1);
}
