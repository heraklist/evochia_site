import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const middleware = readFileSync(ROOT + 'middleware.ts', 'utf8');

test('B0.5 diagnostic route is temporarily allowlisted by localized middleware', () => {
  assert.match(
    middleware,
    /const EN_ROUTES = new Set\(\[[\s\S]*?'\/en\/ga-b05-diagnostic\/'/,
    'the preview-only B0.5 route must bypass the localized 404 middleware',
  );
});
