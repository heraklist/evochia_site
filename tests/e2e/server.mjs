import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SERVER_HOST = '127.0.0.1';
export const SERVER_PORT = 4173;
export const LOOPBACK_ORIGIN = `http://${SERVER_HOST}:${SERVER_PORT}`;
export const PRODUCTION_ORIGIN = `http://www.evochia.gr:${SERVER_PORT}`;
export const HEALTH_URL = `${LOOPBACK_ORIGIN}/__health`;

const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ALLOWED_HOST_HEADERS = new Set([
  `${SERVER_HOST}:${SERVER_PORT}`,
  `www.evochia.gr:${SERVER_PORT}`,
]);
const STATIC_PUBLIC_ROOTS = new Set(['assets', 'css', 'js', 'photos']);
const ROOT_PUBLIC_FILES = new Set([
  'googledfb93f1e746953d0.html',
  'googlef65d7b72f287c349.html',
  'robots.txt',
  'sitemap.xml',
]);
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

const publicRootsPromise = (async () => {
  const repositoryRoot = await realpath(REPOSITORY_ROOT);
  const roots = new Map();
  for (const rootName of ['assets', 'css', 'el', 'en', 'js', 'photos']) {
    roots.set(rootName, await realpath(resolve(REPOSITORY_ROOT, rootName)));
  }
  return { repositoryRoot, roots };
})();

function isWithin(root, candidate) {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (
    relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath)
  );
}

function publicRoute(pathname) {
  if (pathname.includes('\\')) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.'))) return null;

  const homeMatch = pathname.match(/^\/(en|el)\/$/);
  if (homeMatch) {
    return { relativePath: `${homeMatch[1]}/index.html`, rootName: homeMatch[1] };
  }

  const localizedMatch = pathname.match(/^\/(en|el)\/([^/]+)\/$/);
  if (localizedMatch) {
    return {
      relativePath: `${localizedMatch[1]}/${localizedMatch[2]}.html`,
      rootName: localizedMatch[1],
    };
  }

  if (segments.length >= 2 && STATIC_PUBLIC_ROOTS.has(segments[0])) {
    return { relativePath: segments.join('/'), rootName: segments[0] };
  }

  if (segments.length === 1 && ROOT_PUBLIC_FILES.has(segments[0])) {
    return { relativePath: segments[0], rootName: null };
  }

  return null;
}

async function publicFile(route) {
  if (!route) return null;
  const { repositoryRoot, roots } = await publicRootsPromise;
  const candidate = resolve(REPOSITORY_ROOT, route.relativePath);
  const candidateRealPath = await realpath(candidate);

  if (route.rootName) {
    const allowedRoot = roots.get(route.rootName);
    return allowedRoot && isWithin(allowedRoot, candidateRealPath) ? candidateRealPath : null;
  }

  const expectedRootFile = resolve(repositoryRoot, route.relativePath);
  return candidateRealPath === expectedRootFile ? candidateRealPath : null;
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

  try {
    const route = publicRoute(decodedPath);
    const filePath = await publicFile(route);
    if (!filePath) throw new Error('Not a public file');
    const metadata = await stat(filePath);
    if (!metadata.isFile()) throw new Error('Not a file');
    const body = request.method === 'HEAD' ? undefined : await readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': metadata.size,
      'Content-Type': CONTENT_TYPES.get(extname(route.relativePath).toLowerCase()) ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  }
}

export function createE2eServer() {
  return createServer(async (request, response) => {
    const requestHost = String(request.headers.host ?? '').toLowerCase();
    if (!ALLOWED_HOST_HEADERS.has(requestHost)) {
      response.writeHead(421, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Misdirected Request');
      return;
    }

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
