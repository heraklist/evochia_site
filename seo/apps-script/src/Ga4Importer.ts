import {
  runGa4Report,
  type Ga4ReportBody,
  type Ga4Row,
} from './Ga4Client.ts';
import type { HttpTransport } from './GscClient.ts';

export interface Ga4ReportRange {
  propertyResource: string;
  verificationStatus: 'pending' | 'verified';
  ga4PropertyTimeZone: string;
  productionHostname: string;
  startDate?: string;
  endDate?: string;
  now?: Date;
}

export interface Ga4ImportDependencies {
  accessToken?: string;
  transport?: HttpTransport;
  collectedAt?: string;
}

export interface Ga4ImportBundle {
  dataAsOf: string;
  collectedAt: string;
  daily: Ga4Row[];
  acquisition: Ga4Row[];
  landingPages: Ga4Row[];
  events: Ga4Row[];
  pages: Ga4Row[];
  urlQuality: Ga4Row[];
}

function calendarDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
  } catch {
    throw new Error('ga4PropertyTimeZone must be a valid IANA timezone');
  }

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
  };
}

export function getAvailableGa4Date(
  now: Date,
  propertyTimeZone: string,
  delayDays = 2,
): string {
  if (!Number.isInteger(delayDays) || delayDays < 0) {
    throw new Error('delayDays must be a non-negative integer');
  }

  const { year, month, day } = calendarDateParts(now, propertyTimeZone);
  return new Date(Date.UTC(year, month - 1, day - delayDays))
    .toISOString()
    .slice(0, 10);
}

function reportBody(
  startDate: string,
  endDate: string,
  dimensions: string[],
  metrics: string[],
): Ga4ReportBody {
  return {
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
  };
}

function annotate(rows: Ga4Row[], dataAsOf: string, collectedAt: string): Ga4Row[] {
  return rows.map((row) => ({ ...row, dataAsOf, collectedAt }));
}

function rowString(row: Ga4Row, key: string): string {
  const value = row[key];
  return value == null ? '' : String(value);
}

function rowNumber(row: Ga4Row, key: string): number {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function pageKey(date: string, hostName: string, pagePath: string): string {
  return [date, hostName, pagePath].join('\u001f');
}

export function classifyPagePath(pagePath: string): {
  language: 'en' | 'el' | 'unknown';
  service: string;
} {
  const language: 'en' | 'el' | 'unknown' = /^\/en(?:\/|$)/.test(pagePath)
    ? 'en'
    : /^\/el(?:\/|$)/.test(pagePath)
      ? 'el'
      : 'unknown';

  let comparison = pagePath.replace(/^\/(?:en|el)(?=\/|$)/, '') || '/';
  if (comparison !== '/' && !comparison.endsWith('/')) {
    comparison += '/';
  }

  const taxonomy: Array<[string, string]> = [
    ['/wedding-catering/', 'wedding_catering'],
    ['/corporate-catering/', 'corporate_catering'],
    ['/villa-private-chef/', 'villa_private_chef'],
    ['/yacht-private-chef/', 'yacht_private_chef'],
    ['/athens-private-chef/', 'athens_private_chef'],
    ['/greek-islands-private-chef/', 'greek_islands_private_chef'],
    ['/private-chef/', 'private_chef'],
    ['/catering/', 'catering'],
    ['/menus/', 'menus'],
    ['/contact/', 'contact'],
    ['/about/', 'about'],
    ['/faq/', 'faq'],
    ['/lookbook/', 'lookbook'],
    ['/privacy/', 'privacy'],
    ['/404', 'not_found'],
  ];

  if (comparison === '/') {
    return { language, service: 'home' };
  }

  for (const [prefix, service] of taxonomy) {
    if (comparison.startsWith(prefix)) {
      return { language, service };
    }
  }

  return { language, service: 'other' };
}

export function selectPageTitles(rows: Ga4Row[]): Map<string, string | null> {
  const selected = new Map<string, { title: string | null; views: number }>();

  for (const row of rows) {
    const key = pageKey(rowString(row, 'date'), rowString(row, 'hostName'), rowString(row, 'pagePath'));
    const title = rowString(row, 'pageTitle').trim();
    const views = rowNumber(row, 'screenPageViews');
    const current = selected.get(key);

    if (!title) {
      if (!current) selected.set(key, { title: null, views: 0 });
      continue;
    }

    if (
      !current
      || current.title == null
      || views > current.views
      || (views === current.views && title < current.title)
    ) {
      selected.set(key, { title, views });
    }
  }

  return new Map([...selected.entries()].map(([key, value]) => [key, value.title]));
}

const TRACKING_QUERY_KEYS = new Set([
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'gad_source',
  '_gl',
  'srsltid',
  'fbclid',
  'msclkid',
]);

function queryParameterKeys(query: string): string[] {
  if (!query) return [];

  return query
    .split('&')
    .filter((part) => part.length > 0)
    .map((part) => {
      const separatorIndex = part.indexOf('=');
      const encodedKey = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
      try {
        return decodeURIComponent(encodedKey.replace(/\+/g, ' '));
      } catch {
        return encodedKey;
      }
    });
}

export function classifyUrlQuality(
  hostName: string,
  pagePathPlusQueryString: string,
  productionHostname: string,
): {
  normalizedPagePath: string;
  anomalyTypes: string[];
} {
  const queryIndex = pagePathPlusQueryString.indexOf('?');
  const normalizedPagePath = queryIndex === -1
    ? pagePathPlusQueryString
    : pagePathPlusQueryString.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : pagePathPlusQueryString.slice(queryIndex + 1);
  let hasTracking = false;
  let hasUnexpected = false;

  for (const key of queryParameterKeys(query)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith('utm_') || TRACKING_QUERY_KEYS.has(normalizedKey)) {
      hasTracking = true;
    } else {
      hasUnexpected = true;
    }
  }

  const normalizedHost = hostName.toLowerCase();
  const previewHost = normalizedHost.endsWith('.vercel.app');
  const anomalyTypes: string[] = [];
  if (hasTracking) anomalyTypes.push('tracking_query_params');
  if (hasUnexpected) anomalyTypes.push('unexpected_query_params');
  if (normalizedPagePath.includes('//')) anomalyTypes.push('double_slash');
  if (/\.html$/i.test(normalizedPagePath)) anomalyTypes.push('legacy_html');
  if (previewHost) anomalyTypes.push('preview_host');
  if (!previewHost && normalizedHost !== productionHostname) anomalyTypes.push('non_production_host');

  return { normalizedPagePath, anomalyTypes };
}

function validProductionHostname(value: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(value);
}

export function runGa4Reports(
  range: Ga4ReportRange,
  dependencies: Ga4ImportDependencies = {},
): Ga4ImportBundle {
  if (range.verificationStatus !== 'verified') {
    throw new Error('GA4 collection requires a verified production configuration');
  }

  if (!/^properties\/\d+$/.test(range.propertyResource)) {
    throw new Error(`Invalid GA4 property resource: ${range.propertyResource}`);
  }
  if (!validProductionHostname(range.productionHostname)) {
    throw new Error('productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot');
  }

  const now = range.now ?? new Date();
  const defaultDate = getAvailableGa4Date(now, range.ga4PropertyTimeZone, 2);
  const startDate = range.startDate ?? defaultDate;
  const endDate = range.endDate ?? defaultDate;
  const collectedAt = dependencies.collectedAt ?? now.toISOString();
  const common = {
    propertyResource: range.propertyResource,
    accessToken: dependencies.accessToken,
    transport: dependencies.transport,
  };

  const daily = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'deviceCategory'],
      ['activeUsers', 'newUsers', 'sessions', 'engagedSessions', 'userEngagementDuration', 'keyEvents'],
    ),
  });
  const acquisition = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'sessionSourceMedium', 'sessionDefaultChannelGroup'],
      ['sessions', 'engagedSessions', 'keyEvents'],
    ),
  });
  const landingPages = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'landingPagePlusQueryString', 'sessionDefaultChannelGroup', 'deviceCategory'],
      ['sessions', 'engagedSessions', 'keyEvents'],
    ),
  });
  const events = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'eventName'],
      ['eventCount', 'keyEvents'],
    ),
  });
  const pageMetrics = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'hostName', 'pagePath'],
      ['screenPageViews', 'activeUsers', 'sessions', 'engagedSessions', 'userEngagementDuration', 'keyEvents'],
    ),
  });
  const pageTitleRows = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'hostName', 'pagePath', 'pageTitle'],
      ['screenPageViews'],
    ),
  });
  const urlQualityRows = runGa4Report({
    ...common,
    body: reportBody(
      startDate,
      endDate,
      ['date', 'hostName', 'pagePathPlusQueryString'],
      ['screenPageViews', 'activeUsers', 'sessions'],
    ),
  });

  const pageTitles = selectPageTitles(pageTitleRows);
  const pages = pageMetrics.map((row) => {
    const date = rowString(row, 'date');
    const hostName = rowString(row, 'hostName');
    const pagePath = rowString(row, 'pagePath');
    const classification = classifyPagePath(pagePath);
    return {
      ...row,
      pageTitle: pageTitles.get(pageKey(date, hostName, pagePath)) ?? null,
      ...classification,
      dataAsOf: endDate,
      collectedAt,
    };
  });

  const urlQuality = urlQualityRows.flatMap((row) => {
    const date = rowString(row, 'date');
    const hostName = rowString(row, 'hostName');
    const rawUrl = rowString(row, 'pagePathPlusQueryString');
    const quality = classifyUrlQuality(hostName, rawUrl, range.productionHostname);
    if (quality.anomalyTypes.length === 0) return [];

    return [{
      ...row,
      normalizedPagePath: quality.normalizedPagePath,
      anomalyTypes: quality.anomalyTypes.join(','),
      pageTitle: pageTitles.get(pageKey(date, hostName, quality.normalizedPagePath)) ?? null,
      dataAsOf: endDate,
      collectedAt,
    }];
  });

  return {
    dataAsOf: endDate,
    collectedAt,
    daily: annotate(daily, endDate, collectedAt),
    acquisition: annotate(acquisition, endDate, collectedAt),
    landingPages: annotate(landingPages, endDate, collectedAt),
    events: annotate(events, endDate, collectedAt),
    pages,
    urlQuality,
  };
}
