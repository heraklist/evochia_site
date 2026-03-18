const EN_ROUTES = new Set([
  '/en/',
  '/en/about/',
  '/en/catering/',
  '/en/private-chef/',
  '/en/menus/',
  '/en/contact/',
  '/en/privacy/',
  '/en/404/',
  '/en/wedding-catering/',
  '/en/corporate-catering/',
  '/en/villa-private-chef/',
  '/en/yacht-private-chef/',
  '/en/athens-private-chef/',
  '/en/greek-islands-private-chef/',
  '/en/faq/',
  '/en/lookbook/',
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
  '/el/wedding-catering/',
  '/el/corporate-catering/',
  '/el/villa-private-chef/',
  '/el/yacht-private-chef/',
  '/el/athens-private-chef/',
  '/el/greek-islands-private-chef/',
  '/el/faq/',
  '/el/lookbook/',
]);

const RESPONSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Access-Control-Allow-Origin': 'https://www.evochia.gr',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'sha256-6zefWJGrPID2O12tMqlt+A7g7LLB8Mo1hYUIcHEAP4I=' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; font-src 'self'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://formspree.io https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com; form-action 'self' https://formspree.io; frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'; media-src 'self'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-Robots-Tag': 'noindex',
};

const FALLBACK_HTML = {
  en: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Evochia \u2014 Page Not Found</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/css/critical.css?v=2.6"><link rel="stylesheet" href="/css/site.css?v=2.5"></head><body><main class="error-page"><section class="hero"><div class="container"><p class="eyebrow">404</p><h1>Page Not Found</h1><p>The page you're looking for may have moved, changed, or no longer exists.</p><div class="hero-actions"><a class="btn btn-primary" href="/en/">Back to Home</a><a class="btn btn-secondary" href="/en/contact/">Contact Us</a></div></div></section></main><script src="/js/site.js?v=2.5" defer></script><script type="module" src="/js/cookieconsent-config.js"></script></body></html>`,
  el: `<!doctype html><html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Evochia \u2014 \u0397 \u03c3\u03b5\u03bb\u03af\u03b4\u03b1 \u03b4\u03b5\u03bd \u03b2\u03c1\u03ad\u03b8\u03b7\u03ba\u03b5</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/css/critical.css?v=2.6"><link rel="stylesheet" href="/css/site.css?v=2.5"></head><body><main class="error-page"><section class="hero"><div class="container"><p class="eyebrow">404</p><h1>\u0397 \u03c3\u03b5\u03bb\u03af\u03b4\u03b1 \u03b4\u03b5\u03bd \u03b2\u03c1\u03ad\u03b8\u03b7\u03ba\u03b5</h1><p>\u0397 \u03c3\u03b5\u03bb\u03af\u03b4\u03b1 \u03c0\u03bf\u03c5 \u03b1\u03bd\u03b1\u03b6\u03b7\u03c4\u03ac\u03c4\u03b5 \u03af\u03c3\u03c9\u03c2 \u03bc\u03b5\u03c4\u03b1\u03ba\u03b9\u03bd\u03ae\u03b8\u03b7\u03ba\u03b5, \u03ac\u03bb\u03bb\u03b1\u03be\u03b5 \u03ae \u03b4\u03b5\u03bd \u03b5\u03af\u03bd\u03b1\u03b9 \u03c0\u03bb\u03ad\u03bf\u03bd \u03b4\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b7.</p><div class="hero-actions"><a class="btn btn-primary" href="/el/">\u0395\u03c0\u03b9\u03c3\u03c4\u03c1\u03bf\u03c6\u03ae \u03c3\u03c4\u03b7\u03bd \u0391\u03c1\u03c7\u03b9\u03ba\u03ae</a><a class="btn btn-secondary" href="/el/contact/">\u0395\u03c0\u03b9\u03ba\u03bf\u03b9\u03bd\u03c9\u03bd\u03af\u03b1</a></div></div></section></main><script src="/js/site.js?v=2.5" defer></script><script type="module" src="/js/cookieconsent-config.js"></script></body></html>`,
};

function normalizePathname(pathname: string): string {
  const collapsedPathname = pathname.replace(/\/{2,}/g, '/');

  if (collapsedPathname === '/' || collapsedPathname === '') {
    return '/';
  }

  if (collapsedPathname === '/en' || collapsedPathname === '/el') {
    return `${collapsedPathname}/`;
  }

  return collapsedPathname.endsWith('/') ? collapsedPathname : `${collapsedPathname}/`;
}

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
  return lastSegment.includes('.');
}

function notFoundResponse(request: Request, localePath: '/en/404/' | '/el/404/'): Response {
  const localePathResponse = new URL(localePath, request.url);
  const locale = localePath === '/el/404/' ? 'el' : 'en';
  const headers = new Headers(RESPONSE_HEADERS);

  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Vary', 'Accept-Encoding');
  headers.set('X-Localized-404', localePathResponse.pathname);

  return new Response(FALLBACK_HTML[locale], {
    status: 404,
    headers,
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

    return notFoundResponse(request, '/en/404/');
  }

  if (pathname.startsWith('/el/')) {
    if (EL_ROUTES.has(pathname)) {
      return;
    }

    return notFoundResponse(request, '/el/404/');
  }

  return;
}

export const config = {
  matcher: ['/en/:path*', '/el/:path*'],
};
