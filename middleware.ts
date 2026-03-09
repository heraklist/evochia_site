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

const FALLBACK_HTML = {
  en: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page Not Found | Evochia</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/css/site.css?v=2.4"></head><body><main class="error-page"><section class="hero"><div class="container"><p class="eyebrow">404</p><h1>Page Not Found</h1><p>The page you requested could not be found.</p><div class="hero-actions"><a class="btn btn-primary" href="/en/">Return Home</a><a class="btn btn-secondary" href="/en/contact/">Contact Us</a></div></div></section></main><script src="/js/site.js?v=2.3" defer></script></body></html>`,
  el: `<!doctype html><html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Η Σελίδα Δεν Βρέθηκε | Evochia</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/css/site.css?v=2.4"></head><body><main class="error-page"><section class="hero"><div class="container"><p class="eyebrow">404</p><h1>Η Σελίδα Δεν Βρέθηκε</h1><p>Η σελίδα που ζητήσατε δεν βρέθηκε.</p><div class="hero-actions"><a class="btn btn-primary" href="/el/">Επιστροφή στην Αρχική</a><a class="btn btn-secondary" href="/el/contact/">Επικοινωνία</a></div></div></section></main><script src="/js/site.js?v=2.3" defer></script></body></html>`,
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

async function get404Html(request: Request, localePath: '/en/404/' | '/el/404/'): Promise<string> {
  const pageUrl = new URL(localePath, request.url);
  const locale = localePath === '/el/404/' ? 'el' : 'en';

  try {
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'x-evochia-404-fetch': '1',
      },
    });

    if (!pageResponse.ok && pageResponse.status >= 500) {
      throw new Error(`Failed to fetch localized 404 page: ${pageResponse.status}`);
    }

    return await pageResponse.text();
  } catch {
    return FALLBACK_HTML[locale];
  }
}

async function notFoundResponse(request: Request, localePath: '/en/404/' | '/el/404/'): Promise<Response> {
  const localePathResponse = new URL(localePath, request.url);
  const html = await get404Html(request, localePath);
  const headers = new Headers(RESPONSE_HEADERS);

  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Vary', 'Accept-Encoding');
  headers.set('X-Localized-404', localePathResponse.pathname);

  return new Response(html, {
    status: 404,
    headers,
  });
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const pathname = normalizePathname(url.pathname);

  if (hasFileExtension(url.pathname)) {
    return;
  }

  if (request.headers.get('x-evochia-404-fetch') === '1') {
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