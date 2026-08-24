# GSC Data Model and Source Timezone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mixed-grain Search Console import with three independently keyed daily reports and calculate available dates in the Search Console `America/Los_Angeles` calendar.

**Architecture:** `GscClient.ts` remains a generic paginated HTTP client whose callers must specify dimensions and aggregation. `GscImporter.ts` owns immutable report specifications, source-calendar date calculation, fetch-before-write orchestration, report-specific deduplication, and Sheet routing. All behavior is verified through injected transports and writers; no test contacts Google services.

**Tech Stack:** TypeScript 5.9, Node.js 22, `tsx --test`, Google Apps Script V8 APIs, GitHub Actions.

## Global Constraints

- Work only on the existing `seo-system` branch and draft PR #35.
- Do not open another pull request.
- Do not merge, mark ready for review, enable auto-merge, or deploy.
- Do not write to GA4, GTM, GSC configuration, Vercel production, or a production Google Sheet.
- GSC daily totals use the `date` grain and `aggregationType: 'byProperty'`.
- GSC pages use the `date + page` grain and `aggregationType: 'auto'`.
- GSC queries use the `date + query` grain and `aggregationType: 'byProperty'`.
- Search Console source dates use the `America/Los_Angeles` calendar and a default three-day final-data delay.
- Fetch all three reports before invoking any Sheet writer.
- Empty successful API responses remain empty and must not create synthetic zero rows.
- Preserve URL Inspection allowlisting and typed HTTP errors.
- Do not add a new runtime dependency for timezone handling.

---

## File map

- `seo/apps-script/src/GscClient.ts`: generic Search Analytics request contract, request payload, pagination, row normalization, typed HTTP errors.
- `seo/apps-script/src/GscImporter.ts`: report specifications, Pacific-calendar date helper, report-level deduplication, fetch-before-write bundle import.
- `tests/seo/apps-script/gsc-importer.test.ts`: request-payload, timezone-boundary, routing, idempotency, zero-write-on-fetch-failure, and regression tests.
- `seo/apps-script/README.md`: document the three report grains and the source timezone after implementation is green.
- `.github/workflows/seo-data-hub-validation.yml`: no functional change expected; verify that existing path filters and commands cover every changed file.

---

### Task 1: Make Search Analytics dimensions and aggregation explicit

**Files:**
- Modify: `seo/apps-script/src/GscClient.ts`
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Consumes: existing `GscDimension`, `HttpTransport`, `PipelineError`, and `normalizeSearchAnalyticsRow(...)`.
- Produces:

```ts
export type GscAggregationType = 'auto' | 'byPage' | 'byProperty';

export interface SearchAnalyticsRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: readonly GscDimension[];
  aggregationType: GscAggregationType;
  rowLimit?: number;
  startRow?: number;
  accessToken?: string;
  transport?: HttpTransport;
}
```

- [ ] **Step 1: Add failing request-contract tests**

Extend the pagination test transport so it captures the complete request payload and add a focused test:

```ts
test('sends explicit dimensions and aggregation type on every page', () => {
  const payloads: Array<{
    dimensions: string[];
    aggregationType: string;
    startRow: number;
    dataState: string;
  }> = [];

  const transport: HttpTransport = (_url, options) => {
    const payload = JSON.parse(options.payload);
    payloads.push(payload);
    return response({ rows: [] });
  };

  fetchSearchAnalytics({
    siteUrl: 'https://www.evochia.gr/',
    startDate: '2026-08-02',
    endDate: '2026-08-02',
    dimensions: ['date'],
    aggregationType: 'byProperty',
    accessToken: 'test-token',
    transport,
  });

  assert.deepEqual(payloads, [{
    dimensions: ['date'],
    aggregationType: 'byProperty',
    startRow: 0,
    dataState: 'final',
  }]);
});
```

Add a compile-time usage test by updating every existing `fetchSearchAnalytics(...)` call in the test file to pass explicit `dimensions` and `aggregationType`.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
npm run seo:test:apps-script -- --test-name-pattern="explicit dimensions|paginates Search Analytics"
```

Expected: FAIL because `aggregationType` is absent from the serialized payload and the request interface still permits omitted dimensions.

- [ ] **Step 3: Implement the minimal request-contract change**

In `GscClient.ts`:

```ts
export type GscAggregationType = 'auto' | 'byPage' | 'byProperty';

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
```

Remove the six-dimension fallback and serialize the caller-owned values:

```ts
const dimensions = [...request.dimensions];

payload: JSON.stringify({
  startDate: request.startDate,
  endDate: request.endDate,
  dimensions,
  aggregationType: request.aggregationType,
  rowLimit,
  startRow,
  dataState: 'final',
}),
```

Keep pagination, normalization, zero metrics, and `PipelineError` behavior unchanged.

- [ ] **Step 4: Run Apps Script tests and typecheck**

Run:

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit the client contract**

```bash
git add seo/apps-script/src/GscClient.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "refactor(seo): require explicit GSC report aggregation"
```

---

### Task 2: Calculate GSC dates in the Los Angeles calendar

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Consumes: JavaScript `Intl.DateTimeFormat` available in Node 22 and Apps Script V8.
- Produces:

```ts
export const GSC_TIME_ZONE = 'America/Los_Angeles';
export function getAvailableGscDate(now: Date, delayDays?: number): string;
```

- [ ] **Step 1: Replace the UTC-only test with timezone-boundary tests**

```ts
test('uses the Los Angeles calendar before local midnight', () => {
  assert.equal(
    getAvailableGscDate(new Date('2026-08-06T05:00:00Z')),
    '2026-08-02',
  );
});

test('uses the Los Angeles calendar after local midnight', () => {
  assert.equal(
    getAvailableGscDate(new Date('2026-08-06T08:00:00Z')),
    '2026-08-03',
  );
});

test('rejects invalid GSC availability delays', () => {
  assert.throws(() => getAvailableGscDate(new Date(), -1), /non-negative integer/);
  assert.throws(() => getAvailableGscDate(new Date(), 1.5), /non-negative integer/);
});
```

Add a daylight-saving regression case that cannot be implemented correctly with a permanent UTC offset:

```ts
test('uses the named timezone across the daylight-saving boundary', () => {
  assert.equal(
    getAvailableGscDate(new Date('2026-11-02T07:30:00Z'), 0),
    '2026-11-01',
  );
});
```

- [ ] **Step 2: Run the timezone tests and confirm failure**

Run:

```bash
npm run seo:test:apps-script -- --test-name-pattern="Los Angeles|availability delays|daylight-saving"
```

Expected: FAIL because the existing implementation slices the UTC ISO date.

- [ ] **Step 3: Implement timezone-aware calendar extraction and subtraction**

Use `formatToParts` to obtain the source-local calendar date, then subtract calendar days in UTC from those date components:

```ts
export const GSC_TIME_ZONE = 'America/Los_Angeles';

function calendarDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
  };
}

export function getAvailableGscDate(now: Date, delayDays = 3): string {
  if (!Number.isInteger(delayDays) || delayDays < 0) {
    throw new Error('delayDays must be a non-negative integer');
  }

  const { year, month, day } = calendarDateParts(now, GSC_TIME_ZONE);
  return new Date(Date.UTC(year, month - 1, day - delayDays))
    .toISOString()
    .slice(0, 10);
}
```

Do not use a fixed `-07:00` or `-08:00` offset.

- [ ] **Step 4: Run Apps Script tests and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit the source-calendar behavior**

```bash
git add seo/apps-script/src/GscImporter.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "fix(seo): use Search Console source calendar"
```

---

### Task 3: Define three immutable GSC report specifications

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Consumes: `GscDimension` and `GscAggregationType` from `GscClient.ts`.
- Produces:

```ts
export type GscReportId = 'daily' | 'pages' | 'queries';

export interface GscReportSpec {
  id: GscReportId;
  dimensions: readonly GscDimension[];
  aggregationType: GscAggregationType;
  sheetName: 'GSC Daily' | 'GSC Pages' | 'GSC Queries';
  keyColumns: readonly string[];
}

export const GSC_REPORT_SPECS: readonly GscReportSpec[];
```

- [ ] **Step 1: Write the failing report-specification test**

```ts
test('defines isolated daily, page, and query report grains', () => {
  assert.deepEqual(GSC_REPORT_SPECS, [
    {
      id: 'daily',
      dimensions: ['date'],
      aggregationType: 'byProperty',
      sheetName: 'GSC Daily',
      keyColumns: ['date'],
    },
    {
      id: 'pages',
      dimensions: ['date', 'page'],
      aggregationType: 'auto',
      sheetName: 'GSC Pages',
      keyColumns: ['date', 'page'],
    },
    {
      id: 'queries',
      dimensions: ['date', 'query'],
      aggregationType: 'byProperty',
      sheetName: 'GSC Queries',
      keyColumns: ['date', 'query'],
    },
  ]);

  for (const spec of GSC_REPORT_SPECS) {
    assert.equal(spec.dimensions.includes('country'), false);
    assert.equal(spec.dimensions.includes('device'), false);
    assert.equal(spec.dimensions.includes('searchAppearance'), false);
  }
});
```

- [ ] **Step 2: Run the specification test and confirm failure**

```bash
npm run seo:test:apps-script -- --test-name-pattern="isolated daily"
```

Expected: FAIL because `GSC_REPORT_SPECS` does not exist.

- [ ] **Step 3: Implement the immutable specifications**

```ts
export const GSC_REPORT_SPECS = [
  {
    id: 'daily',
    dimensions: ['date'],
    aggregationType: 'byProperty',
    sheetName: 'GSC Daily',
    keyColumns: ['date'],
  },
  {
    id: 'pages',
    dimensions: ['date', 'page'],
    aggregationType: 'auto',
    sheetName: 'GSC Pages',
    keyColumns: ['date', 'page'],
  },
  {
    id: 'queries',
    dimensions: ['date', 'query'],
    aggregationType: 'byProperty',
    sheetName: 'GSC Queries',
    keyColumns: ['date', 'query'],
  },
] as const satisfies readonly GscReportSpec[];
```

Remove the old six-column `GSC_KEY_COLUMNS` constant. Add a small report-specific helper:

```ts
export function deduplicateGscRows(
  rows: GscRow[],
  keyColumns: readonly string[],
): GscRow[] {
  const byKey = new Map<string, GscRow>();
  for (const row of rows) {
    const key = keyColumns.map((column) => String(row[column as keyof GscRow] ?? ''))
      .join('\u001f');
    byKey.set(key, row);
  }
  return [...byKey.values()];
}
```

- [ ] **Step 4: Update the existing pagination/deduplication assertion**

Replace the old six-dimension call with explicit dimensions and keys:

```ts
const rows = fetchSearchAnalytics({
  siteUrl: 'https://www.evochia.gr/',
  startDate: '2026-08-01',
  endDate: '2026-08-01',
  dimensions: ['date', 'query', 'page', 'country', 'device', 'searchAppearance'],
  aggregationType: 'auto',
  rowLimit: 2,
  accessToken: 'test-token',
  transport,
});

assert.equal(
  deduplicateGscRows(rows, ['date', 'query', 'page', 'country', 'device', 'searchAppearance']).length,
  3,
);
```

This legacy-grain test remains a client-normalization regression test only; production importer specifications must not use that grain.

- [ ] **Step 5: Run Apps Script tests and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the report contracts**

```bash
git add seo/apps-script/src/GscImporter.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "feat(seo): define isolated GSC report grains"
```

---

### Task 4: Fetch all reports before writing and route each report independently

**Files:**
- Modify: `seo/apps-script/src/GscImporter.ts`
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`

**Interfaces:**
- Consumes: `GSC_REPORT_SPECS`, `fetchSearchAnalytics(...)`, `upsertRows(...)`, and `getAvailableGscDate(...)`.
- Produces:

```ts
export interface GscReportImportResult {
  fetched: number;
  write: WriteSummary;
}

export interface GscImportResult {
  dataAsOf: string;
  collectedAt: string;
  reports: Record<GscReportId, GscReportImportResult>;
}

export function importSearchAnalyticsDay(
  config: GscImportConfig,
  now: Date,
  dependencies?: GscImportDependencies,
): GscImportResult;
```

- [ ] **Step 1: Add a successful bundle-routing test**

Create a transport that branches on `payload.dimensions` and a writer spy:

```ts
test('fetches and writes daily, page, and query reports at their own grains', () => {
  const requests: Array<{ dimensions: string[]; aggregationType: string }> = [];
  const writes: Array<{ sheetName: string; keyColumns: string[]; rows: RowRecord[] }> = [];

  const transport: HttpTransport = (_url, options) => {
    const payload = JSON.parse(options.payload);
    requests.push({
      dimensions: payload.dimensions,
      aggregationType: payload.aggregationType,
    });

    const key = payload.dimensions.join(',');
    const rowsByDimensions: Record<string, unknown[]> = {
      date: [{ keys: ['2026-08-02'], clicks: 5, impressions: 50, ctr: 0.1, position: 4 }],
      'date,page': [{ keys: ['2026-08-02', 'https://www.evochia.gr/en/private-chef.html'], clicks: 3, impressions: 30, ctr: 0.1, position: 5 }],
      'date,query': [{ keys: ['2026-08-02', 'private chef greece'], clicks: 2, impressions: 20, ctr: 0.1, position: 6 }],
    };
    return response({ rows: rowsByDimensions[key] ?? [] });
  };

  const result = importSearchAnalyticsDay(
    { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [] },
    new Date('2026-08-06T05:00:00Z'),
    {
      accessToken: 'test-token',
      collectedAt: '2026-08-06T05:00:00Z',
      transport,
      writeRows: (sheetName, keyColumns, rows) => {
        writes.push({ sheetName, keyColumns, rows });
        return { inserted: rows.length, updated: 0, unchanged: 0, total: rows.length };
      },
    },
  );

  assert.deepEqual(requests, [
    { dimensions: ['date'], aggregationType: 'byProperty' },
    { dimensions: ['date', 'page'], aggregationType: 'auto' },
    { dimensions: ['date', 'query'], aggregationType: 'byProperty' },
  ]);
  assert.deepEqual(writes.map(({ sheetName, keyColumns }) => ({ sheetName, keyColumns })), [
    { sheetName: 'GSC Daily', keyColumns: ['date'] },
    { sheetName: 'GSC Pages', keyColumns: ['date', 'page'] },
    { sheetName: 'GSC Queries', keyColumns: ['date', 'query'] },
  ]);
  assert.equal(result.dataAsOf, '2026-08-02');
  assert.equal(result.reports.daily.fetched, 1);
  assert.equal(result.reports.pages.fetched, 1);
  assert.equal(result.reports.queries.fetched, 1);
});
```

Also assert every written row includes `dataAsOf` and `collectedAt`.

- [ ] **Step 2: Add a zero-write-on-fetch-failure test**

```ts
test('does not write any report when a later GSC fetch fails', () => {
  let requestCount = 0;
  let writerCalls = 0;

  assert.throws(() => importSearchAnalyticsDay(
    { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [] },
    new Date('2026-08-06T08:00:00Z'),
    {
      accessToken: 'test-token',
      transport: () => {
        requestCount += 1;
        return requestCount === 2
          ? response('{"error":"quota"}', 429)
          : response({ rows: [] });
      },
      writeRows: () => {
        writerCalls += 1;
        return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
      },
    },
  ), (error: unknown) => error instanceof PipelineError && error.status === 429);

  assert.equal(writerCalls, 0);
});
```

- [ ] **Step 3: Add an empty-success test**

```ts
test('keeps empty successful reports empty without synthetic rows', () => {
  const writtenRowCounts: number[] = [];

  const result = importSearchAnalyticsDay(
    { siteUrl: 'https://www.evochia.gr/', monitoredUrls: [] },
    new Date('2026-08-06T08:00:00Z'),
    {
      accessToken: 'test-token',
      transport: () => response({ rows: [] }),
      writeRows: (_sheetName, _keyColumns, rows) => {
        writtenRowCounts.push(rows.length);
        return { inserted: 0, updated: 0, unchanged: 0, total: 0 };
      },
    },
  );

  assert.deepEqual(writtenRowCounts, [0, 0, 0]);
  assert.equal(result.reports.daily.fetched, 0);
  assert.equal(result.reports.pages.fetched, 0);
  assert.equal(result.reports.queries.fetched, 0);
});
```

- [ ] **Step 4: Run the new importer tests and confirm failure**

```bash
npm run seo:test:apps-script -- --test-name-pattern="fetches and writes|later GSC fetch fails|empty successful"
```

Expected: FAIL because the current importer performs only one mixed-grain fetch and immediate write.

- [ ] **Step 5: Implement fetch-before-write orchestration**

In `GscImporter.ts`, fetch all report datasets before selecting the writer:

```ts
const fetchedReports = GSC_REPORT_SPECS.map((spec) => ({
  spec,
  rows: fetchSearchAnalytics({
    siteUrl: config.siteUrl,
    startDate: dataAsOf,
    endDate: dataAsOf,
    dimensions: spec.dimensions,
    aggregationType: spec.aggregationType,
    transport: dependencies.transport,
    accessToken: dependencies.accessToken,
  }),
}));

const writer = dependencies.writeRows ?? upsertRows;
const reports = {} as Record<GscReportId, GscReportImportResult>;

for (const { spec, rows: fetched } of fetchedReports) {
  const rows = deduplicateGscRows(fetched, spec.keyColumns).map((row) => ({
    ...row,
    dataAsOf,
    collectedAt,
  }));

  reports[spec.id] = {
    fetched: fetched.length,
    write: writer(spec.sheetName, [...spec.keyColumns], rows as RowRecord[]),
  };
}

return { dataAsOf, collectedAt, reports };
```

Do not catch `PipelineError`; allowing it to propagate is what guarantees no writes when a fetch fails.

- [ ] **Step 6: Run Apps Script tests and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the bundle importer**

```bash
git add seo/apps-script/src/GscImporter.ts tests/seo/apps-script/gsc-importer.test.ts
git commit -m "feat(seo): import isolated GSC daily reports"
```

---

### Task 5: Prove idempotency at each report grain

**Files:**
- Modify: `tests/seo/apps-script/gsc-importer.test.ts`
- Verify without modifying unless a defect is exposed: `seo/apps-script/src/SheetWriter.ts`

**Interfaces:**
- Consumes: `mergeRowRecords(headers, existingRows, keyColumns, incomingRows)`.
- Produces: regression evidence that daily, page, and query rows update independently.

- [ ] **Step 1: Replace the single six-column idempotency test with a table-driven test**

```ts
test('repeated row merge is idempotent for every GSC report grain', () => {
  const cases = [
    {
      headers: ['date', 'clicks', 'impressions', 'ctr', 'position'],
      keyColumns: ['date'],
      row: { date: '2026-08-02', clicks: 5, impressions: 50, ctr: 0.1, position: 4 },
    },
    {
      headers: ['date', 'page', 'clicks', 'impressions', 'ctr', 'position'],
      keyColumns: ['date', 'page'],
      row: { date: '2026-08-02', page: '/en/private-chef.html', clicks: 3, impressions: 30, ctr: 0.1, position: 5 },
    },
    {
      headers: ['date', 'query', 'clicks', 'impressions', 'ctr', 'position'],
      keyColumns: ['date', 'query'],
      row: { date: '2026-08-02', query: 'private chef greece', clicks: 2, impressions: 20, ctr: 0.1, position: 6 },
    },
  ];

  for (const { headers, keyColumns, row } of cases) {
    const first = mergeRowRecords(headers, [], keyColumns, [row]);
    assert.deepEqual(first.summary, { inserted: 1, updated: 0, unchanged: 0, total: 1 });

    const second = mergeRowRecords(headers, first.rows, keyColumns, [row]);
    assert.deepEqual(second.summary, { inserted: 0, updated: 0, unchanged: 1, total: 1 });

    const changed = mergeRowRecords(headers, second.rows, keyColumns, [{ ...row, clicks: 9 }]);
    assert.deepEqual(changed.summary, { inserted: 0, updated: 1, unchanged: 0, total: 1 });
    assert.equal(changed.rows[0].clicks, 9);
  }
});
```

- [ ] **Step 2: Run the focused idempotency test**

```bash
npm run seo:test:apps-script -- --test-name-pattern="every GSC report grain"
```

Expected: PASS with the existing generic writer. If it fails, fix only the generic-key defect demonstrated by the test; do not introduce GSC-specific logic into `SheetWriter.ts`.

- [ ] **Step 3: Run the full Apps Script suite and typecheck**

```bash
npm run seo:test:apps-script
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit the idempotency coverage**

```bash
git add tests/seo/apps-script/gsc-importer.test.ts seo/apps-script/src/SheetWriter.ts
git commit -m "test(seo): cover all GSC report keys"
```

Only stage `SheetWriter.ts` if the focused test exposed and required a real implementation change.

---

### Task 6: Document the report contract and run the full repository gate

**Files:**
- Modify: `seo/apps-script/README.md`
- Verify: `.github/workflows/seo-data-hub-validation.yml`
- Verify: draft PR #35 metadata and checks

**Interfaces:**
- Consumes: implemented `GSC_REPORT_SPECS` and `GSC_TIME_ZONE`.
- Produces: operator-facing documentation and CI evidence.

- [ ] **Step 1: Update the Apps Script README with the exact GSC contracts**

Add a section containing this table:

```md
## Search Console report grains

| Sheet | Dimensions | Aggregation | Key | Purpose |
|---|---|---|---|---|
| `GSC Daily` | `date` | `byProperty` | `date` | Property totals |
| `GSC Pages` | `date`, `page` | `auto` | `date`, `page` | Canonical page performance |
| `GSC Queries` | `date`, `query` | `byProperty` | `date`, `query` | Query discovery and trends |

Dates are selected from the `America/Los_Angeles` calendar with a default three-day final-data delay. Query rows are not used to reconstruct property totals. The importer fetches all three reports before writing any Sheet.
```

State explicitly that this code remains undeployed and that production authorization/import requires owner approval.

- [ ] **Step 2: Run every local validation command used by CI**

```bash
npm ci --ignore-scripts
npm run test:unit
npm run seo:test:apps-script
npm run typecheck
npm run test:analytics
```

Expected: all commands exit `0`. Analytics tests are included as a regression check even though the Data Hub workflow runs them separately.

- [ ] **Step 3: Review the diff for forbidden scope**

```bash
git diff --check
git diff --name-only HEAD~5..HEAD
```

Expected changed implementation paths for this batch:

```text
seo/apps-script/src/GscClient.ts
seo/apps-script/src/GscImporter.ts
tests/seo/apps-script/gsc-importer.test.ts
seo/apps-script/README.md
```

`SheetWriter.ts` is permitted only if Task 5 exposed a generic-key defect. No HTML, analytics event, GA4/GTM configuration, deployment, or production file should change.

- [ ] **Step 4: Commit documentation if it is not already part of the previous commit**

```bash
git add seo/apps-script/README.md
git commit -m "docs(seo): document GSC report contracts"
```

- [ ] **Step 5: Push only to the existing `seo-system` branch**

```bash
git push origin seo-system
```

Do not create another branch or PR.

- [ ] **Step 6: Verify the existing draft PR and CI**

Confirm:

- PR #35 remains `open`, `draft`, `seo-system` → `main`.
- `SEO Data Hub Validation` concludes `success` for the new head.
- `Site Analytics Validation` remains green or is not triggered because no analytics path changed.
- Vercel Preview status is informational only; do not promote or deploy it.

- [ ] **Step 7: Report the implementation evidence and stop at the owner gate**

The handoff report must include:

- final commit SHA;
- files changed;
- local command results;
- GitHub Actions run IDs and conclusions;
- confirmation that no Google service or production write occurred;
- the next planned automated batch: GA4 Pages/hostname reporting.

Do not merge, deploy, connect production credentials, or start external GSC reconciliation in this task.

---

## Plan self-review

- **Spec coverage:** Tasks 1–6 cover explicit request dimensions/aggregation, three report grains, Pacific-calendar dates, fetch-before-write semantics, empty reports, typed failures, idempotency, documentation, and CI.
- **Scope:** This plan intentionally excludes GA4 Pages/hostname, bundling, triggers, production authorization, external validation, and Lead Tracker implementation. Those remain later sequential batches inside the same draft PR #35.
- **Placeholder scan:** No `TBD`, deferred implementation placeholder, or undefined helper remains.
- **Type consistency:** `GscReportId`, `GscReportSpec`, `GscReportImportResult`, `GscImportResult`, `GSC_REPORT_SPECS`, and `getAvailableGscDate` use the same names and signatures across all tasks.
