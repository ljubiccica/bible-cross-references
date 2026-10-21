/**
 * Number formatting, in the reader's language.
 *
 * A Brazilian reads 344.799 where an English speaker reads 344,799, so the separators follow the
 * interface language rather than being fixed. The formatters are built once per language and
 * kept: `Intl.NumberFormat` is expensive to construct and these run on every frame of the stats
 * line. The default is English so that code outside the app — the data pipeline, the debug
 * page — needs no locale to format a count.
 */

interface Formatters {
  readonly integer: Intl.NumberFormat;
  readonly decimal: Intl.NumberFormat;
  readonly percent: Intl.NumberFormat;
}

const cache = new Map<string, Formatters>();

function formatters(tag: string): Formatters {
  const existing = cache.get(tag);
  if (existing) {
    return existing;
  }
  const built: Formatters = {
    integer: new Intl.NumberFormat(tag),
    decimal: new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }),
    percent: new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 1 }),
  };
  cache.set(tag, built);
  return built;
}

const DEFAULT_TAG = 'en-US';

export function formatInteger(value: number, tag: string = DEFAULT_TAG): string {
  return formatters(tag).integer.format(value);
}

export function formatDecimal(value: number, tag: string = DEFAULT_TAG): string {
  return formatters(tag).decimal.format(value);
}

/** Formats `part / whole` as a percentage; `—` when the whole is zero. */
export function formatShare(part: number, whole: number, tag: string = DEFAULT_TAG): string {
  return whole === 0 ? '—' : formatters(tag).percent.format(part / whole);
}

export function formatBytes(bytes: number, tag: string = DEFAULT_TAG): string {
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${formatDecimal(value, tag)} ${units[unitIndex] ?? 'B'}`;
}

export function formatDuration(milliseconds: number, tag: string = DEFAULT_TAG): string {
  return milliseconds < 1000
    ? `${String(Math.round(milliseconds))} ms`
    : `${formatDecimal(milliseconds / 1000, tag)} s`;
}
