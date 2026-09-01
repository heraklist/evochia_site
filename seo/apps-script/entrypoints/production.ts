import { runDailyImport as runDailyImportJob } from '../src/Jobs.ts';
import {
  onOpen,
  runRangeImportFromMenu,
  setupWorkbookFromMenu,
  verifyConfiguration,
} from '../src/Menu.ts';

// Register the bundled implementations on a private, collision-resistant global
// registry. esbuild wraps this module in an IIFE, so these imports are invisible
// to Apps Script's static function discovery. The canonical build appends
// matching top-level wrappers OUTSIDE the IIFE that delegate to this registry.
// The registry key here MUST match ENTRYPOINT_REGISTRY_GLOBAL in build.mjs.
type AppsScriptEntrypoint = (...args: unknown[]) => unknown;
type EntrypointRegistry = Record<string, AppsScriptEntrypoint>;
type RegistryHost = typeof globalThis & {
  __evochiaAppsScriptEntrypoints__?: EntrypointRegistry;
};

function runDailyImport(): unknown {
  return runDailyImportJob();
}

const host = globalThis as RegistryHost;
const registry: EntrypointRegistry = host.__evochiaAppsScriptEntrypoints__ || {};
host.__evochiaAppsScriptEntrypoints__ = registry;
registry.onOpen = onOpen;
registry.setupWorkbookFromMenu = setupWorkbookFromMenu;
registry.verifyConfiguration = verifyConfiguration;
registry.runDailyImport = runDailyImport;
registry.runRangeImportFromMenu = runRangeImportFromMenu;
