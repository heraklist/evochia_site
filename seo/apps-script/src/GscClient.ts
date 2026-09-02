export type GscDimension =
  | 'date'
  | 'query'
  | 'page'
  | 'country'
  | 'device'
  | 'searchAppearance';

export type GscAggregationType = 'auto' | 'byPage' | 'byProperty';

export interface GscRow {
  date: string;
  query: string;
  page: string;
  country: string;
  device: string;
  searchAppearance: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export type ScalarField =
  | { state: 'VALUE'; value: string }
  | { state: 'NOT_RETURNED' };

export type ArrayField =
  | { state: 'VALUE'; value: string[] }
  | { state: 'EMPTY' }
  | { state: 'NOT_RETURNED' };

export interface ProviderInspectionResult {
  url: string;
  verdict: ScalarField;
  coverageState: ScalarField;
  robotsTxtState: ScalarField;
  indexingState: ScalarField;
  pageFetchState: ScalarField;
  crawledAs: ScalarField;
  userCanonical: ScalarField;
  googleCanonical: ScalarField;
  lastCrawlTime: ScalarField;
  sitemap: ArrayField;
  referringUrls: ArrayField;
  inspectionResultLink: ScalarField;
  inspectedAt: string;
}

export interface HttpResponseLike {
  getResponseCode(): number;
  getContentText(): string;
}

export interface FetchOptionsLike {
  method: 'post';
  contentType: 'application/json';
  headers: Record<string, string>;
  payload: string;
  muteHttpExceptions: true;
}

export type HttpTransport = (url: string, options: FetchOptionsLike) => HttpResponseLike;

export class PipelineError extends Error {
  readonly source: 'gsc-search-analytics' | 'gsc-url-inspection';
  readonly status: number;
  readonly responseBody: string;

  constructor(
    source: PipelineError['source'],
    status: number,
    responseBody: string,
  ) {
    super(`${source} request failed with HTTP ${status}`);
    this.name = 'PipelineError';
    this.source = source;
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class MalformedInspectionResponse extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedInspectionResponse';
  }
}

interface AuthenticatedRequest {
  accessToken?: string;
}

export interface SearchAnalyticsRequest extends AuthenticatedRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: readonly GscDimension[];
  aggregationType: GscAggregationType;
  rowLimit?: number;
  startRow?: number;
  transport?: HttpTransport;
}

export interface UrlInspectionRequest extends AuthenticatedRequest {
  siteUrl: string;
  inspectionUrl: string;
  languageCode?: string;
  inspectedAt: string;
  transport?: HttpTransport;
}

function defaultTransport(url: string, options: FetchOptionsLike): HttpResponseLike {
  return UrlFetchApp.fetch(url, options as GoogleAppsScript.URL_Fetch.URLFetchRequestOptions);
}

function authHeaders(accessToken?: string): Record<string, string> {
  const token = accessToken ?? ScriptApp.getOAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

function parseJson(response: HttpResponseLike, source: PipelineError['source']): unknown {
  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new PipelineError(source, status, body);
  }

  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body) as unknown;
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function scalarField(object: Record<string, unknown>, key: string): ScalarField {
  if (!hasOwn(object, key)) {
    return { state: 'NOT_RETURNED' };
  }

  const value = object[key];
  if (typeof value !== 'string') {
    throw new MalformedInspectionResponse(`${key} must be a string`);
  }

  return { state: 'VALUE', value };
}

function arrayField(object: Record<string, unknown>, key: string): ArrayField {
  if (!hasOwn(object, key)) {
    return { state: 'NOT_RETURNED' };
  }

  const value = object[key];
  if (!Array.isArray(value)) {
    throw new MalformedInspectionResponse(`${key} must be an array`);
  }
  if (!value.every((item) => typeof item === 'string')) {
    throw new MalformedInspectionResponse(`${key} must contain only strings`);
  }
  if (value.length === 0) {
    return { state: 'EMPTY' };
  }

  return { state: 'VALUE', value: [...value] };
}

export function normalizeSearchAnalyticsRow(
  dimensions: readonly GscDimension[],
  raw: {
    keys?: unknown[];
    clicks?: unknown;
    impressions?: unknown;
    ctr?: unknown;
    position?: unknown;
  },
): GscRow {
  const values = new Map<GscDimension, string>();
  dimensions.forEach((dimension, index) => {
    const value = raw.keys?.[index];
    values.set(dimension, value == null ? '' : String(value));
  });

  return {
    date: values.get('date') ?? '',
    query: values.get('query') ?? '',
    page: values.get('page') ?? '',
    country: values.get('country') ?? '',
    device: values.get('device') ?? '',
    searchAppearance: values.get('searchAppearance') ?? '',
    clicks: numberOrZero(raw.clicks),
    impressions: numberOrZero(raw.impressions),
    ctr: numberOrZero(raw.ctr),
    position: numberOrZero(raw.position),
  };
}

export function fetchSearchAnalytics(request: SearchAnalyticsRequest): GscRow[] {
  const dimensions = [...request.dimensions];
  const rowLimit = request.rowLimit ?? 25_000;
  const transport = request.transport ?? defaultTransport;
  const rows: GscRow[] = [];
  let startRow = request.startRow ?? 0;

  while (true) {
    const response = transport(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(request.siteUrl)}/searchAnalytics/query`,
      {
        method: 'post',
        contentType: 'application/json',
        headers: authHeaders(request.accessToken),
        payload: JSON.stringify({
          startDate: request.startDate,
          endDate: request.endDate,
          dimensions,
          aggregationType: request.aggregationType,
          rowLimit,
          startRow,
          dataState: 'final',
        }),
        muteHttpExceptions: true,
      },
    );

    const parsed = parseJson(response, 'gsc-search-analytics') as {
      rows?: Array<{
        keys?: unknown[];
        clicks?: unknown;
        impressions?: unknown;
        ctr?: unknown;
        position?: unknown;
      }>;
    };
    const pageRows = parsed.rows ?? [];
    rows.push(...pageRows.map((row) => normalizeSearchAnalyticsRow(dimensions, row)));

    if (pageRows.length < rowLimit) {
      break;
    }

    startRow += pageRows.length;
  }

  return rows;
}

export function fetchUrlInspection(request: UrlInspectionRequest): ProviderInspectionResult {
  const transport = request.transport ?? defaultTransport;
  const response = transport(
    'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    {
      method: 'post',
      contentType: 'application/json',
      headers: authHeaders(request.accessToken),
      payload: JSON.stringify({
        inspectionUrl: request.inspectionUrl,
        siteUrl: request.siteUrl,
        languageCode: request.languageCode ?? 'en-US',
      }),
      muteHttpExceptions: true,
    },
  );

  const parsed = parseJson(response, 'gsc-url-inspection');
  if (!isRecord(parsed) || !hasOwn(parsed, 'inspectionResult')) {
    throw new MalformedInspectionResponse('inspectionResult is required');
  }

  const inspectionResult = parsed.inspectionResult;
  if (!isRecord(inspectionResult)) {
    throw new MalformedInspectionResponse('inspectionResult must be an object');
  }
  if (!hasOwn(inspectionResult, 'indexStatusResult')) {
    throw new MalformedInspectionResponse('indexStatusResult is required');
  }

  const indexStatusResult = inspectionResult.indexStatusResult;
  if (!isRecord(indexStatusResult)) {
    throw new MalformedInspectionResponse('indexStatusResult must be an object');
  }

  return {
    url: request.inspectionUrl,
    verdict: scalarField(indexStatusResult, 'verdict'),
    coverageState: scalarField(indexStatusResult, 'coverageState'),
    robotsTxtState: scalarField(indexStatusResult, 'robotsTxtState'),
    indexingState: scalarField(indexStatusResult, 'indexingState'),
    pageFetchState: scalarField(indexStatusResult, 'pageFetchState'),
    crawledAs: scalarField(indexStatusResult, 'crawledAs'),
    userCanonical: scalarField(indexStatusResult, 'userCanonical'),
    googleCanonical: scalarField(indexStatusResult, 'googleCanonical'),
    lastCrawlTime: scalarField(indexStatusResult, 'lastCrawlTime'),
    sitemap: arrayField(indexStatusResult, 'sitemap'),
    referringUrls: arrayField(indexStatusResult, 'referringUrls'),
    inspectionResultLink: scalarField(inspectionResult, 'inspectionResultLink'),
    inspectedAt: request.inspectedAt,
  };
}
