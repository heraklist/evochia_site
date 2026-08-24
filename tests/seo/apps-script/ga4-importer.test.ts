import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runGa4Report,
} from '../../../seo/apps-script/src/Ga4Client.ts';
import {
  classifyPagePath,
  classifyUrlQuality,
  getAvailableGa4Date,
  runGa4Reports,
  selectPageTitles,
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

const verifiedRange = {
  propertyResource: 'properties/528945896',
  verificationStatus: 'verified' as const,
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: 'www.evochia.gr',
};

test('uses the verified GA4 property calendar with a two-day processing delay', () => {
  assert.equal(
    getAvailableGa4Date(new Date('2026-08-06T21:30:00Z'), 'Europe/Athens'),
    '2026-08-05',
  );
  assert.equal(
    getAvailableGa4Date(new Date('2026-11-02T21:30:00Z'), 'Europe/Athens', 0),
    '2026-11-02',
  );
  assert.throws(
    () => getAvailableGa4Date(new Date('2026-08-06T21:30:00Z'), 'Not/A_Timezone'),
    /valid IANA timezone/,
  );
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

test('classifies language and service without mutating non-trailing paths', () => {
  assert.deepEqual(classifyPagePath('/en/private-chef/'), { language: 'en', service: 'private_chef' });
  assert.deepEqual(classifyPagePath('/el/private-chef'), { language: 'el', service: 'private_chef' });
  assert.deepEqual(classifyPagePath('/unknown'), { language: 'unknown', service: 'other' });
});

test('selects page titles by views with lexical tie-breaking', () => {
  const selected = selectPageTitles([
    { date: '20260805', hostName: 'www.evochia.gr', pagePath: '/en/private-chef/', pageTitle: 'Zeta', screenPageViews: 4 },
    { date: '20260805', hostName: 'www.evochia.gr', pagePath: '/en/private-chef/', pageTitle: 'Alpha', screenPageViews: 4 },
    { date: '20260805', hostName: 'www.evochia.gr', pagePath: '/en/private-chef/', pageTitle: 'Older', screenPageViews: 2 },
    { date: '20260805', hostName: 'www.evochia.gr', pagePath: '/en/contact/', pageTitle: '', screenPageViews: 8 },
  ]);

  assert.equal(selected.get('20260805\u001fwww.evochia.gr\u001f/en/private-chef/'), 'Alpha');
  assert.equal(selected.get('20260805\u001fwww.evochia.gr\u001f/en/contact/'), null);
});

test('classifies URL quality anomalies in fixed order', () => {
  assert.deepEqual(
    classifyUrlQuality(
      'preview-evochia.vercel.app',
      '/en//private-chef.html?utm_source=instagram&foo=bar',
      'www.evochia.gr',
    ),
    {
      normalizedPagePath: '/en//private-chef.html',
      anomalyTypes: [
        'tracking_query_params',
        'unexpected_query_params',
        'double_slash',
        'legacy_html',
        'preview_host',
      ],
    },
  );

  assert.deepEqual(
    classifyUrlQuality('alt.evochia.gr', '/en/private-chef/', 'www.evochia.gr'),
    { normalizedPagePath: '/en/private-chef/', anomalyTypes: ['non_production_host'] },
  );
  assert.deepEqual(
    classifyUrlQuality('www.evochia.gr', '/en/private-chef/', 'www.evochia.gr'),
    { normalizedPagePath: '/en/private-chef/', anomalyTypes: [] },
  );
});

test('normalizes seven GA4 report families at their declared grains', () => {
  const calls: Array<{ dimensions: string[]; metrics: string[] }> = [];
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    const body = JSON.parse(options.payload) as {
      dimensions: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
    };
    const dimensions = body.dimensions.map(({ name }) => name);
    const metrics = body.metrics.map(({ name }) => name);
    calls.push({ dimensions, metrics });
    const key = dimensions.join(',');

    if (key === 'date,deviceCategory') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: 'mobile' }],
          metricValues: [{ value: '4' }, { value: '3' }, { value: '5' }, { value: '4' }, { value: '120.5' }, {}],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,sessionSourceMedium,sessionDefaultChannelGroup') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: '(not set)' }, { value: 'Unassigned' }],
          metricValues: [{ value: '2' }, { value: '1' }, { value: '0' }],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,landingPagePlusQueryString,sessionDefaultChannelGroup,deviceCategory') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: '/en/private-chef/' }, { value: 'Organic Search' }, { value: 'desktop' }],
          metricValues: [{ value: '3' }, { value: '2' }, { value: '1' }],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,eventName') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: 'generate_lead' }],
          metricValues: [{ value: '1' }, { value: '1' }],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,hostName,pagePath') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: 'www.evochia.gr' }, { value: '/en/private-chef/' }],
          metricValues: [{ value: '9' }, { value: '7' }, { value: '8' }, { value: '6' }, { value: '300' }, { value: '2' }],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,hostName,pagePath,pageTitle') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [
          {
            dimensionValues: [{ value: '20260805' }, { value: 'www.evochia.gr' }, { value: '/en/private-chef/' }, { value: 'Private Chef Greece' }],
            metricValues: [{ value: '8' }],
          },
          {
            dimensionValues: [{ value: '20260805' }, { value: 'www.evochia.gr' }, { value: '/en/private-chef/' }, { value: 'Old title' }],
            metricValues: [{ value: '1' }],
          },
        ],
        rowCount: 2,
      });
    }

    return response({
      dimensionHeaders: body.dimensions,
      metricHeaders: body.metrics,
      rows: [
        {
          dimensionValues: [{ value: '20260805' }, { value: 'www.evochia.gr' }, { value: '/en/private-chef/?utm_source=instagram' }],
          metricValues: [{ value: '3' }, { value: '2' }, { value: '2' }],
        },
        {
          dimensionValues: [{ value: '20260805' }, { value: 'www.evochia.gr' }, { value: '/en/private-chef/' }],
          metricValues: [{ value: '6' }, { value: '5' }, { value: '5' }],
        },
      ],
      rowCount: 2,
    });
  };

  const bundle = runGa4Reports(
    {
      ...verifiedRange,
      now: new Date('2026-08-06T21:30:00Z'),
    },
    {
      accessToken: 'test-token',
      collectedAt: '2026-08-06T21:30:00Z',
      transport,
    },
  );

  assert.equal(calls.length, 7);
  assert.deepEqual(calls[4], {
    dimensions: ['date', 'hostName', 'pagePath'],
    metrics: ['screenPageViews', 'activeUsers', 'sessions', 'engagedSessions', 'userEngagementDuration', 'keyEvents'],
  });
  assert.deepEqual(calls[5], {
    dimensions: ['date', 'hostName', 'pagePath', 'pageTitle'],
    metrics: ['screenPageViews'],
  });
  assert.deepEqual(calls[6], {
    dimensions: ['date', 'hostName', 'pagePathPlusQueryString'],
    metrics: ['screenPageViews', 'activeUsers', 'sessions'],
  });

  assert.equal(bundle.dataAsOf, '2026-08-05');
  assert.equal(bundle.daily[0].keyEvents, null);
  assert.equal(bundle.acquisition[0].sessionSourceMedium, '(not set)');
  assert.equal(bundle.landingPages[0].landingPagePlusQueryString, '/en/private-chef/');
  assert.equal(bundle.events[0].eventName, 'generate_lead');

  assert.deepEqual(bundle.pages[0], {
    date: '20260805',
    hostName: 'www.evochia.gr',
    pagePath: '/en/private-chef/',
    screenPageViews: 9,
    activeUsers: 7,
    sessions: 8,
    engagedSessions: 6,
    userEngagementDuration: 300,
    keyEvents: 2,
    pageTitle: 'Private Chef Greece',
    language: 'en',
    service: 'private_chef',
    dataAsOf: '2026-08-05',
    collectedAt: '2026-08-06T21:30:00Z',
  });
  assert.equal(bundle.urlQuality.length, 1);
  assert.equal(bundle.urlQuality[0].pagePathPlusQueryString, '/en/private-chef/?utm_source=instagram');
  assert.equal(bundle.urlQuality[0].normalizedPagePath, '/en/private-chef/');
  assert.equal(bundle.urlQuality[0].anomalyTypes, 'tracking_query_params');
  assert.equal(bundle.urlQuality[0].pageTitle, 'Private Chef Greece');
});

test('keeps sparse GA4 page metadata empty without synthetic rows', () => {
  const transport: HttpTransport = (_url, options: FetchOptionsLike) => {
    const body = JSON.parse(options.payload) as { dimensions: Array<{ name: string }>; metrics: Array<{ name: string }> };
    const dimensions = body.dimensions.map(({ name }) => name);
    const key = dimensions.join(',');

    if (key === 'date,hostName,pagePath') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: 'www.evochia.gr' }, { value: '/en/contact/' }],
          metricValues: [{ value: '1' }, { value: '1' }, { value: '1' }, { value: '1' }, { value: '12' }, {}],
        }],
        rowCount: 1,
      });
    }

    return response({
      dimensionHeaders: body.dimensions,
      metricHeaders: body.metrics,
      rows: [],
      rowCount: 0,
    });
  };

  const bundle = runGa4Reports(
    { ...verifiedRange, now: new Date('2026-08-06T21:30:00Z') },
    { accessToken: 'test-token', transport },
  );

  assert.equal(bundle.pages.length, 1);
  assert.equal(bundle.pages[0].pageTitle, null);
  assert.equal(bundle.pages[0].keyEvents, null);
  assert.deepEqual(bundle.urlQuality, []);
});

test('refuses GA4 collection before property verification', () => {
  assert.throws(
    () => runGa4Reports({
      ...verifiedRange,
      verificationStatus: 'pending',
      now: new Date('2026-08-06T05:00:00Z'),
    }),
    /requires a verified production configuration/,
  );
});
