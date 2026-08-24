export const BROWSER_NETWORK_POLICY_ARGS = Object.freeze([
  '--disable-blink-features=AutomationControlled',
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>;127.0.0.1;www.evochia.gr',
  '--host-resolver-rules=MAP www.evochia.gr 127.0.0.1, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
]);
