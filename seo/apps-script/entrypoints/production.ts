import { onOpen, setupWorkbookFromMenu, verifyConfiguration } from '../src/Menu.ts';

// Register the bundled implementations on a private, collision-resistant global
// registry. esbuild wraps this module in an IIFE, so the imports above are
// invisible to Apps Script's static function discovery. The canonical build
// (seo/apps-script/build.mjs) appends matching top-level `function onOpen()`,
// `function setupWorkbookFromMenu()`, and `function verifyConfiguration()`
// wrappers OUTSIDE the IIFE that delegate back to these registry entries,
// giving Apps Script discoverable simple-trigger and menu callbacks.
// The registry key here MUST match ENTRYPOINT_REGISTRY_GLOBAL in build.mjs.
type AppsScriptEntrypoint = (...args: unknown[]) => unknown;
type EntrypointRegistry = Record<string, AppsScriptEntrypoint>;
type RegistryHost = typeof globalThis & {
  __evochiaAppsScriptEntrypoints__?: EntrypointRegistry;
};

const host = globalThis as RegistryHost;
const registry: EntrypointRegistry = host.__evochiaAppsScriptEntrypoints__ || {};
host.__evochiaAppsScriptEntrypoints__ = registry;
registry.onOpen = onOpen;
registry.setupWorkbookFromMenu = setupWorkbookFromMenu;
registry.verifyConfiguration = verifyConfiguration;
