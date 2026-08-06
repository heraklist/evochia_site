import {
  runGa4Report,
  type Ga4ReportBody,
  type Ga4Row,
  type HttpTransport,
} from './Ga4Client.ts';

export interface Ga4ReportRange {
  propertyResource: string;
  verificationStatus: 'pending' | 'verified';
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
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getAvailableGa4Date(now: Date, delayDays = 2): string {
  if (!Number.isInteger(delayDays) || delayDays < 0) {
    throw new Error('delayDays must be a non-negative integer');
  }

  const available = new Date(now.getTime());
  available.setUTCDate(available.getUTCDate() - delayDays);
  return formatUtcDate(available);
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

  const now = range.now ?? new Date();
  const defaultDate = getAvailableGa4Date(now, 2);
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

  return {
    dataAsOf: endDate,
    collectedAt,
    daily: annotate(daily, endDate, collectedAt),
    acquisition: annotate(acquisition, endDate, collectedAt),
    landingPages: annotate(landingPages, endDate, collectedAt),
    events: annotate(events, endDate, collectedAt),
  };
}
