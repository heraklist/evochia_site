import { verifyConfig, type SeoConfig } from '../src/Config.ts';
import { Ga4PipelineError } from '../src/Ga4Client.ts';
import {
  classifyPagePath,
  classifyUrlQuality,
  runGa4Reports,
} from '../src/Ga4Importer.ts';
import {
  PipelineError,
  type HttpResponseLike,
  type HttpTransport,
} from '../src/GscClient.ts';
import { importSearchAnalyticsDay } from '../src/GscImporter.ts';
import {
  calendarDateParts,
  isValidHostname,
} from '../src/RuntimeCompat.ts';

export interface RuntimeSmokeCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface RuntimeSmokeResult {
  ok: boolean;
  checks: RuntimeSmokeCheck[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function equal(actual: unknown, expected: unknown, message: string): void {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function check(name: string, assertion: () => void): RuntimeSmokeCheck {
  try {
    assertion();
    return { name, ok: true };
  } catch (error) {
    return { name, ok: false, detail: String(error) };
  }
}

function response(body: unknown, status = 200): HttpResponseLike {
  return {
    getResponseCode: () => status,
    getContentText: () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function ga4Transport(options: { sparse?: boolean; fail?: boolean } = {}): HttpTransport {
  return (_url, request) => {
    if (options.fail) {
      return response('{"error":"synthetic"}', 503);
    }

    const body = JSON.parse(request.payload) as {
      dimensions: Array<{ name: string }>;
      metrics: Array<{ name: string }>;
    };
    const dimensions = body.dimensions.map(({ name }) => name);
    const key = dimensions.join(',');

    if (options.sparse) {
      if (key === 'date,hostName,pagePath') {
        return response({
          dimensionHeaders: body.dimensions,
          metricHeaders: body.metrics,
          rows: [{
            dimensionValues: [
              { value: '20260805' },
              { value: 'www.evochia.gr' },
              { value: '/en/contact/' },
            ],
            metricValues: [
              { value: '1' },
              { value: '1' },
              { value: '1' },
              { value: '1' },
              { value: '12' },
              {},
            ],
          }],
          rowCount: 1,
        });
      }
      return response({ dimensionHeaders: body.dimensions, metricHeaders: body.metrics, rows: [], rowCount: 0 });
    }

    if (key === 'date,deviceCategory') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: 'mobile' }],
          metricValues: [{ value: '4' }, { value: '3' }, { value: '5' }, { value: '4' }, { value: '120' }, { value: '1' }],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,sessionSourceMedium,sessionDefaultChannelGroup') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [{ value: '20260805' }, { value: 'google / organic' }, { value: 'Organic Search' }],
          metricValues: [{ value: '5' }, { value: '4' }, { value: '1' }],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,landingPagePlusQueryString,sessionDefaultChannelGroup,deviceCategory') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [
            { value: '20260805' },
            { value: '/en/private-chef/' },
            { value: 'Organic Search' },
            { value: 'desktop' },
          ],
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
          dimensionValues: [
            { value: '20260805' },
            { value: 'www.evochia.gr' },
            { value: '/en/private-chef/' },
          ],
          metricValues: [
            { value: '9' },
            { value: '7' },
            { value: '8' },
            { value: '6' },
            { value: '300' },
            { value: '2' },
          ],
        }],
        rowCount: 1,
      });
    }
    if (key === 'date,hostName,pagePath,pageTitle') {
      return response({
        dimensionHeaders: body.dimensions,
        metricHeaders: body.metrics,
        rows: [{
          dimensionValues: [
            { value: '20260805' },
            { value: 'www.evochia.gr' },
            { value: '/en/private-chef/' },
            { value: 'Private Chef Greece' },
          ],
          metricValues: [{ value: '9' }],
        }],
        rowCount: 1,
      });
    }

    return response({
      dimensionHeaders: body.dimensions,
      metricHeaders: body.metrics,
      rows: [{
        dimensionValues: [
          { value: '20260805' },
          { value: 'www.evochia.gr' },
          { value: '/en/private-chef/?utm_source=instagram' },
        ],
        metricValues: [{ value: '3' }, { value: '2' }, { value: '2' }],
      }],
      rowCount: 1,
    });
  };
}

function gscTransport(options: { empty?: boolean; failOnCall?: number } = {}): HttpTransport {
  let call = 0;
  return (_url, request) => {
    call += 1;
    if (options.failOnCall === call) {
      return response('{"error":"synthetic"}', 429);
    }
    if (options.empty) {
      return response({ rows: [] });
    }

    const body = JSON.parse(request.payload) as { dimensions: string[] };
    const key = body.dimensions.join(',');
    if (key === 'date') {
      return response({ rows: [{ keys: ['2026-08-02'], clicks: 5, impressions: 50, ctr: 0.1, position: 4 }] });
    }
    if (key === 'date,page') {
      return response({ rows: [{ keys: ['2026-08-02', 'https://www.evochia.gr/en/private-chef/'], clicks: 3, impressions: 30, ctr: 0.1, position: 5 }] });
    }
    return response({ rows: [{ keys: ['2026-08-02', 'private chef greece'], clicks: 2, impressions: 20, ctr: 0.1, position: 6 }] });
  };
}

const VERIFIED_CONFIG: SeoConfig = {
  gscProperty: 'https://www.evochia.gr/',
  ga4AccountId: '388030118',
  ga4PropertyId: '528945896',
  ga4PropertyTimeZone: 'Europe/Athens',
  productionHostname: 'www.evochia.gr',
  gtmPublicContainerId: 'GTM-578JXRXS',
  gtmAccountId: '123456789',
  gtmContainerId: '987654321',
  sheetId: 'synthetic-sheet',
  driveFolderId: 'synthetic-drive-folder',
  ownerEmail: 'heraklis@evochia.gr',
  verificationStatus: 'verified',
};

export function runRuntimeSmoke(): RuntimeSmokeResult {
  const checks: RuntimeSmokeCheck[] = [
    check('athens_calendar_dst', () => {
      const parts = calendarDateParts(new Date('2026-11-02T21:30:00Z'), 'Europe/Athens');
      equal(parts.year, 2026, 'Athens year');
      equal(parts.month, 11, 'Athens month');
      equal(parts.day, 2, 'Athens day');
    }),
    check('gsc_los_angeles_calendar', () => {
      const parts = calendarDateParts(new Date('2026-08-06T05:00:00Z'), 'America/Los_Angeles');
      equal(parts.day, 5, 'Los Angeles local day');
    }),
    check('url_query_parser', () => {
      const result = classifyUrlQuality('www.evochia.gr', '/en/private-chef/?gad_source=1&foo=bar', 'www.evochia.gr');
      equal(result.anomalyTypes.join(','), 'tracking_query_params,unexpected_query_params', 'query classification');
    }),
    check('page_classification', () => {
      const classified = classifyPagePath('/el/private-chef');
      equal(classified.language, 'el', 'language');
      equal(classified.service, 'private_chef', 'service');
    }),
    check('url_quality_classification', () => {
      const classified = classifyUrlQuality('preview-evochia.vercel.app', '/en//private-chef.html?utm_source=instagram', 'www.evochia.gr');
      equal(
        classified.anomalyTypes.join(','),
        'tracking_query_params,double_slash,legacy_html,preview_host',
        'URL quality order',
      );
    }),
    check('hostname_validation', () => {
      equal(isValidHostname('www.evochia.gr'), true, 'production hostname accepted');
      equal(isValidHostname('https://www.evochia.gr'), false, 'scheme rejected');
    }),
    check('config_validation', () => {
      const capabilities = ['workbook', 'gsc', 'ga4'] as const;
      equal(verifyConfig(VERIFIED_CONFIG, capabilities).ok, true, 'synthetic config accepted');
      equal(
        verifyConfig({ ...VERIFIED_CONFIG, productionHostname: 'WWW.evochia.gr' }, capabilities).ok,
        false,
        'uppercase hostname rejected',
      );
    }),
    check('ga4_import_assembly', () => {
      const bundle = runGa4Reports(
        {
          propertyResource: 'properties/528945896',
          verificationStatus: 'verified',
          ga4PropertyTimeZone: 'Europe/Athens',
          productionHostname: 'www.evochia.gr',
          now: new Date('2026-08-06T21:30:00Z'),
        },
        {
          accessToken: 'synthetic-token',
          collectedAt: '2026-08-06T21:30:00Z',
          transport: ga4Transport(),
        },
      );
      equal(bundle.pages.length, 1, 'one page row assembled');
      equal(bundle.pages[0].pageTitle, 'Private Chef Greece', 'page title assembled');
      equal(bundle.urlQuality.length, 1, 'one URL-quality anomaly assembled');
    }),
    check('gsc_import_assembly', () => {
      const writes: number[] = [];
      const result = importSearchAnalyticsDay(
        { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [] },
        new Date('2026-08-06T05:00:00Z'),
        {
          accessToken: 'synthetic-token',
          collectedAt: '2026-08-06T05:00:00Z',
          transport: gscTransport(),
          writeRows: (_sheet, _keys, rows) => {
            writes.push(rows.length);
            return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
          },
        },
      );
      equal(result.dataAsOf, '2026-08-02', 'GSC data-as-of date');
      equal(writes.join(','), '1,1,1', 'synthetic writer calls');
    }),
    check('sparse_and_error_semantics', () => {
      const sparse = runGa4Reports(
        {
          propertyResource: 'properties/528945896',
          verificationStatus: 'verified',
          ga4PropertyTimeZone: 'Europe/Athens',
          productionHostname: 'www.evochia.gr',
          now: new Date('2026-08-06T21:30:00Z'),
        },
        { accessToken: 'synthetic-token', transport: ga4Transport({ sparse: true }) },
      );
      equal(sparse.pages.length, 1, 'sparse page remains present');
      equal(sparse.pages[0].pageTitle, null, 'missing title remains null');
      equal(sparse.urlQuality.length, 0, 'no synthetic URL-quality rows');

      let ga4Failed = false;
      try {
        runGa4Reports(
          {
            propertyResource: 'properties/528945896',
            verificationStatus: 'verified',
            ga4PropertyTimeZone: 'Europe/Athens',
            productionHostname: 'www.evochia.gr',
            now: new Date('2026-08-06T21:30:00Z'),
          },
          { accessToken: 'synthetic-token', transport: ga4Transport({ fail: true }) },
        );
      } catch (error) {
        ga4Failed = error instanceof Ga4PipelineError && error.status === 503;
      }
      equal(ga4Failed, true, 'GA4 typed error propagates');

      let gscFailed = false;
      try {
        importSearchAnalyticsDay(
          { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [] },
          new Date('2026-08-06T08:00:00Z'),
          {
            accessToken: 'synthetic-token',
            transport: gscTransport({ failOnCall: 2 }),
            writeRows: () => {
              throw new Error('writer must not run before all GSC fetches succeed');
            },
          },
        );
      } catch (error) {
        gscFailed = error instanceof PipelineError && error.status === 429;
      }
      equal(gscFailed, true, 'GSC typed error propagates before writes');
    }),
  ];

  const result: RuntimeSmokeResult = {
    ok: checks.every((item) => item.ok),
    checks,
  };

  if (!result.ok) {
    throw new Error(`Apps Script runtime smoke failed: ${JSON.stringify(result)}`);
  }

  console.log(JSON.stringify(result));
  return result;
}
