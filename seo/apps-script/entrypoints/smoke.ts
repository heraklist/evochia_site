import { runRuntimeSmoke } from '../smoke/RuntimeSmoke.ts';

type SmokeGlobals = typeof globalThis & {
  runRuntimeSmoke?: typeof runRuntimeSmoke;
};

const gas = globalThis as SmokeGlobals;
gas.runRuntimeSmoke = runRuntimeSmoke;
