import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_HEADER = '// GENERATED FILE — DO NOT EDIT. Run: npm run seo:build:apps-script\n';

const TARGETS = [
  {
    entry: 'entrypoints/production.ts',
    outputDirectory: 'generated',
    outputFile: 'Code.gs',
  },
  {
    entry: 'entrypoints/smoke.ts',
    outputDirectory: 'generated-smoke',
    outputFile: 'Code.gs',
  },
];

const SMOKE_MANIFEST = {
  timeZone: 'Europe/Athens',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
};

async function bundle(entryPath) {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: ['es2019'],
    treeShaking: true,
    legalComments: 'none',
    charset: 'utf8',
    minify: false,
  });

  if (result.outputFiles.length !== 1) {
    throw new Error(`Expected one esbuild output file, got ${result.outputFiles.length}`);
  }
  return GENERATED_HEADER + result.outputFiles[0].text;
}

export async function buildAppsScript(outputRoot = SCRIPT_DIR) {
  for (const target of TARGETS) {
    const directory = path.join(outputRoot, target.outputDirectory);
    await mkdir(directory, { recursive: true });
    const code = await bundle(path.join(SCRIPT_DIR, target.entry));
    await writeFile(path.join(directory, target.outputFile), code, 'utf8');
  }

  const productionManifest = await readFile(path.join(SCRIPT_DIR, 'appsscript.json'), 'utf8');
  await writeFile(
    path.join(outputRoot, 'generated', 'appsscript.json'),
    productionManifest,
    'utf8',
  );
  await writeFile(
    path.join(outputRoot, 'generated-smoke', 'appsscript.json'),
    `${JSON.stringify(SMOKE_MANIFEST, null, 2)}\n`,
    'utf8',
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && pathToFileURL(invokedPath).href === import.meta.url) {
  await buildAppsScript();
}
