export type GscDimension =
  | 'date'
  | 'query'
  | 'page'
  | 'country'
  | 'device'
  | 'searchAppearance';

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

export interface InspectionRow {
  url: string;
  verdict: string;
  coverageState: string;
  indexingState: string;
  pageFetchState: string;
  userCanonical: string;
  googleCanonical: string;
  lastCrawlTime: string;
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

interface AuthenticatedRequest {
  accessToken?: string;
}

export interface SearchAnalyticsRequest extends AuthenticatedRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: GscDimension[];
  rowLimit?: number;
  startRow?: number;
  transport?: HttpTransport;
}

export interface UrlInspectionRequest extends AuthenticatedRequest {
  siteUrl: string;
  inspectionUrl: string;
  languageCode?: string;
  inspectedAt?: string;
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

export function normalizeSearchAnalyticsRow(
  dimensions: GscDimension[],
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
  const dimensions = request.dimensions ?? [
    'date',
    'query',
    'page',
    'country',
    'device',
    'searchAppearance',
  ];
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

export function fetchUrlInspection(request: UrlInspectionRequest): InspectionRow {
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

  const parsed = parseJson(response, 'gsc-url-inspection') as {
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: unknown;
        coverageState?: unknown;
        indexingState?: unknown;
        pageFetchState?: unknown;
        userCanonical?: unknown;
        googleCanonical?: unknown;
        lastCrawlTime?: unknown;
      };
    };
  };
  const result = parsed.inspectionResult?.indexStatusResult ?? {};

  return {
    url: request.inspectionUrl,
    verdict: result.verdict == null ? '' : String(result.verdict),
    coverageState: result.coverageState == null ? '' : String(result.coverageState),
    indexingState: result.indexingState == null ? '' : String(result.indexingState),
    pageFetchState: result.pageFetchState == null ? '' : String(result.pageFetchState),
    userCanonical: result.userCanonical == null ? '' : String(result.userCanonical),
    googleCanonical: result.googleCanonical == null ? '' : String(result.googleCanonical),
    lastCrawlTime: result.lastCrawlTime == null ? '' : String(result.lastCrawlTime),
    inspectedAt: request.inspectedAt ?? new Date().toISOString(),
  };
}
