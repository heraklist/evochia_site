import { onOpen, setupWorkbookFromMenu, verifyConfiguration } from '../src/Menu.ts';

type GasGlobals = typeof globalThis & {
  onOpen?: typeof onOpen;
  setupWorkbookFromMenu?: typeof setupWorkbookFromMenu;
  verifyConfiguration?: typeof verifyConfiguration;
};

const gas = globalThis as GasGlobals;
gas.onOpen = onOpen;
gas.setupWorkbookFromMenu = setupWorkbookFromMenu;
gas.verifyConfiguration = verifyConfiguration;
