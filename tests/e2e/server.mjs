import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SERVER_HOST = '127.0.0.1';
export const SERVER_PORT = 4173;
export const LOOPBACK_ORIGIN = `http://${SERVER_HOST}:${SERVER_PORT}`;
export const PRODUCTION_ORIGIN = `http://www.evochia.gr:${SERVER_PORT}`;
export const HEALTH_URL = `${LOOPBACK_ORIGIN}/__health`;

const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CONTENT_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function cleanRouteToRelativePath(pathname) {
  const homeMatch = pathname.match(/^\/(en|el)\/$/);
  if (homeMatch) return `${homeMatch[1]}/index.html`;

  const localizedMatch = pathname.match(/^\/(en|el)\/([^/]+)\/$/);
  if (localizedMatch) return `${localizedMatch[1]}/${localizedMatch[2]}.html`;

  return pathname.replace(/^\/+/, '');
}

function repositoryFile(relativePath) {
  const candidate = resolve(REPOSITORY_ROOT, relativePath);
  const repositoryPrefix = REPOSITORY_ROOT.endsWith(sep)
    ? REPOSITORY_ROOT
    : REPOSITORY_ROOT + sep;
  return candidate.startsWith(repositoryPrefix) ? candidate : null;
}

async function serveRepositoryFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad Request');
    return;
  }

  const filePath = repositoryFile(cleanRouteToRelativePath(decodedPath));
  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const metadata = await stat(filePath);
    if (!metadata.isFile()) throw new Error('Not a file');
    const body = request.method === 'HEAD' ? undefined : await readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': metadata.size,
      'Content-Type': CONTENT_TYPES.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  }
}

export function createE2eServer() {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url ?? '/', LOOPBACK_ORIGIN);
    if (requestUrl.pathname === '/__health') {
      const body = JSON.stringify({ nodeVersion: process.version, status: 'ok' });
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
      return;
    }

    await serveRepositoryFile(request, response, requestUrl.pathname);
  });
}

function isDirectExecution() {
  return process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isDirectExecution()) {
  const server = createE2eServer();
  server.listen(SERVER_PORT, SERVER_HOST, () => {
    process.stdout.write(`Evochia E2E server listening on ${LOOPBACK_ORIGIN}\n`);
  });

  const close = () => server.close(() => process.exit(0));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
