import { isValidHostname, isValidIanaTimeZone } from './RuntimeCompat.ts';

export const CONFIG_PROPERTY_KEY = 'SEO_GOOGLE_RESOURCES_JSON';

export const RESOURCE_KEYS = [
  'gscProperty',
  'ga4AccountId',
  'ga4PropertyId',
  'ga4PropertyTimeZone',
  'productionHostname',
  'gtmPublicContainerId',
  'gtmAccountId',
  'gtmContainerId',
  'sheetId',
  'driveFolderId',
] as const;

export interface SeoConfig {
  gscProperty: string;
  ga4AccountId: string;
  ga4PropertyId: string;
  ga4PropertyTimeZone: string;
  productionHostname: string;
  gtmPublicContainerId: string;
  gtmAccountId: string;
  gtmContainerId: string;
  sheetId: string;
  driveFolderId: string;
  ownerEmail: string;
  verificationStatus: 'pending' | 'verified';
}

export interface VerificationResult {
  ok: boolean;
  errors: string[];
}

export function verifyConfig(config: Partial<SeoConfig>): VerificationResult {
  const errors: string[] = [];

  for (const key of RESOURCE_KEYS) {
    const value = config[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key} is required`);
    } else if (value === 'UNVERIFIED') {
      errors.push(`${key} is unverified`);
    }
  }

  if (config.ownerEmail !== 'heraklis@evochia.gr') {
    errors.push('ownerEmail must be heraklis@evochia.gr');
  }

  if (config.verificationStatus !== 'verified') {
    errors.push('verificationStatus must be verified');
  }

  if (
    typeof config.ga4PropertyTimeZone === 'string'
    && config.ga4PropertyTimeZone !== 'UNVERIFIED'
    && !isValidIanaTimeZone(config.ga4PropertyTimeZone)
  ) {
    errors.push('ga4PropertyTimeZone must be a valid IANA timezone');
  }

  if (
    typeof config.productionHostname === 'string'
    && config.productionHostname !== 'UNVERIFIED'
    && !isValidHostname(config.productionHostname)
  ) {
    errors.push('productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot');
  }

  if (
    typeof config.gtmPublicContainerId === 'string'
    && config.gtmPublicContainerId !== 'UNVERIFIED'
    && !/^GTM-[A-Z0-9]+$/.test(config.gtmPublicContainerId)
  ) {
    errors.push('gtmPublicContainerId has an invalid format');
  }

  for (const key of ['ga4AccountId', 'ga4PropertyId', 'gtmAccountId', 'gtmContainerId'] as const) {
    const value = config[key];
    if (typeof value === 'string' && value !== 'UNVERIFIED' && !/^\d+$/.test(value)) {
      errors.push(`${key} must contain digits only`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function getConfig(): SeoConfig {
  const raw = PropertiesService.getScriptProperties().getProperty(CONFIG_PROPERTY_KEY);
  if (!raw) {
    throw new Error(`Missing Script Property: ${CONFIG_PROPERTY_KEY}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${CONFIG_PROPERTY_KEY}: ${String(error)}`);
  }

  const result = verifyConfig(parsed as Partial<SeoConfig>);
  if (!result.ok) {
    throw new Error(`SEO configuration is not verified: ${result.errors.join('; ')}`);
  }

  return parsed as SeoConfig;
}
