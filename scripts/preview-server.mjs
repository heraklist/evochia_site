import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

import {
  localBaseURL,
  previewHost,
  previewPort,
  repoRoot,
} from "./qa-config.mjs";

const vercelConfig = JSON.parse(
  readFileSync(path.join(repoRoot, "vercel.json"), "utf8"),
);

const redirectMap = new Map(
  vercelConfig.redirects.map((entry) => [
    entry.source,
    { destination: entry.destination, statusCode: entry.statusCode ?? 301 },
  ]),
);

const globalHeaders = Object.fromEntries(
  vercelConfig.headers
    .find((entry) => entry.source === "/(.*)")
    .headers.map((entry) => [entry.key, entry.value]),
);

const cacheRules = vercelConfig.headers
  .filter((entry) => entry.source !== "/(.*)")
  .map((entry) => ({
    prefix: entry.source.replace("(.*)", "").replace(/\/$/, ""),
    headers: Object.fromEntries(entry.headers.map((header) => [header.key, header.value])),
  }));

const mimeTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".otf", "font/otf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function hasFileExtension(pathname) {
  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
  return lastSegment.includes(".");
}

function resolveInsideRepo(relativePath) {
  const sanitizedPath = relativePath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(repoRoot, sanitizedPath);
  const relative = path.relative(repoRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolvedPath;
}

function resolveHtmlPath(pathname) {
  if (pathname === "/") {
    return null;
  }

  if (pathname.startsWith("/en/") || pathname.startsWith("/el/")) {
    const segments = pathname.split("/").filter(Boolean);
    const locale = segments[0];
    const slug = segments.slice(1).join("/");
    return resolveInsideRepo(path.join(locale, slug ? `${slug}.html` : "index.html"));
  }

  const slug = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!slug) {
    return null;
  }

  return resolveInsideRepo(`${slug}.html`);
}

function isReadableFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return false;
  }

  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function getHeaders(pathname, statusCode, contentType) {
  const headers = {
    ...globalHeaders,
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Content-Type": contentType,
  };

  for (const rule of cacheRules) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      Object.assign(headers, rule.headers);
    }
  }

  if (statusCode === 404) {
    headers["X-Robots-Tag"] = "noindex";
  }

  if (!pathname.startsWith("/en/") && !pathname.startsWith("/el/")) {
    delete headers["X-Robots-Tag"];
  }

  return headers;
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(body);
}

function redirect(response, destination, statusCode) {
  response.writeHead(statusCode, {
    Location: destination,
    "Cache-Control": "public, max-age=0, must-revalidate",
  });
  response.end();
}

function streamFile(response, pathname, filePath, statusCode = 200, extraHeaders = {}) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension) ?? "application/octet-stream";
  const headers = {
    ...getHeaders(pathname, statusCode, contentType),
    ...extraHeaders,
  };

  response.writeHead(statusCode, headers);
  createReadStream(filePath).pipe(response);
}

function localized404(response, pathname, locale) {
  const localizedPath = `/${locale}/404/`;
  const filePath = path.join(repoRoot, locale, "404.html");

  if (isReadableFile(filePath)) {
    streamFile(response, localizedPath, filePath, 404, {
      "X-Localized-404": localizedPath,
    });
    return;
  }

  const fallback404 = path.join(repoRoot, "404.html");
  streamFile(response, pathname, fallback404, 404, {
    "X-Localized-404": localizedPath,
  });
}

function default404(response, pathname) {
  const filePath = path.join(repoRoot, "404.html");
  if (isReadableFile(filePath)) {
    streamFile(response, pathname, filePath, 404);
    return;
  }

  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end("Not Found");
}

const server = http.createServer((request, response) => {
  if (!request.url) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Missing request URL");
    return;
  }

  const url = new URL(request.url, `${localBaseURL}/`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/__qa__/health") {
    sendJson(response, 200, {
      status: "ok",
      baseURL: localBaseURL,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const redirectEntry = redirectMap.get(pathname);
  if (redirectEntry) {
    redirect(response, redirectEntry.destination, redirectEntry.statusCode);
    return;
  }

  if (
    pathname !== "/" &&
    !pathname.endsWith("/") &&
    !hasFileExtension(pathname) &&
    (pathname.startsWith("/en/") || pathname.startsWith("/el/") || pathname === "/en" || pathname === "/el")
  ) {
    redirect(response, `${pathname}/`, 308);
    return;
  }

  if (hasFileExtension(pathname)) {
    const filePath = resolveInsideRepo(pathname);
    if (filePath && isReadableFile(filePath)) {
      streamFile(response, pathname, filePath);
      return;
    }

    default404(response, pathname);
    return;
  }

  const htmlPath = resolveHtmlPath(pathname);
  if (isReadableFile(htmlPath)) {
    streamFile(response, pathname, htmlPath);
    return;
  }

  if (pathname.startsWith("/en/")) {
    localized404(response, pathname, "en");
    return;
  }

  if (pathname.startsWith("/el/")) {
    localized404(response, pathname, "el");
    return;
  }

  default404(response, pathname);
});

server.listen(previewPort, previewHost, () => {
  console.log(`Preview server listening at ${localBaseURL}`);
});
