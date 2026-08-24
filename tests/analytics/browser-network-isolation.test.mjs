import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { BROWSER_NETWORK_POLICY_ARGS } from './browser-network-policy.mjs';

test('Chromium network policy sends nonlocal traffic to a dead proxy and denies external DNS and WebRTC UDP', () => {
  assert.deepEqual(BROWSER_NETWORK_POLICY_ARGS, [
    '--disable-blink-features=AutomationControlled',
    '--proxy-server=http://127.0.0.1:9',
    '--proxy-bypass-list=<-loopback>;127.0.0.1;www.evochia.gr',
    '--host-resolver-rules=MAP www.evochia.gr 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  ]);
});

test('Playwright config applies the dependency-free Chromium network policy', async () => {
  const configSource = await readFile(new URL('../../playwright.config.mjs', import.meta.url), 'utf8');

  assert.match(
    configSource,
    /import \{ BROWSER_NETWORK_POLICY_ARGS \} from '\.\/tests\/analytics\/browser-network-policy\.mjs';/,
  );
  assert.match(configSource, /launchOptions:\s*\{\s*args: BROWSER_NETWORK_POLICY_ARGS,\s*\}/);
});
