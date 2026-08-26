import { runRuntimeSmoke } from '../smoke/RuntimeSmoke.ts';

// Register the bundled implementation on a private, collision-resistant global
// registry. esbuild wraps this module in an IIFE, so the declaration above is
// invisible to Apps Script's static function discovery. The canonical build
// (seo/apps-script/build.mjs) appends a matching top-level `function
// runRuntimeSmoke()` wrapper OUTSIDE the IIFE that delegates back to this
// registry entry, giving Apps Script a discoverable, callable entrypoint.
// The registry key here MUST match ENTRYPOINT_REGISTRY_GLOBAL in build.mjs.
type AppsScriptEntrypoint = (...args: unknown[]) => unknown;
type EntrypointRegistry = Record<string, AppsScriptEntrypoint>;
type RegistryHost = typeof globalThis & {
  __evochiaAppsScriptEntrypoints__?: EntrypointRegistry;
};

const host = globalThis as RegistryHost;
const registry: EntrypointRegistry = host.__evochiaAppsScriptEntrypoints__ || {};
host.__evochiaAppsScriptEntrypoints__ = registry;
registry.runRuntimeSmoke = runRuntimeSmoke;
