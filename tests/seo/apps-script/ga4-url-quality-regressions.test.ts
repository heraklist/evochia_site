import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyPagePath,
  classifyUrlQuality,
} from '../../../seo/apps-script/src/Ga4Importer.ts';

test('common Google attribution and linker params are tracking, not unexpected', () => {
  const params = [
    'gad_source=1',
    '_gl=1*abc',
    'srsltid=AfmBOoo123',
    'gclsrc=aw.ds',
    'dclid=example123',
  ];

  for (const query of params) {
    assert.deepEqual(
      classifyUrlQuality(
        'www.evochia.gr',
        `/en/private-chef/?${query}`,
        'www.evochia.gr',
      ),
      {
        normalizedPagePath: '/en/private-chef/',
        anomalyTypes: ['tracking_query_params'],
      },
      query,
    );
  }
});

test('404 classification does not swallow ordinary paths with a 404 prefix', () => {
  assert.deepEqual(
    classifyPagePath('/en/404/'),
    { language: 'en', service: 'not_found' },
  );
  assert.deepEqual(
    classifyPagePath('/en/404-guide/'),
    { language: 'en', service: 'other' },
  );
});
