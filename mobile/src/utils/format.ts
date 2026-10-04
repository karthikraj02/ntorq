export const NOT_AVAILABLE = 'N/A';

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Formats a number with fixed decimals, or "N/A" when the value is missing. */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0,
): string {
  return isNumber(value) ? value.toFixed(decimals) : NOT_AVAILABLE;
}

export function formatWithUnit(
  value: number | null | undefined,
  unit: string,
  decimals = 0,
): string {
  return isNumber(value) ? `${value.toFixed(decimals)} ${unit}` : NOT_AVAILABLE;
}

/** 4210 s -> "1h 10m", 95 s -> "1m 35s". */
export function formatDuration(
  totalSeconds: number | null | undefined,
): string {
  if (!isNumber(totalSeconds) || totalSeconds < 0) return NOT_AVAILABLE;
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

/** 1234.5 -> "1,234.5" (always English grouping, so tests are locale independent). */
export function formatThousands(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (!isNumber(value)) return NOT_AVAILABLE;
  const [whole = '0', fraction] = value.toFixed(decimals).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/** Joins the parts that have a value ("15 Jan 2026 · 1,000 km"); "N/A" only if none do. */
export function joinAvailable(...parts: string[]): string {
  const present = parts.filter(part => part !== NOT_AVAILABLE);
  return present.length > 0 ? present.join(' · ') : NOT_AVAILABLE;
}

export function formatKm(
  value: number | null | undefined,
  decimals = 0,
): string {
  return isNumber(value)
    ? `${formatThousands(value, decimals)} km`
    : NOT_AVAILABLE;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string,
): string {
  if (!isNumber(value)) return NOT_AVAILABLE;
  return `${currency} ${formatThousands(value, value % 1 === 0 ? 0 : 2)}`;
}
