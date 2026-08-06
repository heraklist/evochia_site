import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('repository defines reproducible SEO scripts', () => {
  assert.equal(pkg.engines.node, '>=22');
  assert.ok(pkg.scripts.typecheck);
  assert.ok(pkg.scripts['test:unit']);
  assert.ok(pkg.scripts['seo:test:apps-script']);
  assert.ok(fs.existsSync('package-lock.json'));
  assert.ok(fs.existsSync('tsconfig.json'));
});
