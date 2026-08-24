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
const LOCAL_WEBSOCKET_ORIGINS = new Set([
  LOOPBACK_ORIGIN.replace('http:', 'ws:'),
  PRODUCTION_ORIGIN.replace('http:', 'ws:'),
]);
const FIXED_GTM_URL = 'https://www.googletagmanager.com/gtm.js?id=GTM-578JXRXS';
const FIXED_FORMSPREE_URL = 'https://formspree.io/f/xwvngybk';

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

function isExternalWebSocketUrl(url) {
  return (url.protocol === 'ws:' || url.protocol === 'wss:') && !LOCAL_WEBSOCKET_ORIGINS.has(url.origin);
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
    const abortedUnexpectedExternalRequests = [];
    const escapedExternalRequests = [];
    const externalWebSockets = [];
    const closedExternalWebSockets = [];
    const connectedExternalWebSockets = [];
    const expectedBlockedExternalUrls = new Set();
    const expectedBlockedExternalWebSocketUrls = new Set();
    const interceptedExternalRequests = new WeakSet();
    let expectsGtmRequest = false;
    let formspreeResponse = null;

    async function abortUnexpected(route, request) {
      const record = requestRecord(request);
      unexpectedExternalRequests.push(record);
      await route.abort('blockedbyclient');
      abortedUnexpectedExternalRequests.push(record);
    }

    context.on('requestfinished', (request) => {
      const url = new URL(request.url());
      if (isExternalHttpUrl(url) && !interceptedExternalRequests.has(request)) {
        escapedExternalRequests.push(requestRecord(request));
      }
    });

    await context.routeWebSocket(/.*/, async (webSocketRoute) => {
      const url = new URL(webSocketRoute.url());
      if (LOCAL_WEBSOCKET_ORIGINS.has(url.origin) || (url.protocol !== 'ws:' && url.protocol !== 'wss:')) {
        webSocketRoute.connectToServer();
        return;
      }

      const record = Object.freeze({
        hostname: url.hostname,
        pathname: url.pathname,
        protocols: [...webSocketRoute.protocols()],
        url: webSocketRoute.url(),
      });
      externalWebSockets.push(record);
      await webSocketRoute.close({
        code: 1008,
        reason: 'Blocked by E2E network isolation',
      });
      closedExternalWebSockets.push(record);
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
        if (expectsGtmRequest && request.method() === 'GET' && request.url() === FIXED_GTM_URL) {
          gtmRequests.push(record);
          await route.fulfill({
            body: 'window.__EVOCHIA_INTERCEPTED_GTM_EXECUTIONS__ = (window.__EVOCHIA_INTERCEPTED_GTM_EXECUTIONS__ || 0) + 1;',
            contentType: 'text/javascript; charset=utf-8',
            status: 200,
          });
          return;
        }
        await abortUnexpected(route, request);
        return;
      }

      if (isFormspreeHostname(url.hostname)) {
        if (formspreeResponse && request.method() === 'POST' && request.url() === FIXED_FORMSPREE_URL) {
          formspreeRequests.push(requestRecord(request));
          await route.fulfill(formspreeResponse);
          return;
        }
        await abortUnexpected(route, request);
        return;
      }

      await abortUnexpected(route, request);
    });

    const network = Object.freeze({
      closedExternalWebSockets,
      connectedExternalWebSockets,
      escapedExternalRequests,
      expectBlockedExternalRequest(requestUrl) {
        const url = new URL(requestUrl);
        if (!isExternalHttpUrl(url)) {
          throw new Error(`Blocked-request probes must target an external HTTP(S) URL: ${requestUrl}`);
        }
        if (expectedBlockedExternalUrls.has(requestUrl)) {
          throw new Error(`Blocked-request probe already registered: ${requestUrl}`);
        }
        expectedBlockedExternalUrls.add(requestUrl);
      },
      expectBlockedExternalWebSocket(requestUrl) {
        const url = new URL(requestUrl);
        if (!isExternalWebSocketUrl(url)) {
          throw new Error(`Blocked WebSocket probes must target an external ws/wss URL: ${requestUrl}`);
        }
        if (expectedBlockedExternalWebSocketUrls.has(requestUrl)) {
          throw new Error(`Blocked WebSocket probe already registered: ${requestUrl}`);
        }
        expectedBlockedExternalWebSocketUrls.add(requestUrl);
      },
      externalWebSockets,
      expectFormspreeRequest(response) {
        if (formspreeResponse) {
          throw new Error('The fixed Formspree POST is already registered for this test');
        }
        formspreeResponse = {
          body: JSON.stringify(response.body ?? {}),
          contentType: 'application/json; charset=utf-8',
          status: response.status,
        };
      },
      expectGtmRequest() {
        if (expectsGtmRequest) {
          throw new Error('The fixed GTM GET is already registered for this test');
        }
        expectsGtmRequest = true;
      },
      formspreeRequests,
      googleRequests,
      gtmRequests,
      unexpectedExternalRequests,
    });

    await use(network);

    expect(
      unexpectedExternalRequests.map((request) => request.url).sort(),
      'unexpected external requests must be aborted and fail unless the test registered the exact isolation probe',
    ).toEqual([...expectedBlockedExternalUrls].sort());
    expect(
      abortedUnexpectedExternalRequests,
      'every unexpected external request must be aborted by the isolation route',
    ).toEqual(unexpectedExternalRequests);
    expect(
      gtmRequests,
      'the fixed GTM GET must be observed exactly once when registered and never otherwise',
    ).toHaveLength(expectsGtmRequest ? 1 : 0);
    expect(
      formspreeRequests,
      'the fixed Formspree POST must be observed exactly once when registered and never otherwise',
    ).toHaveLength(formspreeResponse ? 1 : 0);
    expect(escapedExternalRequests, 'no external request may bypass the isolation route').toEqual([]);
    expect(
      externalWebSockets.map((socket) => socket.url).sort(),
      'every external WebSocket must be registered by the test and closed locally',
    ).toEqual([...expectedBlockedExternalWebSocketUrls].sort());
    expect(closedExternalWebSockets, 'every external WebSocket must be closed by the route').toEqual(externalWebSockets);
    expect(connectedExternalWebSockets, 'no external WebSocket may connect to a server').toEqual([]);
  }, { auto: true }],
});

export { expect };
export { LOOPBACK_ORIGIN, PRODUCTION_ORIGIN } from '../server.mjs';
