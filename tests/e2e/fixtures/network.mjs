import { expect, test as base } from '@playwright/test';

import { LOOPBACK_ORIGIN, PRODUCTION_ORIGIN } from '../server.mjs';

const GOOGLE_DOMAIN_SUFFIXES = [
  'doubleclick.net',
  'google-analytics.com',
  'google.com',
  'google.gr',
  'googleadservices.com',
  'googleapis.com',
  'googlesyndication.com',
  'googletagmanager.com',
  'gstatic.com',
];

const LOCAL_ORIGINS = new Set([LOOPBACK_ORIGIN, PRODUCTION_ORIGIN]);

function hasDomainSuffix(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function isGoogleHostname(hostname) {
  return GOOGLE_DOMAIN_SUFFIXES.some((suffix) => hasDomainSuffix(hostname, suffix));
}

function isFormspreeHostname(hostname) {
  return hasDomainSuffix(hostname, 'formspree.io') || hasDomainSuffix(hostname, 'formspree.com');
}

function isExternalHttpUrl(url) {
  return (url.protocol === 'http:' || url.protocol === 'https:') && !LOCAL_ORIGINS.has(url.origin);
}

function requestRecord(request) {
  const url = new URL(request.url());
  return Object.freeze({
    hostname: url.hostname,
    method: request.method(),
    pathname: url.pathname,
    url: request.url(),
  });
}

export const test = base.extend({
  network: [async ({ context }, use) => {
    const googleRequests = [];
    const gtmRequests = [];
    const formspreeRequests = [];
    const unexpectedExternalRequests = [];
    const escapedExternalRequests = [];
    const expectedBlockedExternalUrls = new Set();
    const interceptedExternalRequests = new WeakSet();
    let formspreeResponse = {
      body: JSON.stringify({ error: 'Formspree is disabled unless a test selects a mock response.' }),
      contentType: 'application/json; charset=utf-8',
      status: 503,
    };

    context.on('requestfinished', (request) => {
      const url = new URL(request.url());
      if (isExternalHttpUrl(url) && !interceptedExternalRequests.has(request)) {
        escapedExternalRequests.push(requestRecord(request));
      }
    });

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (LOCAL_ORIGINS.has(url.origin) || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
        await route.continue();
        return;
      }

      interceptedExternalRequests.add(request);

      if (isGoogleHostname(url.hostname)) {
        const record = requestRecord(request);
        googleRequests.push(record);
        if (hasDomainSuffix(url.hostname, 'googletagmanager.com') && url.pathname === '/gtm.js') {
          gtmRequests.push(record);
          await route.fulfill({
            body: 'window.__EVOCHIA_INTERCEPTED_GTM_EXECUTIONS__ = (window.__EVOCHIA_INTERCEPTED_GTM_EXECUTIONS__ || 0) + 1;',
            contentType: 'text/javascript; charset=utf-8',
            status: 200,
          });
          return;
        }
        await route.abort('blockedbyclient');
        return;
      }

      if (isFormspreeHostname(url.hostname)) {
        formspreeRequests.push(requestRecord(request));
        await route.fulfill(formspreeResponse);
        return;
      }

      unexpectedExternalRequests.push(requestRecord(request));
      await route.abort('blockedbyclient');
    });

    const network = Object.freeze({
      escapedExternalRequests,
      expectBlockedExternalRequest(requestUrl) {
        const url = new URL(requestUrl);
        if (!isExternalHttpUrl(url) || isGoogleHostname(url.hostname) || isFormspreeHostname(url.hostname)) {
          throw new Error(`Blocked-request probes must target an otherwise unhandled external URL: ${requestUrl}`);
        }
        if (expectedBlockedExternalUrls.has(requestUrl)) {
          throw new Error(`Blocked-request probe already registered: ${requestUrl}`);
        }
        expectedBlockedExternalUrls.add(requestUrl);
      },
      formspreeRequests,
      googleRequests,
      gtmRequests,
      setFormspreeResponse(response) {
        formspreeResponse = {
          body: JSON.stringify(response.body ?? {}),
          contentType: 'application/json; charset=utf-8',
          status: response.status,
        };
      },
      unexpectedExternalRequests,
    });

    await use(network);

    expect(
      unexpectedExternalRequests.map((request) => request.url).sort(),
      'unexpected external requests must be aborted and fail unless the test registered the exact isolation probe',
    ).toEqual([...expectedBlockedExternalUrls].sort());
    expect(escapedExternalRequests, 'no external request may bypass the isolation route').toEqual([]);
  }, { auto: true }],
});

export { expect };
export { LOOPBACK_ORIGIN, PRODUCTION_ORIGIN } from '../server.mjs';
