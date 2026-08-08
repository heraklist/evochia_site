import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const GAS_TSCONFIG = 'seo/apps-script/tsconfig.gas.json';

test('GAS TypeScript config excludes browser DOM libraries', () => {
  const config = JSON.parse(readFileSync(GAS_TSCONFIG, 'utf8'));
  assert.deepEqual(config.compilerOptions.lib, ['ES2022', 'ES2022.Intl']);
  assert.deepEqual(config.compilerOptions.types, ['google-apps-script']);
  assert.equal(config.compilerOptions.strict, true);
  assert.deepEqual(config.include, ['src/**/*.ts', 'entrypoints/**/*.ts', 'smoke/**/*.ts']);
});

test('GAS typecheck rejects browser-only URLSearchParams', () => {
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      '--noEmit',
      '--strict',
      '--target', 'ES2022',
      '--module', 'NodeNext',
      '--moduleResolution', 'NodeNext',
      '--lib', 'ES2022,ES2022.Intl',
      '--types', 'google-apps-script',
      '--allowImportingTsExtensions',
      'tests/seo/fixtures/gas-browser-global.ts',
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /URLSearchParams/);
});
