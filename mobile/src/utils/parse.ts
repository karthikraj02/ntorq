export interface ParsedNumber {
  value: number | null;
  error: string | null;
}

/**
 * Parses an optional numeric form field. Empty text is a valid "no value";
 * anything else must be a finite number inside [min, max].
 */
export function parseOptionalNumber(
  text: string,
  options: { min?: number; max?: number; integer?: boolean; label: string },
): ParsedNumber {
  const trimmed = text.trim().replace(/,/g, '');
  if (trimmed === '') return { value: null, error: null };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { value: null, error: `${options.label} must be a number.` };
  }
  if (options.integer && !Number.isInteger(value)) {
    return { value: null, error: `${options.label} must be a whole number.` };
  }
  const { min, max } = options;
  if (min !== undefined && value < min) {
    return { value: null, error: `${options.label} must be at least ${min}.` };
  }
  if (max !== undefined && value > max) {
    return { value: null, error: `${options.label} must be at most ${max}.` };
  }
  return { value, error: null };
}

/** Trims text; empty becomes null so it is stored (and synced) as "not set". */
export function emptyToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

/** Text for a numeric form field ("" for null). */
export function numberToText(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : '';
}
