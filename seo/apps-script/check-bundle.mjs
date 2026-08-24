import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppsScript } from './build.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_FILES = [
  'generated/Code.gs',
  'generated/appsscript.json',
  'generated-smoke/Code.gs',
  'generated-smoke/appsscript.json',
];
const CREDENTIAL_MARKERS = [
  'ya29.',
  '1//',
  '-----BEGIN PRIVATE KEY-----',
];

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function rejectModuleSyntax(relativePath, text) {
  if (/^\s*(?:import|export)\s/m.test(text)) {
    throw new Error(`unresolved module syntax: ${relativePath}`);
  }
}

function rejectCredentials(relativePath, text) {
  for (const marker of CREDENTIAL_MARKERS) {
    if (text.includes(marker)) {
      throw new Error(`credential-like content in generated artifact: ${relativePath}`);
    }
  }
}

async function verifyGeneratedSafety(committedRoot) {
  for (const relativePath of GENERATED_FILES) {
    const text = await readFile(path.join(committedRoot, relativePath), 'utf8');
    rejectModuleSyntax(relativePath, text);
    rejectCredentials(relativePath, text);
  }

  const production = await readFile(path.join(committedRoot, 'generated/Code.gs'), 'utf8');
  if (production.includes('runRuntimeSmoke')) {
    throw new Error('smoke entrypoint leaked into production artifact: generated/Code.gs');
  }

  for (const root of [SCRIPT_DIR, committedRoot]) {
    if (existsSync(path.join(root, '.clasp.json'))) {
      throw new Error(`real clasp configuration must not be committed: ${path.join(root, '.clasp.json')}`);
    }
  }
}

export async function checkBundleEquivalence(committedRoot = SCRIPT_DIR) {
  const buildRoot = await mkdtemp(path.join(os.tmpdir(), 'evochia-apps-script-build-'));
  try {
    await verifyGeneratedSafety(committedRoot);
    await buildAppsScript(buildRoot);

    for (const relativePath of GENERATED_FILES) {
      const committed = await readFile(path.join(committedRoot, relativePath));
      const fresh = await readFile(path.join(buildRoot, relativePath));
      if (!committed.equals(fresh)) {
        throw new Error(`bundle mismatch: ${relativePath}`);
      }
    }

    await verifyGeneratedSafety(buildRoot);
  } finally {
    await rm(buildRoot, { recursive: true, force: true });
  }
}

const committedRoot = argumentValue('--committed-root')
  ? path.resolve(argumentValue('--committed-root'))
  : SCRIPT_DIR;

try {
  await checkBundleEquivalence(committedRoot);
  console.log('Apps Script committed bundles match a clean deterministic build.');
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
