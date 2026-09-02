export const MAX_INSPECTION_URLS = 25;

export const APPROVED_MONITORED_PATHS = [
  '/en/private-chef/',
  '/en/villa-private-chef/',
  '/en/yacht-private-chef/',
  '/en/athens-private-chef/',
  '/en/greek-islands-private-chef/',
  '/el/private-chef/',
  '/el/villa-private-chef/',
  '/el/yacht-private-chef/',
  '/el/athens-private-chef/',
  '/el/greek-islands-private-chef/',
  '/en/catering/',
  '/en/wedding-catering/',
  '/en/corporate-catering/',
  '/el/catering/',
  '/el/wedding-catering/',
  '/el/corporate-catering/',
] as const;

export function expectedMonitoredUrls(productionHostname: string): string[] {
  return APPROVED_MONITORED_PATHS.map((path) => `https://${productionHostname}${path}`);
}
