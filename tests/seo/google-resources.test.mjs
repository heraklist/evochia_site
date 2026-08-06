import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const expectedKeys = [
  'gscProperty',
  'ga4AccountId',
  'ga4PropertyId',
  'gtmPublicContainerId',
  'gtmAccountId',
  'gtmContainerId',
  'sheetId',
  'driveFolderId',
  'ownerEmail',
  'verificationStatus',
];

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function validate(config) {
  const unresolved = [
    'gtmAccountId',
    'gtmContainerId',
    'sheetId',
    'driveFolderId',
  ].filter((key) => config[key] === 'UNVERIFIED');

  return expectedKeys.every((key) => Object.hasOwn(config, key))
    && ['pending', 'verified'].includes(config.verificationStatus)
    && !(config.verificationStatus === 'verified' && unresolved.length > 0);
}

test('example records the approved provisional Google resources', () => {
  const config = readJson('seo/config/google-resources.example.json');
  assert.deepEqual(config, {
    gscProperty: 'sc-domain:evochia.gr',
    ga4AccountId: '388030118',
    ga4PropertyId: '528945896',
    gtmPublicContainerId: 'GTM-578JXRXS',
    gtmAccountId: 'UNVERIFIED',
    gtmContainerId: 'UNVERIFIED',
    sheetId: 'UNVERIFIED',
    driveFolderId: 'UNVERIFIED',
    ownerEmail: 'heraklis@evochia.gr',
    verificationStatus: 'pending',
  });
  assert.equal(validate(config), true);
});

test('verified status is invalid while a production identifier is unresolved', () => {
  const config = readJson('seo/config/google-resources.example.json');
  assert.equal(validate({ ...config, verificationStatus: 'verified' }), false);
});

test('schema encodes the verified-without-UNVERIFIED invariant', () => {
  const schema = readJson('seo/schemas/google-resources.schema.json');
  assert.deepEqual(schema.required, expectedKeys);
  assert.equal(schema.properties.verificationStatus.enum.includes('verified'), true);
  assert.equal(Array.isArray(schema.allOf), true);
  assert.equal(schema.allOf.length > 0, true);
});
