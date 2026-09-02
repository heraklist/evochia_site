import assert from 'node:assert/strict';
import test from 'node:test';

import type { ArrayField, ScalarField } from '../../../seo/apps-script/src/GscClient.ts';
import {
  canonicalMatch,
  flattenInspectionSnapshot,
  type InspectionSnapshot,
} from '../../../seo/apps-script/src/GscImporter.ts';

const value = (text: string): ScalarField => ({ state: 'VALUE', value: text });
const absent: ScalarField = { state: 'NOT_RETURNED' };

const canonicalCases: Array<{
  name: string;
  user: ScalarField;
  google: ScalarField;
  expected: 'MATCH' | 'MISMATCH' | 'NOT_COMPARABLE';
}> = [
  {
    name: 'www vs non-www remains semantic',
    user: value('https://www.evochia.gr/en/private-chef/'),
    google: value('https://evochia.gr/en/private-chef/'),
    expected: 'MISMATCH',
  },
  {
    name: 'http vs https remains semantic',
    user: value('http://www.evochia.gr/en/private-chef/'),
    google: value('https://www.evochia.gr/en/private-chef/'),
    expected: 'MISMATCH',
  },
  {
    name: 'trailing slash remains semantic',
    user: value('https://www.evochia.gr/en/private-chef'),
    google: value('https://www.evochia.gr/en/private-chef/'),
    expected: 'MISMATCH',
  },
  {
    name: 'path casing remains semantic',
    user: value('https://www.evochia.gr/en/Foo/'),
    google: value('https://www.evochia.gr/en/foo/'),
    expected: 'MISMATCH',
  },
  {
    name: 'query string remains semantic',
    user: value('https://www.evochia.gr/en/private-chef/?ref=one'),
    google: value('https://www.evochia.gr/en/private-chef/?ref=two'),
    expected: 'MISMATCH',
  },
  {
    name: 'hostname case alone normalizes',
    user: value('https://WWW.EVOCHIA.GR/en/private-chef/'),
    google: value('https://www.evochia.gr/en/private-chef/'),
    expected: 'MATCH',
  },
  {
    name: 'default https port alone normalizes',
    user: value('https://www.evochia.gr:443/en/private-chef/'),
    google: value('https://www.evochia.gr/en/private-chef/'),
    expected: 'MATCH',
  },
  {
    name: 'default http port alone normalizes',
    user: value('http://www.evochia.gr:80/en/private-chef/'),
    google: value('http://www.evochia.gr/en/private-chef/'),
    expected: 'MATCH',
  },
  {
    name: 'fragment alone normalizes',
    user: value('https://www.evochia.gr/en/private-chef/#menu'),
    google: value('https://www.evochia.gr/en/private-chef/#details'),
    expected: 'MATCH',
  },
  {
    name: 'missing user canonical is not comparable',
    user: absent,
    google: value('https://www.evochia.gr/en/private-chef/'),
    expected: 'NOT_COMPARABLE',
  },
  {
    name: 'missing Google canonical is not comparable',
    user: value('https://www.evochia.gr/en/private-chef/'),
    google: absent,
    expected: 'NOT_COMPARABLE',
  },
];

for (const canonicalCase of canonicalCases) {
  test(`canonical match: ${canonicalCase.name}`, () => {
    assert.equal(
      canonicalMatch(canonicalCase.user, canonicalCase.google),
      canonicalCase.expected,
    );
  });
}

const inspectedSnapshot: InspectionSnapshot = {
  runId: 'run-2026-09-02-a',
  checkedAt: '2026-09-02T13:30:00.000Z',
  url: 'https://www.evochia.gr/en/private-chef/',
  outcome: 'INSPECTED',
  verdict: { state: 'VALUE', value: 'PASS' },
  coverageState: { state: 'NOT_RETURNED' },
  robotsTxtState: { state: 'VALUE', value: 'ALLOWED' },
  indexingState: { state: 'VALUE', value: 'INDEXING_ALLOWED' },
  pageFetchState: { state: 'VALUE', value: 'SUCCESSFUL' },
  crawledAs: { state: 'VALUE', value: 'MOBILE' },
  googleCanonical: { state: 'VALUE', value: 'https://www.evochia.gr/en/private-chef/' },
  userCanonical: { state: 'VALUE', value: 'https://www.evochia.gr/en/private-chef/' },
  canonicalMatch: 'MATCH',
  lastCrawlTime: { state: 'NOT_RETURNED' },
  sitemap: {
    state: 'VALUE',
    value: ['https://www.evochia.gr/sitemap.xml'],
  },
  referringUrls: { state: 'EMPTY' },
  inspectionResultLink: {
    state: 'VALUE',
    value: 'https://search.google.com/search-console/inspect?resource_id=test',
  },
};

const expectedHeaders = [
  'Checked At',
  'Run Id',
  'URL',
  'Outcome',
  'Verdict',
  'Coverage State',
  'Robots.txt State',
  'Indexing State',
  'Page Fetch State',
  'Crawled As',
  'Google Canonical',
  'User Canonical',
  'Canonical Match',
  'Last Crawl Time',
  'Sitemap',
  'Referring URLs',
  'Inspection Result Link',
  'Error Class',
  'Error Message',
];

test('flatten inspection snapshot preserves provider presence semantics in exact 19-column order', () => {
  const row = flattenInspectionSnapshot(inspectedSnapshot);

  assert.deepEqual(Object.keys(row), expectedHeaders);
  assert.equal(row['Checked At'], '2026-09-02T13:30:00.000Z');
  assert.equal(row['Run Id'], 'run-2026-09-02-a');
  assert.equal(row.URL, 'https://www.evochia.gr/en/private-chef/');
  assert.equal(row.Outcome, 'INSPECTED');
  assert.equal(row.Verdict, 'PASS');
  assert.equal(row['Coverage State'], 'NOT_RETURNED');
  assert.equal(row['Robots.txt State'], 'ALLOWED');
  assert.equal(row['Canonical Match'], 'MATCH');
  assert.equal(row['Last Crawl Time'], 'NOT_RETURNED');
  assert.equal(row.Sitemap, '["https://www.evochia.gr/sitemap.xml"]');
  assert.equal(row['Referring URLs'], '[]');
  assert.equal(row['Error Class'], '');
  assert.equal(row['Error Message'], '');
  assert.equal('persistedRows' in row, false);
});

test('flatten request failure leaves provider cells blank and is not comparable', () => {
  const failed: InspectionSnapshot = {
    runId: 'run-2026-09-02-a',
    checkedAt: '2026-09-02T13:30:00.000Z',
    url: 'https://www.evochia.gr/en/villa-private-chef/',
    outcome: 'REQUEST_FAILED',
    canonicalMatch: 'NOT_COMPARABLE',
    errorClass: 'PipelineError',
    errorMessage: 'gsc-url-inspection request failed with HTTP 429',
  };

  const row = flattenInspectionSnapshot(failed);

  assert.deepEqual(Object.keys(row), expectedHeaders);
  assert.equal(row.Outcome, 'REQUEST_FAILED');
  for (const providerHeader of [
    'Verdict',
    'Coverage State',
    'Robots.txt State',
    'Indexing State',
    'Page Fetch State',
    'Crawled As',
    'Google Canonical',
    'User Canonical',
    'Last Crawl Time',
    'Sitemap',
    'Referring URLs',
    'Inspection Result Link',
  ]) {
    assert.equal(row[providerHeader], '', `${providerHeader} must stay blank on request failure`);
  }
  assert.equal(row['Canonical Match'], 'NOT_COMPARABLE');
  assert.equal(row['Error Class'], 'PipelineError');
  assert.equal(row['Error Message'], 'gsc-url-inspection request failed with HTTP 429');
});

test('array flattening distinguishes VALUE, EMPTY, and NOT_RETURNED', () => {
  const cases: Array<{ field: ArrayField; expected: string }> = [
    { field: { state: 'VALUE', value: ['a', 'b'] }, expected: '["a","b"]' },
    { field: { state: 'EMPTY' }, expected: '[]' },
    { field: { state: 'NOT_RETURNED' }, expected: 'NOT_RETURNED' },
  ];

  for (const { field, expected } of cases) {
    const row = flattenInspectionSnapshot({
      ...inspectedSnapshot,
      sitemap: field,
    });
    assert.equal(row.Sitemap, expected);
  }
});
