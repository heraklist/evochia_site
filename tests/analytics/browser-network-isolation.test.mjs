import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../../playwright.config.mjs';

test('Chromium sends nonlocal traffic to a dead proxy and denies external DNS and WebRTC UDP', () => {
  const args = config.projects[0].use.launchOptions.args;

  assert.deepEqual(args, [
    '--disable-blink-features=AutomationControlled',
    '--proxy-server=http://127.0.0.1:9',
    '--proxy-bypass-list=<-loopback>;127.0.0.1;www.evochia.gr',
    '--host-resolver-rules=MAP www.evochia.gr 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  ]);
});
