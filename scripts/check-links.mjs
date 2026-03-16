import { localizedContentPages } from "./content-routes.mjs";
import {
  ensurePreviewServer,
  extractAnchorHrefs,
  fetchWithTimeout,
  followRedirectChain,
  normalizeUrl,
  toAbsoluteUrl,
  writeJsonReport,
  writeTextReport,
} from "./audit-utils.mjs";
import { auditBaseURL } from "./qa-config.mjs";

const sourcePages = localizedContentPages.filter((entry) => entry.page !== "privacy");
const previewServer = await ensurePreviewServer(auditBaseURL);
const linkSources = new Map();

try {
  for (const entry of sourcePages) {
    const html = await fetchPage(toAbsoluteUrl(entry.route, auditBaseURL));
    const urls = new Set();

    for (const href of extractAnchorHrefs(html)) {
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        href.startsWith("https://wa.me/") ||
        href.startsWith("https://www.whatsapp.com/")
      ) {
        continue;
      }

      const absoluteUrl = normalizeUrl(toAbsoluteUrl(href, toAbsoluteUrl(entry.route, auditBaseURL)));
      if (!absoluteUrl.startsWith(auditBaseURL)) {
        continue;
      }
      urls.add(absoluteUrl);
    }

    for (const url of urls) {
      linkSources.set(url, [...(linkSources.get(url) ?? []), entry.route]);
    }
  }

  const brokenLinks = [];
  const redirectChains = [];

  for (const [url, sources] of linkSources) {
    const chain = await followRedirectChain(url, { timeoutMs: 15_000 });
    const finalHop = chain.at(-1);
    if (!finalHop) {
      brokenLinks.push({ url, sources, reason: "No response recorded." });
      continue;
    }

    if (finalHop.status >= 400) {
      brokenLinks.push({
        url,
        sources,
        reason: `Final status ${finalHop.status}.`,
        chain,
      });
      continue;
    }

    if (chain.length > 1) {
      redirectChains.push({
        url,
        sources,
        chain,
      });
    }
  }

  const summary = {
    tool: "check-links",
    status: brokenLinks.length ? "failed" : redirectChains.length ? "warning" : "passed",
    checkedSources: sourcePages.length,
    uniqueInternalLinks: linkSources.size,
    brokenLinks,
    redirectChains,
  };

  writeJsonReport(["custom", "links.json"], summary);
  writeTextReport(
    ["custom", "links.md"],
    [
      "# Links",
      "",
      `- Status: ${summary.status}`,
      `- Checked sources: ${summary.checkedSources}`,
      `- Unique internal links: ${summary.uniqueInternalLinks}`,
      `- Broken links: ${summary.brokenLinks.length}`,
      `- Redirect chains: ${summary.redirectChains.length}`,
    ].join("\n"),
  );

  console.table([
    {
      sources: summary.checkedSources,
      uniqueInternalLinks: summary.uniqueInternalLinks,
      brokenLinks: summary.brokenLinks.length,
      redirectChains: summary.redirectChains.length,
    },
  ]);

  if (brokenLinks.length) {
    process.exit(1);
  }
} finally {
  previewServer?.child.kill();
}

async function fetchPage(url) {
  const response = await fetchWithTimeout(url, { timeoutMs: 15_000 });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
