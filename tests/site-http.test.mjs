import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test, { after, before } from "node:test";

import {
  previewHost,
  redirectChecks,
  repoRoot,
  securityHeaderChecks,
  smokeRoutes,
} from "../scripts/qa-config.mjs";

const previewPort = 4174;
const baseURL = `http://${previewHost}:${previewPort}`;

let serverProcess;

async function waitForServer(processHandle) {
  let output = "";

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for preview server.\n${output}`));
    }, 15000);

    function handleChunk(chunk) {
      output += chunk.toString();
      if (output.includes("Preview server listening")) {
        clearTimeout(timeout);
        resolve();
      }
    }

    processHandle.stdout.on("data", handleChunk);
    processHandle.stderr.on("data", handleChunk);
    processHandle.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Preview server exited early with code ${code}.\n${output}`));
    });
  });
}

before(async () => {
  serverProcess = spawn(
    process.execPath,
    ["scripts/preview-server.mjs", "--host", previewHost, "--port", String(previewPort)],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PREVIEW_HOST: previewHost,
        PREVIEW_PORT: String(previewPort),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  await waitForServer(serverProcess);
});

after(async () => {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await once(serverProcess, "exit").catch(() => {});
});

test("preview health endpoint reports ready", async () => {
  const response = await fetch(`${baseURL}/__qa__/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);

  const payload = await response.json();
  assert.equal(payload.status, "ok");
});

test("preview server preserves EN-first legacy redirects", async () => {
  for (const [source, destination] of redirectChecks) {
    const response = await fetch(`${baseURL}${source}`, {
      redirect: "manual",
    });

    assert.equal(
      response.status,
      301,
      `${source} should return a 301 redirect in preview mode`,
    );
    assert.equal(response.headers.get("location"), destination);
  }
});

test("critical localized pages return HTML and security headers", async () => {
  for (const route of smokeRoutes) {
    const response = await fetch(`${baseURL}${route}`);

    assert.equal(response.status, 200, `${route} should return 200`);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);

    for (const headerName of securityHeaderChecks) {
      assert.ok(
        response.headers.get(headerName),
        `${route} is missing ${headerName}`,
      );
    }
  }
});

test("localized 404s stay localized and noindex", async () => {
  const expectations = [
    { route: "/en/missing-route/", header: "/en/404/", language: "en" },
    { route: "/el/route-pou-den-yparxei/", header: "/el/404/", language: "el" },
  ];

  for (const expectation of expectations) {
    const response = await fetch(`${baseURL}${expectation.route}`, {
      redirect: "manual",
    });

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-localized-404"), expectation.header);
    assert.equal(response.headers.get("x-robots-tag"), "noindex");

    const html = await response.text();
    assert.match(html, new RegExp(`<html lang="${expectation.language}"`));
  }
});

test("assets keep the expected cache headers", async () => {
  const assets = [
    { route: "/css/site.css", cache: "max-age=0" },
    { route: "/js/site.js", cache: "max-age=0" },
    { route: "/assets/logo.webp", cache: "immutable" },
    { route: "/photos/about-editorial.jpg", cache: "immutable" },
  ];

  for (const asset of assets) {
    const response = await fetch(`${baseURL}${asset.route}`);

    assert.equal(response.status, 200, `${asset.route} should return 200`);
    assert.match(
      response.headers.get("cache-control") ?? "",
      new RegExp(asset.cache),
      `${asset.route} should keep ${asset.cache}`,
    );
  }
});
