import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  localBaseURL,
  previewHost,
  previewPort,
  reportPath,
  repoRoot,
} from "./qa-config.mjs";

export function ensureReportDir(...segments) {
  const directory = reportPath(...segments);
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function writeJsonReport(segments, payload) {
  const filePath = Array.isArray(segments) ? reportPath(...segments) : reportPath(segments);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

export function writeTextReport(segments, content) {
  const filePath = Array.isArray(segments) ? reportPath(...segments) : reportPath(segments);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

export function readRepoText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function slugify(value) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function stripTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

export function toAbsoluteUrl(candidate, baseURL) {
  return new URL(candidate, `${baseURL.replace(/\/$/, "")}/`).toString();
}

export function normalizeUrl(candidate) {
  return candidate.replace(/#.*$/, "");
}

export function extractTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : null;
}

export function extractMetaContent(html, attributeName, attributeValue) {
  const match = html.match(
    new RegExp(
      `<meta[^>]+${attributeName}="${escapeRegex(attributeValue)}"[^>]+content="([^"]*)"[^>]*>`,
      "i",
    ),
  );
  return match ? decodeHtml(match[1]) : null;
}

export function extractLinkHref(html, relValue, extraAttribute = null) {
  const extraPattern = extraAttribute
    ? `[^>]+${extraAttribute.name}="${escapeRegex(extraAttribute.value)}"`
    : "";
  const match = html.match(
    new RegExp(
      `<link[^>]+rel="${escapeRegex(relValue)}"${extraPattern}[^>]+href="([^"]*)"[^>]*>`,
      "i",
    ),
  );

  return match ? match[1] : null;
}

export function extractAlternateLinks(html) {
  return Array.from(
    html.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]*)"[^>]*>/gi),
    (match) => ({
      hreflang: match[1],
      href: match[2],
    }),
  );
}

export function extractJsonLd(html) {
  return Array.from(
    html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    (match) => {
      const raw = decodeHtml(match[1].trim());
      try {
        return {
          raw,
          parsed: JSON.parse(raw),
          error: null,
        };
      } catch (error) {
        return {
          raw,
          parsed: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
}

export function extractAnchorHrefs(html) {
  return Array.from(html.matchAll(/<a\b[^>]+href="([^"]+)"/gi), (match) => match[1]);
}

export function flattenJsonLdTypes(value) {
  const types = new Set();

  function visit(node) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const entry of node) {
        visit(entry);
      }
      return;
    }

    const nodeType = node["@type"];
    if (Array.isArray(nodeType)) {
      for (const item of nodeType) {
        if (typeof item === "string") {
          types.add(item);
        }
      }
    } else if (typeof nodeType === "string") {
      types.add(nodeType);
    }

    if (node["@graph"]) {
      visit(node["@graph"]);
    }

    for (const value of Object.values(node)) {
      visit(value);
    }
  }

  visit(value);
  return types;
}

export async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const fetchOptions = { ...options };
  delete fetchOptions.timeoutMs;
  return fetch(url, {
    ...fetchOptions,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function followRedirectChain(url, options = {}) {
  const maxRedirects = options.maxRedirects ?? 5;
  const chain = [];
  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await fetchWithTimeout(currentUrl, {
      redirect: "manual",
      timeoutMs: options.timeoutMs,
    });

    const location = response.headers.get("location");
    chain.push({
      url: currentUrl,
      status: response.status,
      location,
    });

    if (!location || response.status < 300 || response.status >= 400) {
      return chain;
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  return chain;
}

export function createSkipReport(tool, reason, extra = {}) {
  return {
    tool,
    status: "skipped",
    reason,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function hasCommand(commandName) {
  const pathValue = process.env.PATH ?? "";
  const executableExtensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .filter(Boolean)
      : [""];

  for (const segment of pathValue.split(path.delimiter)) {
    if (!segment) {
      continue;
    }

    for (const extension of executableExtensions) {
      const candidate = path.join(segment, `${commandName}${extension}`);
      if (existsSync(candidate)) {
        return true;
      }
    }
  }

  return false;
}

export async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    shell: options.shell ?? false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

  return {
    code: exitCode ?? 0,
    stdout,
    stderr,
  };
}

function startPreviewServer() {
  const child = spawn(process.execPath, [path.join(repoRoot, "scripts", "preview-server.mjs")], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PREVIEW_HOST: previewHost,
      PREVIEW_PORT: String(previewPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];

  child.stdout?.on("data", (chunk) => {
    logs.push(String(chunk));
  });

  child.stderr?.on("data", (chunk) => {
    logs.push(String(chunk));
  });

  return {
    child,
    getLogs() {
      return logs.join("").trim();
    },
  };
}

export async function ensurePreviewServer(baseURL) {
  if (stripTrailingSlash(baseURL) !== stripTrailingSlash(localBaseURL)) {
    return null;
  }

  if (await healthcheck(`${localBaseURL}/__qa__/health`)) {
    return null;
  }

  const server = startPreviewServer();
  const timeoutAt = Date.now() + 30_000;

  while (Date.now() < timeoutAt) {
    if (server.child.exitCode != null) {
      throw new Error(`Preview server exited before becoming healthy.\n${server.getLogs()}`);
    }

    if (await healthcheck(`${localBaseURL}/__qa__/health`)) {
      return server;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  server.child.kill();
  throw new Error(`Timed out waiting for preview server.\n${server.getLogs()}`);
}

export function resetDirectory(directoryPath) {
  rmSync(directoryPath, { recursive: true, force: true });
  mkdirSync(directoryPath, { recursive: true });
}

export function copyDirectory(source, destination) {
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function healthcheck(url) {
  try {
    const response = await fetchWithTimeout(url, { timeoutMs: 5_000 });
    return response.ok;
  } catch {
    return false;
  }
}
