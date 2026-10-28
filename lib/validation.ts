export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export function singleParam(params: URLSearchParams, name: string) {
  const values = params.getAll(name);
  if (values.length > 1) throw new InputError(`Invalid duplicate ${name}`);
  return values[0] ?? null;
}

export function parseInteger(
  value: string | null,
  name: string,
  min: number,
  max: number,
  fallback?: number,
) {
  if (value === null && fallback !== undefined) return fallback;
  if (!value || !/^\d+$/.test(value)) throw new InputError(`Invalid ${name}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max)
    throw new InputError(`Invalid ${name}`);
  return number;
}

export function parseNumericId(
  value: string | null | undefined,
  name: string,
  opts: { minLength?: number; maxLength?: number } = {},
) {
  const normalized = value?.trim();
  if (!normalized) throw new InputError(`Missing ${name}`);
  if (!/^\d+$/.test(normalized)) throw new InputError(`Invalid ${name}`);
  if (opts.minLength && normalized.length < opts.minLength)
    throw new InputError(`Invalid ${name}`);
  if (opts.maxLength && normalized.length > opts.maxLength)
    throw new InputError(`Invalid ${name}`);
  return normalized;
}

export function parseSeason(
  value: string | null | undefined,
  fallback?: string | null,
) {
  const normalized = (value ?? fallback ?? "").trim();
  if (!normalized) throw new InputError("Missing season");
  if (!/^\d{4}$/.test(normalized)) throw new InputError("Invalid season");

  const numeric = Number(normalized);
  if (numeric < 2010 || numeric > 2100) throw new InputError("Invalid season");
  return normalized;
}

export function parseSearchText(value: string | undefined) {
  return (value || "").trim().slice(0, 100);
}

export function parseSortOption(value: string | undefined) {
  return value === "person" || value === "abbrev" ? value : "name";
}
