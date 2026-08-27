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

export type CapabilityKey = 'workbook' | 'gsc' | 'ga4';

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

const CAPABILITY_RESOURCES: Record<CapabilityKey, readonly (keyof SeoConfig)[]> = {
  workbook: ['sheetId'],
  gsc: ['gscProperty'],
  ga4: ['ga4PropertyId', 'ga4PropertyTimeZone', 'productionHostname'],
};

function requiredResources(capabilities: readonly CapabilityKey[]): Set<keyof SeoConfig> {
  const required = new Set<keyof SeoConfig>();
  for (const capability of capabilities) {
    for (const key of CAPABILITY_RESOURCES[capability]) {
      required.add(key);
    }
  }
  return required;
}

export function verifyConfig(
  config: Partial<SeoConfig>,
  capabilities: readonly CapabilityKey[] = ['workbook'],
): VerificationResult {
  const errors: string[] = [];
  const required = requiredResources(capabilities);

  for (const key of required) {
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
    required.has('ga4PropertyTimeZone')
    && typeof config.ga4PropertyTimeZone === 'string'
    && config.ga4PropertyTimeZone !== 'UNVERIFIED'
    && !isValidIanaTimeZone(config.ga4PropertyTimeZone)
  ) {
    errors.push('ga4PropertyTimeZone must be a valid IANA timezone');
  }

  if (
    required.has('productionHostname')
    && typeof config.productionHostname === 'string'
    && config.productionHostname !== 'UNVERIFIED'
    && !isValidHostname(config.productionHostname)
  ) {
    errors.push('productionHostname must be a lowercase hostname without scheme, path, port, or trailing dot');
  }

  if (
    required.has('ga4PropertyId')
    && typeof config.ga4PropertyId === 'string'
    && config.ga4PropertyId !== 'UNVERIFIED'
    && !/^\d+$/.test(config.ga4PropertyId)
  ) {
    errors.push('ga4PropertyId must contain digits only');
  }

  return { ok: errors.length === 0, errors };
}

export function getConfig(
  capabilities: readonly CapabilityKey[] = ['workbook'],
): SeoConfig {
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

  const result = verifyConfig(parsed as Partial<SeoConfig>, capabilities);
  if (!result.ok) {
    throw new Error(`SEO configuration is not verified: ${result.errors.join('; ')}`);
  }

  return parsed as SeoConfig;
}
