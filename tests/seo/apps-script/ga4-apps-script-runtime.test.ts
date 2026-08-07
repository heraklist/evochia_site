import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyUrlQuality } from '../../../seo/apps-script/src/Ga4Importer.ts';

test('URL quality classification works without browser URLSearchParams', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'URLSearchParams');

  try {
    Object.defineProperty(globalThis, 'URLSearchParams', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    assert.deepEqual(
      classifyUrlQuality(
        'www.evochia.gr',
        '/en/private-chef/?utm_source=instagram',
        'www.evochia.gr',
      ),
      {
        normalizedPagePath: '/en/private-chef/',
        anomalyTypes: ['tracking_query_params'],
      },
    );
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'URLSearchParams', descriptor);
    } else {
      delete (globalThis as Record<string, unknown>).URLSearchParams;
    }
  }
});
