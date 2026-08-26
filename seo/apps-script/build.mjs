import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_HEADER = '// GENERATED FILE — DO NOT EDIT. Run: npm run seo:build:apps-script\n';

// Private, collision-resistant global registry the bundled entrypoints populate
// from inside the IIFE. MUST match the key used in entrypoints/*.ts.
const ENTRYPOINT_REGISTRY_GLOBAL = '__evochiaAppsScriptEntrypoints__';

const TARGETS = [
  {
    entry: 'entrypoints/production.ts',
    outputDirectory: 'generated',
    outputFile: 'Code.gs',
    // Callable Apps Script functions this bundle must expose at top level.
    entrypoints: ['onOpen', 'setupWorkbookFromMenu', 'verifyConfiguration'],
  },
  {
    entry: 'entrypoints/smoke.ts',
    outputDirectory: 'generated-smoke',
    outputFile: 'Code.gs',
    entrypoints: ['runRuntimeSmoke'],
  },
];

// esbuild's `iife` format encloses every declaration inside `(() => { ... })();`,
// which Apps Script's static function discovery cannot see. We append genuine
// top-level `function` declarations OUTSIDE that closure, one per entrypoint,
// each forwarding its arguments and return value to the implementation the
// bundle registered on the private global registry. Because Apps Script
// re-evaluates the whole script file on every invocation, the IIFE runs (and
// populates the registry) before any wrapper is called.
function entrypointFooter(entrypoints) {
  return entrypoints
    .map(
      (name) =>
        `function ${name}() {\n` +
        `  return globalThis.${ENTRYPOINT_REGISTRY_GLOBAL}.${name}.apply(this, arguments);\n` +
        `}`,
    )
    .join('\n');
}

const SMOKE_MANIFEST = {
  timeZone: 'Europe/Athens',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
};

async function bundle(entryPath, entrypoints) {
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
    footer: { js: entrypointFooter(entrypoints) },
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
    const code = await bundle(path.join(SCRIPT_DIR, target.entry), target.entrypoints);
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
