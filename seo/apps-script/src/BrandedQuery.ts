export const BRAND_SEEDS = ['evochia', 'ευωχια'] as const;
export const BRAND_ALIASES: readonly string[] = [];

export function normalizeBrandText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff]+/g, '');
}

export function isBrandedQuery(
  query: string,
  aliases: readonly string[] = BRAND_ALIASES,
): boolean {
  const normalizedQuery = normalizeBrandText(query);
  const candidates = [...BRAND_SEEDS, ...aliases]
    .map(normalizeBrandText)
    .filter((value) => value.length > 0);

  return candidates.some((candidate) => normalizedQuery.includes(candidate));
}
