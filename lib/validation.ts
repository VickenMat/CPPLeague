export type LeagueKey = 'A' | 'B' | 'C';

export function parseLeagueKey(value?: string | null): LeagueKey | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized === 'A' || normalized === 'B' || normalized === 'C'
    ? normalized
    : null;
}

export function parseNumericId(
  value: string | null | undefined,
  name: string,
  opts: { minLength?: number; maxLength?: number } = {},
) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`Missing ${name}`);
  if (!/^\d+$/.test(normalized)) throw new Error(`Invalid ${name}`);
  if (opts.minLength && normalized.length < opts.minLength) throw new Error(`Invalid ${name}`);
  if (opts.maxLength && normalized.length > opts.maxLength) throw new Error(`Invalid ${name}`);
  return normalized;
}

export function parseSeason(value: string | null | undefined, fallback?: string | null) {
  const normalized = (value || fallback || '').trim();
  if (!normalized) throw new Error('Missing season');
  if (!/^\d{4}$/.test(normalized)) throw new Error('Invalid season');

  const numeric = Number(normalized);
  if (numeric < 2010 || numeric > 2100) throw new Error('Invalid season');
  return normalized;
}

export function parseUserIdentifier(value: unknown) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error('Missing user');
  if (normalized.length > 100) throw new Error('Invalid user');
  if (!/^[\w .@-]+$/i.test(normalized)) throw new Error('Invalid user');
  return normalized;
}

export function parseSearchText(value: string | undefined) {
  return (value || '').trim().slice(0, 100);
}

export function parseSortOption(value: string | undefined) {
  return value === 'person' || value === 'abbrev' ? value : 'name';
}
