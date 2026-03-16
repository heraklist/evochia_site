import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
const envFilePath = path.join(repoRoot, ".env");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] != null) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(envFilePath);

export const previewHost = process.env.PREVIEW_HOST ?? "127.0.0.1";
const previewPortValue = process.env.PREVIEW_PORT ?? process.env.PORT ?? "4173";
const parsedPreviewPort = Number.parseInt(previewPortValue, 10);
export const previewPort = Number.isFinite(parsedPreviewPort) ? parsedPreviewPort : 4173;

export const localBaseURL = `http://${previewHost}:${previewPort}`;
export const auditBaseURL = (process.env.AUDIT_BASE_URL ?? localBaseURL).replace(/\/$/, "");
export const lighthouseBaseURL = (
  process.env.LIGHTHOUSE_BASE_URL ??
  process.env.AUDIT_BASE_URL ??
  localBaseURL
).replace(/\/$/, "");
export const liveBaseURL = (process.env.LIVE_BASE_URL ?? "https://www.evochia.gr").replace(/\/$/, "");
export const useLocalAuditTarget = auditBaseURL === localBaseURL;
export const useLocalLighthouseTarget = lighthouseBaseURL === localBaseURL;

export const smokeRoutes = Object.freeze([
  "/en/",
  "/en/about/",
  "/en/catering/",
  "/en/wedding-catering/",
  "/en/corporate-catering/",
  "/en/private-chef/",
  "/en/villa-private-chef/",
  "/en/yacht-private-chef/",
  "/en/athens-private-chef/",
  "/en/greek-islands-private-chef/",
  "/en/menus/",
  "/en/contact/",
  "/en/faq/",
  "/en/lookbook/",
  "/el/",
  "/el/about/",
  "/el/catering/",
  "/el/wedding-catering/",
  "/el/corporate-catering/",
  "/el/private-chef/",
  "/el/villa-private-chef/",
  "/el/yacht-private-chef/",
  "/el/athens-private-chef/",
  "/el/greek-islands-private-chef/",
  "/el/menus/",
  "/el/contact/",
  "/el/faq/",
  "/el/lookbook/",
]);

export const accessibilityRoutes = Object.freeze([
  "/en/",
  "/en/about/",
  "/en/catering/",
  "/en/wedding-catering/",
  "/en/corporate-catering/",
  "/en/private-chef/",
  "/en/villa-private-chef/",
  "/en/yacht-private-chef/",
  "/en/athens-private-chef/",
  "/en/greek-islands-private-chef/",
  "/en/menus/",
  "/en/contact/",
  "/en/faq/",
  "/en/lookbook/",
  "/el/",
  "/el/about/",
  "/el/catering/",
  "/el/private-chef/",
  "/el/menus/",
  "/el/contact/",
  "/el/faq/",
  "/el/lookbook/",
]);

export const lighthouseRoutes = Object.freeze([
  "/en/",
  "/en/catering/",
  "/en/private-chef/",
  "/en/contact/",
]);

export const redirectChecks = Object.freeze([
  ["/", "/en/"],
  ["/index", "/en/"],
  ["/index/", "/en/"],
  ["/about", "/en/about/"],
  ["/about/", "/en/about/"],
  ["/catering", "/en/catering/"],
  ["/catering/", "/en/catering/"],
  ["/wedding-catering", "/en/wedding-catering/"],
  ["/wedding-catering/", "/en/wedding-catering/"],
  ["/corporate-catering", "/en/corporate-catering/"],
  ["/corporate-catering/", "/en/corporate-catering/"],
  ["/private-chef", "/en/private-chef/"],
  ["/private-chef/", "/en/private-chef/"],
  ["/villa-private-chef", "/en/villa-private-chef/"],
  ["/villa-private-chef/", "/en/villa-private-chef/"],
  ["/yacht-private-chef", "/en/yacht-private-chef/"],
  ["/yacht-private-chef/", "/en/yacht-private-chef/"],
  ["/athens-private-chef", "/en/athens-private-chef/"],
  ["/athens-private-chef/", "/en/athens-private-chef/"],
  ["/greek-islands-private-chef", "/en/greek-islands-private-chef/"],
  ["/greek-islands-private-chef/", "/en/greek-islands-private-chef/"],
  ["/menus", "/en/menus/"],
  ["/menus/", "/en/menus/"],
  ["/contact", "/en/contact/"],
  ["/contact/", "/en/contact/"],
  ["/privacy", "/en/privacy/"],
  ["/privacy/", "/en/privacy/"],
  ["/faq", "/en/faq/"],
  ["/faq/", "/en/faq/"],
  ["/lookbook", "/en/lookbook/"],
  ["/lookbook/", "/en/lookbook/"],
]);

export const securityHeaderChecks = Object.freeze([
  "content-security-policy",
  "referrer-policy",
  "permissions-policy",
  "x-content-type-options",
  "x-frame-options",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
]);

export const visualScenarios = Object.freeze([
  {
    name: "en-home-hero",
    route: "/en/",
    selector: ".hero",
  },
  {
    name: "en-contact-hero",
    route: "/en/contact/",
    selector: ".hero.page-hero",
  },
]);

export function resolveAuditUrl(route, baseURL = auditBaseURL) {
  return new URL(route, `${baseURL}/`).toString();
}

export function resolveLighthouseUrl(route) {
  return new URL(route, `${lighthouseBaseURL}/`).toString();
}

export function reportPath(...segments) {
  return path.join(repoRoot, ".reports", ...segments);
}
