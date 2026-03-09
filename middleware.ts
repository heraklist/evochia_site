import { readFileSync } from 'node:fs';

const EN_404_HTML = readFileSync(new URL('./en/404.html', import.meta.url), 'utf8');
const EL_404_HTML = readFileSync(new URL('./el/404.html', import.meta.url), 'utf8');

const EN_ROUTES = new Set([
  '/en/',
  '/en/about/',
  '/en/catering/',
  '/en/private-chef/',
  '/en/menus/',
  '/en/contact/',
  '/en/privacy/',
  '/en/404/',
]);

const EL_ROUTES = new Set([
  '/el/',
  '/el/about/',
  '/el/catering/',
  '/el/private-chef/',
  '/el/menus/',
  '/el/contact/',
  '/el/privacy/',
  '/el/404/',
]);

const RESPONSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://formspree.io https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-Robots-Tag': 'noindex',
};

function normalizePathname(pathname: string): string {
  if (pathname === '/en' || pathname === '/el') {
    return pathname + '/';
  }

  return pathname.endsWith('/') ? pathname : pathname + '/';
}

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
  return lastSegment.includes('.');
}

function notFoundResponse(html: string): Response {
  return new Response(html, {
    status: 404,
    headers: RESPONSE_HEADERS,
  });
}

export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (hasFileExtension(url.pathname)) {
    return;
  }

  if (pathname.startsWith('/en/')) {
    if (EN_ROUTES.has(pathname)) {
      return;
    }

    return notFoundResponse(EN_404_HTML);
  }

  if (pathname.startsWith('/el/')) {
    if (EL_ROUTES.has(pathname)) {
      return;
    }

    return notFoundResponse(EL_404_HTML);
  }

  return;
}

export const config = {
  matcher: ['/en/:path*', '/el/:path*'],
  runtime: 'nodejs',
};