import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  fetchUrlInspection,
  MalformedInspectionResponse,
  PipelineError,
  type HttpResponseLike,
  type HttpTransport,
} from '../../../seo/apps-script/src/GscClient.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const clientSourcePath = path.join(repoRoot, 'seo/apps-script/src/GscClient.ts');

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

test('UrlInspectionRequest requires one caller-owned inspectedAt timestamp', () => {
  const source = fs.readFileSync(clientSourcePath, 'utf8');
  const requestInterface = /export interface UrlInspectionRequest[\s\S]*?\n}/.exec(source)?.[0] ?? '';

  assert.match(requestInterface, /\binspectedAt:\s*string;/);
  assert.doesNotMatch(requestInterface, /\binspectedAt\?:/);
  assert.doesNotMatch(source, /request\.inspectedAt\s*\?\?/);
});

test('URL Inspection preserves typed non-2xx pipeline diagnostics', () => {
  const transport: HttpTransport = () => response('{"error":"quota"}', 429);

  assert.throws(
    () => fetchUrlInspection({
      siteUrl: 'https://www.evochia.gr/',
      inspectionUrl: 'https://www.evochia.gr/en/private-chef/',
      accessToken: 'test-token',
      inspectedAt: '2026-09-02T13:30:00.000Z',
      transport,
    }),
    (error: unknown) => error instanceof PipelineError
      && error.source === 'gsc-url-inspection'
      && error.status === 429
      && error.responseBody === '{"error":"quota"}',
  );
});

test('URL Inspection rejects HTTP 200 bodies without inspectionResult', () => {
  assert.throws(
    () => inspect({}),
    (error: unknown) => error instanceof MalformedInspectionResponse
      && /inspectionResult is required/.test(error.message),
  );
});

test('URL Inspection diagnoses a present non-object inspectionResult at the correct level', () => {
  for (const inspectionResult of [null, []]) {
    assert.throws(
      () => inspect({ inspectionResult }),
      (error: unknown) => error instanceof MalformedInspectionResponse
        && /inspectionResult must be an object/.test(error.message),
    );
  }
});

test('URL Inspection rejects HTTP 200 bodies without indexStatusResult', () => {
  assert.throws(
    () => inspect({ inspectionResult: {} }),
    (error: unknown) => error instanceof MalformedInspectionResponse
      && /indexStatusResult is required/.test(error.message),
  );
});

test('URL Inspection diagnoses a present non-object indexStatusResult', () => {
  assert.throws(
    () => inspect({ inspectionResult: { indexStatusResult: null } }),
    (error: unknown) => error instanceof MalformedInspectionResponse
      && /indexStatusResult must be an object/.test(error.message),
  );
});

test('malformed URL Inspection JSON remains a distinct SyntaxError for snapshot error mapping', () => {
  assert.throws(
    () => inspect('{"inspectionResult":'),
    (error: unknown) => error instanceof SyntaxError,
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
  const source = fs.readFileSync(clientSourcePath, 'utf8');

  assert.match(source, /\bsitemap\b/);
  assert.doesNotMatch(source, /\bsitemaps\b/);
});
