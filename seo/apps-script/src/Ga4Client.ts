import type {
  FetchOptionsLike,
  HttpResponseLike,
  HttpTransport,
} from './GscClient.ts';

export type Ga4Value = string | number | null;
export type Ga4Row = Record<string, Ga4Value>;

export interface Ga4ReportBody {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  limit?: number;
  offset?: number;
  keepEmptyRows?: boolean;
}

export interface Ga4ReportRequest {
  propertyResource: string;
  body: Ga4ReportBody;
  accessToken?: string;
  transport?: HttpTransport;
  pageLimit?: number;
}

export class Ga4PipelineError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`ga4-data-api request failed with HTTP ${status}`);
    this.name = 'Ga4PipelineError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

interface Ga4ApiResponse {
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
  rowCount?: number;
}

function defaultTransport(url: string, options: FetchOptionsLike): HttpResponseLike {
  return UrlFetchApp.fetch(url, options as GoogleAppsScript.URL_Fetch.URLFetchRequestOptions);
}

function authorizationHeader(accessToken?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken ?? ScriptApp.getOAuthToken()}`,
  };
}

function parseMetric(value: string | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeGa4Response(response: Ga4ApiResponse): Ga4Row[] {
  const dimensionNames = (response.dimensionHeaders ?? []).map((header) => header.name ?? '');
  const metricNames = (response.metricHeaders ?? []).map((header) => header.name ?? '');

  return (response.rows ?? []).map((rawRow) => {
    const row: Ga4Row = {};

    dimensionNames.forEach((name, index) => {
      if (!name) return;
      const value = rawRow.dimensionValues?.[index]?.value;
      row[name] = value == null ? null : value;
    });

    metricNames.forEach((name, index) => {
      if (!name) return;
      row[name] = parseMetric(rawRow.metricValues?.[index]?.value);
    });

    return row;
  });
}

export function runGa4Report(request: Ga4ReportRequest): Ga4Row[] {
  if (!/^properties\/\d+$/.test(request.propertyResource)) {
    throw new Error(`Invalid GA4 property resource: ${request.propertyResource}`);
  }

  const transport = request.transport ?? defaultTransport;
  const pageLimit = request.pageLimit ?? 100_000;
  const rows: Ga4Row[] = [];
  let offset = request.body.offset ?? 0;

  while (true) {
    const body: Ga4ReportBody = {
      ...request.body,
      limit: pageLimit,
      offset,
      keepEmptyRows: false,
    };
    const response = transport(
      `https://analyticsdata.googleapis.com/v1beta/${request.propertyResource}:runReport`,
      {
        method: 'post',
        contentType: 'application/json',
        headers: authorizationHeader(request.accessToken),
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      },
    );
    const status = response.getResponseCode();
    const responseBody = response.getContentText();

    if (status < 200 || status >= 300) {
      throw new Ga4PipelineError(status, responseBody);
    }

    const parsed = responseBody.trim()
      ? JSON.parse(responseBody) as Ga4ApiResponse
      : {};
    const pageRows = normalizeGa4Response(parsed);
    rows.push(...pageRows);

    const rowCount = parsed.rowCount ?? rows.length;
    if (pageRows.length < pageLimit || rows.length >= rowCount) {
      break;
    }

    offset += pageRows.length;
  }

  return rows;
}
