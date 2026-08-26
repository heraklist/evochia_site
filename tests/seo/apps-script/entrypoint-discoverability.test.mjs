import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Apps Script discovers callable functions by statically scanning the script
// file for genuine top-level `function <name>(...)` declarations. Functions
// enclosed inside the esbuild IIFE (`(() => { ... })();`) are invisible to that
// discovery, so the editor reports "No functions" and Run/Debug stay disabled.
// These contracts therefore require a REAL top-level declaration for every
// callable entrypoint — not merely the presence of the identifier somewhere in
// the bundle (which a `globalThis` assignment or a nested declaration satisfies).

const production = () => readFileSync('seo/apps-script/generated/Code.gs', 'utf8');
const smoke = () => readFileSync('seo/apps-script/generated-smoke/Code.gs', 'utf8');

const SMOKE_ENTRYPOINTS = ['runRuntimeSmoke'];
const PRODUCTION_ENTRYPOINTS = ['onOpen', 'setupWorkbookFromMenu', 'verifyConfiguration'];

// esbuild indents every statement inside the IIFE by at least two spaces, so a
// declaration anchored at column zero (`^function name(`) is, by construction,
// outside the closure. We capture the byte offset of each match to also assert
// positional order relative to the IIFE terminator.
function topLevelFunctionDeclarations(code) {
  const pattern = /^function ([A-Za-z_$][\w$]*)\s*\(/gm;
  const declarations = new Map();
  let match;
  while ((match = pattern.exec(code)) !== null) {
    if (!declarations.has(match[1])) {
      declarations.set(match[1], match.index);
    }
  }
  return declarations;
}

// The IIFE is emitted as a single `})();` line at column zero; nothing inside
// the closure is anchored at column zero, so this is the unique terminator.
function iifeTerminatorIndex(code) {
  const match = /^\}\)\(\);\s*$/m.exec(code);
  return match ? match.index : -1;
}

test('smoke bundle declares runRuntimeSmoke as a genuine top-level function', () => {
  const declarations = topLevelFunctionDeclarations(smoke());
  for (const name of SMOKE_ENTRYPOINTS) {
    assert.ok(
      declarations.has(name),
      `generated-smoke/Code.gs must declare a top-level "function ${name}(" that Apps Script can discover`,
    );
  }
});

test('production bundle declares every callable entrypoint as a genuine top-level function', () => {
  const declarations = topLevelFunctionDeclarations(production());
  for (const name of PRODUCTION_ENTRYPOINTS) {
    assert.ok(
      declarations.has(name),
      `generated/Code.gs must declare a top-level "function ${name}(" that Apps Script can discover`,
    );
  }
});

test('top-level entrypoint declarations are emitted outside the esbuild IIFE', () => {
  for (const [relativePath, code, names] of [
    ['generated-smoke/Code.gs', smoke(), SMOKE_ENTRYPOINTS],
    ['generated/Code.gs', production(), PRODUCTION_ENTRYPOINTS],
  ]) {
    const terminator = iifeTerminatorIndex(code);
    assert.notEqual(terminator, -1, `${relativePath} must contain the IIFE terminator "})();"`);
    const declarations = topLevelFunctionDeclarations(code);
    for (const name of names) {
      const offset = declarations.get(name);
      assert.ok(
        offset !== undefined && offset > terminator,
        `${relativePath} must declare "function ${name}(" after the IIFE closes (a nested declaration is not discoverable)`,
      );
    }
  }
});

test('production bundle does not expose the smoke entrypoint at top level', () => {
  const declarations = topLevelFunctionDeclarations(production());
  assert.ok(
    !declarations.has('runRuntimeSmoke'),
    'generated/Code.gs must not expose runRuntimeSmoke as a callable Apps Script function',
  );
});

test('smoke bundle does not expose production entrypoints at top level', () => {
  const declarations = topLevelFunctionDeclarations(smoke());
  for (const name of PRODUCTION_ENTRYPOINTS) {
    assert.ok(
      !declarations.has(name),
      `generated-smoke/Code.gs must not expose the production entrypoint ${name} as a callable Apps Script function`,
    );
  }
});

test('top-level entrypoints delegate rather than recurse into themselves', () => {
  // The discoverable wrapper must forward into the bundled implementation, never
  // call itself (which would be unbounded recursion once the closure is gone).
  for (const [relativePath, code, names] of [
    ['generated-smoke/Code.gs', smoke(), SMOKE_ENTRYPOINTS],
    ['generated/Code.gs', production(), PRODUCTION_ENTRYPOINTS],
  ]) {
    for (const name of names) {
      const body = new RegExp(`^function ${name}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(code);
      assert.ok(body, `${relativePath} must contain a top-level body for ${name}`);
      assert.doesNotMatch(
        body[1],
        new RegExp(`\\b${name}\\s*\\(`),
        `${relativePath} wrapper for ${name} must delegate, not call itself`,
      );
    }
  }
});

test('discoverable smoke wrapper delegates to the bundled implementation and returns its result', () => {
  // Evaluate the committed smoke bundle exactly as Apps Script would (the whole
  // file runs, then the top-level function is invoked), proving the top-level
  // wrapper resolves through the private registry into the real implementation
  // and returns its value. Guards against registry-key drift and self-recursion
  // that a purely textual check could miss. The smoke path uses only synthetic
  // transports, so no real Apps Script service is required.
  const context = vm.createContext({ console: { log() {} } });
  vm.runInContext(smoke(), context, { filename: 'generated-smoke/Code.gs' });

  assert.equal(
    typeof vm.runInContext('typeof runRuntimeSmoke', context),
    'string',
  );
  assert.equal(
    vm.runInContext('typeof runRuntimeSmoke', context),
    'function',
    'runRuntimeSmoke must be callable in the global scope after the file evaluates',
  );

  const result = vm.runInContext('runRuntimeSmoke()', context);
  assert.equal(result.ok, true, 'the delegated smoke run must succeed');
  assert.ok(Array.isArray(result.checks) && result.checks.length > 0, 'smoke must return its checks');
  assert.ok(
    result.checks.every((entry) => entry.ok === true),
    `every smoke check must pass: ${JSON.stringify(result.checks.filter((entry) => !entry.ok))}`,
  );
});

test('generated bundles remain free of ES module syntax', () => {
  for (const [relativePath, code] of [
    ['generated/Code.gs', production()],
    ['generated-smoke/Code.gs', smoke()],
  ]) {
    assert.doesNotMatch(code, /^\s*(?:import|export)\s/m, `${relativePath} must not contain module syntax`);
  }
});
