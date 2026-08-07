import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runGa4Report,
} from '../../../seo/apps-script/src/Ga4Client.ts';
import {
  runGa4Reports,
  getAvailableGa4Date,
} from '../../../seo/apps-script/src/Ga4Importer.ts';
import type {
  FetchOptionsLike,
  HttpResponseLike,
  HttpTransport,
} from '../../../seo/apps-script/src/GscClient.ts';

function response(body: unknown, status = 200): HttpResponseLike {
  return {
    getResponseCode: () => status,
    getContentText: () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

test('uses an independent two-day GA4 processing delay', () => {
  assert.equal(getAvailableGa4Date(new Date('2026-08-06T05:00:00Z')), '2026-08-04');
});

test('continues GA4 pagination when rowCount is omitted from a full page', () => {
  const offsets: number[] = [];
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    const body = JSON.parse(options.payload) as { offset: number };
    offsets.push(body.offset);

    if (body.offset === 0) {
      return response({
        dimensionHeaders: [{ name: 'date' }],
        metricHeaders: [{ name: 'sessions' }],
        rows: [
          {
            dimensionValues: [{ value: '20260804' }],
            metricValues: [{ value: '10' }],
          },
          {
            dimensionValues: [{ value: '20260805' }],
            metricValues: [{ value: '20' }],
          },
        ],
      });
    }

    return response({
      dimensionHeaders: [{ name: 'date' }],
      metricHeaders: [{ name: 'sessions' }],
      rows: [{
        dimensionValues: [{ value: '20260806' }],
        metricValues: [{ value: '30' }],
      }],
    });
  };

  const rows = runGa4Report({
    propertyResource: 'properties/528945896',
    body: {
      dateRanges: [{ startDate: '2026-08-04', endDate: '2026-08-06' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
    },
    accessToken: 'test-token',
    transport,
    pageLimit: 2,
  });

  assert.deepEqual(offsets, [0, 2]);
  assert.equal(rows.length, 3);
  assert.equal(rows[2].sessions, 30);
});

test('normalizes four GA4 report families without fabricating missing zeroes', () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const transport: HttpTransport = (url, options: FetchOptionsLike) => {
    const body = JSON.parse(options.payload) as {
      dimensions: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
    };
    calls.push({ url, body });
    const firstDimension = body.dimensions[1]?.name ?? body.dimensions[0]?.name;

    if (firstDimension === 'deviceCategory') {
      return response({
        dimensionHeaders: [{ name: 'date' }, { name: 'deviceCategory' }],
        metricHeaders: body.metrics.map(({ name }) => ({ name })),
        rows: [{
          dimensionValues: [{ value: '20260804' }, { value: 'mobile' }],
          metricValues: [
            { value: '4' },
            { value: '3' },
            { value: '5' },
            { value: '4' },
            { value: '120.5' },
            {},
          ],
        }],
        rowCount: 1,
      });
    }

    if (firstDimension === 'sessionSourceMedium') {
      return response({
        dimensionHeaders: [
          { name: 'date' },
          { name: 'sessionSourceMedium' },
          { name: 'sessionDefaultChannelGroup' },
        ],
        metricHeaders: body.metrics.map(({ name }) => ({ name })),
        rows: [{
          dimensionValues: [
            { value: '20260804' },
            { value: '(not set)' },
            { value: 'Unassigned' },
          ],
          metricValues: [{ value: '2' }, { value: '1' }, { value: '0' }],
        }],
        rowCount: 1,
      });
    }

    if (firstDimension === 'landingPagePlusQueryString') {
      return response({
        dimensionHeaders: body.dimensions.map(({ name }) => ({ name })),
        metricHeaders: body.metrics.map(({ name }) => ({ name })),
        rows: [{
          dimensionValues: [
            { value: '20260804' },
            { value: '/en/private-chef/' },
            { value: 'Organic Search' },
            { value: 'desktop' },
          ],
          metricValues: [{ value: '3' }, { value: '2' }, { value: '1' }],
        }],
        rowCount: 1,
      });
    }

    return response({
      dimensionHeaders: [{ name: 'date' }, { name: 'eventName' }],
      metricHeaders: body.metrics.map(({ name }) => ({ name })),
      rows: [{
        dimensionValues: [{ value: '20260804' }, { value: 'whatsapp_click' }],
        metricValues: [{ value: '6' }, { value: '1' }],
      }],
      rowCount: 1,
    });
  };

  const bundle = runGa4Reports(
    {
      propertyResource: 'properties/528945896',
      verificationStatus: 'verified',
      now: new Date('2026-08-06T05:00:00Z'),
    },
    {
      accessToken: 'test-token',
      collectedAt: '2026-08-06T05:00:00Z',
      transport,
    },
  );

  assert.equal(calls.length, 4);
  assert.equal(calls.every(({ url }) => url.includes('/properties/528945896:runReport')), true);
  assert.equal(bundle.dataAsOf, '2026-08-04');
  assert.equal(bundle.daily[0].keyEvents, null);
  assert.equal(bundle.acquisition[0].sessionSourceMedium, '(not set)');
  assert.equal(bundle.acquisition[0].keyEvents, 0);
  assert.equal(bundle.landingPages[0].landingPagePlusQueryString, '/en/private-chef/');
  assert.equal(bundle.events[0].eventName, 'whatsapp_click');
  assert.equal(bundle.events[0].dataAsOf, '2026-08-04');
});

test('refuses GA4 collection before property verification', () => {
  assert.throws(
    () => runGa4Reports({
      propertyResource: 'properties/528945896',
      verificationStatus: 'pending',
      now: new Date('2026-08-06T05:00:00Z'),
    }),
    /requires a verified production configuration/,
  );
});
