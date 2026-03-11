import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const helperDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(helperDir, "..", "..");

export const locales = ["en", "el"];
export const contentPages = [
  "index",
  "about",
  "catering",
  "wedding-catering",
  "corporate-catering",
  "private-chef",
  "villa-private-chef",
  "yacht-private-chef",
  "athens-private-chef",
  "greek-islands-private-chef",
  "menus",
  "contact",
  "privacy",
];
export const sitemapPages = [
  "index",
  "about",
  "catering",
  "wedding-catering",
  "corporate-catering",
  "private-chef",
  "villa-private-chef",
  "yacht-private-chef",
  "athens-private-chef",
  "greek-islands-private-chef",
  "menus",
  "contact",
];

export function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function pagePath(locale, page) {
  return page === "index"
    ? path.join(locale, "index.html")
    : path.join(locale, `${page}.html`);
}

export function publicUrl(locale, page) {
  const suffix = page === "index" ? "" : `${page}/`;
  return `https://www.evochia.gr/${locale}/${suffix}`;
}

export function listFiles(relativeDir, extension) {
  const directory = path.join(repoRoot, relativeDir);
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(relativeDir, entry.name));
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractAll(regex, value) {
  return Array.from(value.matchAll(regex), (match) => match);
}
