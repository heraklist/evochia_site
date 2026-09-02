import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  fetchUrlInspection,
  MalformedInspectionResponse,
  type HttpResponseLike,
  type HttpTransport,
} from '../../../seo/apps-script/src/GscClient.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function response(body: unknown, status = 200): HttpResponseLike {
  return {
    getResponseCode: () => status,
    getContentText: () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function inspect(body: unknown) {
  const transport: HttpTransport = () => response(body);
  return fetchUrlInspection({
    siteUrl: 'https://www.evochia.gr/',
    inspectionUrl: 'https://www.evochia.gr/en/private-chef/',
    accessToken: 'test-token',
    inspectedAt: '2026-09-02T13:30:00.000Z',
    transport,
  });
}

test('URL Inspection rejects HTTP 200 bodies without inspectionResult', () => {
  assert.throws(
    () => inspect({}),
    (error: unknown) => error instanceof MalformedInspectionResponse
      && /inspectionResult is required/.test(error.message),
  );
});

test('URL Inspection rejects HTTP 200 bodies without indexStatusResult', () => {
  assert.throws(
    () => inspect({ inspectionResult: {} }),
    (error: unknown) => error instanceof MalformedInspectionResponse
      && /indexStatusResult is required/.test(error.message),
  );
});

test('an empty but structurally valid indexStatusResult is INSPECTED provider absence', () => {
  const result = inspect({ inspectionResult: { indexStatusResult: {} } });

  assert.deepEqual(result.verdict, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.coverageState, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.robotsTxtState, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.indexingState, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.pageFetchState, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.crawledAs, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.userCanonical, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.googleCanonical, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.lastCrawlTime, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.sitemap, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.referringUrls, { state: 'NOT_RETURNED' });
  assert.deepEqual(result.inspectionResultLink, { state: 'NOT_RETURNED' });
});

test('URL Inspection preserves sitemap singular, referring URL emptiness, crawledAs, and deep link', () => {
  const result = inspect({
    inspectionResult: {
      inspectionResultLink: 'https://search.google.com/search-console/inspect?resource_id=test',
      indexStatusResult: {
        verdict: 'PASS',
        coverageState: 'Submitted and indexed',
        robotsTxtState: 'ALLOWED',
        indexingState: 'INDEXING_ALLOWED',
        pageFetchState: 'SUCCESSFUL',
        crawledAs: 'MOBILE',
        googleCanonical: 'https://www.evochia.gr/en/private-chef/',
        userCanonical: 'https://www.evochia.gr/en/private-chef/',
        lastCrawlTime: '2026-08-31T08:30:00Z',
        sitemap: ['https://www.evochia.gr/sitemap.xml'],
        referringUrls: [],
      },
    },
  });

  assert.deepEqual(result.verdict, { state: 'VALUE', value: 'PASS' });
  assert.deepEqual(result.sitemap, {
    state: 'VALUE',
    value: ['https://www.evochia.gr/sitemap.xml'],
  });
  assert.deepEqual(result.referringUrls, { state: 'EMPTY' });
  assert.deepEqual(result.crawledAs, { state: 'VALUE', value: 'MOBILE' });
  assert.deepEqual(result.inspectionResultLink, {
    state: 'VALUE',
    value: 'https://search.google.com/search-console/inspect?resource_id=test',
  });
});

test('present non-array inspection arrays are malformed rather than coerced', () => {
  assert.throws(
    () => inspect({
      inspectionResult: {
        indexStatusResult: {
          sitemap: 'https://www.evochia.gr/sitemap.xml',
        },
      },
    }),
    (error: unknown) => error instanceof MalformedInspectionResponse
      && /sitemap must be an array/.test(error.message),
  );
});

test('present non-string scalar inspection fields are malformed rather than coerced', () => {
  for (const verdict of [null, 42, { value: 'PASS' }, ['PASS']]) {
    assert.throws(
      () => inspect({
        inspectionResult: {
          indexStatusResult: { verdict },
        },
      }),
      (error: unknown) => error instanceof MalformedInspectionResponse
        && /verdict must be a string/.test(error.message),
    );
  }
});

test('API-facing URL Inspection source uses sitemap singular and never provider property sitemaps', () => {
  const sourcePath = path.join(repoRoot, 'seo/apps-script/src/GscClient.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.match(source, /\bsitemap\b/);
  assert.doesNotMatch(source, /\bsitemaps\b/);
});
