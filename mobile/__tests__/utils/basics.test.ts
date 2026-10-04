import { describeArc, polarToCartesian, valueToAngle } from '@/utils/arc';
import {
  addMonths,
  daysBetween,
  formatDate,
  isValidIsoDate,
  todayIso,
} from '@/utils/dates';
import {
  formatCurrency,
  formatDuration,
  formatKm,
  formatNumber,
  formatThousands,
  formatWithUnit,
  NOT_AVAILABLE,
} from '@/utils/format';
import { log, getLogEntries, clearLogs, scrub } from '@/utils/logger';
import { emptyToNull, numberToText, parseOptionalNumber } from '@/utils/parse';
import { uuid } from '@/utils/uuid';

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-1-1')).toBe(false);
    expect(isValidIsoDate('not a date')).toBe(false);
  });

  it('formats today using local calendar fields', () => {
    expect(todayIso(new Date(2026, 9, 3, 23, 59))).toBe('2026-10-03');
    expect(todayIso(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-10-03', '2026-10-13')).toBe(10);
    expect(daysBetween('2026-10-13', '2026-10-03')).toBe(-10);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('adds months and clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-15', 6)).toBe('2026-07-15');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2026-12-15', 12)).toBe('2027-12-15');
  });

  it('formats dates for display and shows N/A for missing ones', () => {
    expect(formatDate('2026-10-03')).toBe('03 Oct 2026');
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate('garbage')).toBe('N/A');
  });
});

describe('format', () => {
  it('shows N/A instead of inventing values', () => {
    expect(formatNumber(null)).toBe(NOT_AVAILABLE);
    expect(formatNumber(undefined)).toBe(NOT_AVAILABLE);
    expect(formatNumber(Number.NaN)).toBe(NOT_AVAILABLE);
    expect(formatWithUnit(null, 'km')).toBe(NOT_AVAILABLE);
    expect(formatDuration(null)).toBe(NOT_AVAILABLE);
    expect(formatKm(null)).toBe(NOT_AVAILABLE);
    expect(formatCurrency(null, 'INR')).toBe(NOT_AVAILABLE);
  });

  it('formats real values', () => {
    expect(formatNumber(67.4)).toBe('67');
    expect(formatNumber(12.66, 1)).toBe('12.7');
    expect(formatWithUnit(18.44, 'km', 1)).toBe('18.4 km');
    expect(formatNumber(0)).toBe('0');
  });

  it('formats durations', () => {
    expect(formatDuration(95)).toBe('1m 35s');
    expect(formatDuration(4210)).toBe('1h 10m');
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(-5)).toBe(NOT_AVAILABLE);
  });

  it('groups thousands independent of locale', () => {
    expect(formatThousands(1234567)).toBe('1,234,567');
    expect(formatThousands(999)).toBe('999');
    expect(formatThousands(1234.5, 1)).toBe('1,234.5');
    expect(formatKm(12500)).toBe('12,500 km');
    expect(formatCurrency(450, 'INR')).toBe('INR 450');
    expect(formatCurrency(1234.5, 'INR')).toBe('INR 1,234.50');
  });
});

describe('parseOptionalNumber', () => {
  const opts = { label: 'Mileage', min: 0, max: 1000 };

  it('treats empty text as "no value", not zero', () => {
    expect(parseOptionalNumber('', opts)).toEqual({ value: null, error: null });
    expect(parseOptionalNumber('   ', opts)).toEqual({
      value: null,
      error: null,
    });
  });

  it('parses numbers, tolerating thousands separators', () => {
    expect(parseOptionalNumber('12.5', opts).value).toBe(12.5);
    expect(parseOptionalNumber('1,000', opts).value).toBe(1000);
    expect(parseOptionalNumber('0', opts).value).toBe(0);
  });

  it('reports clear errors', () => {
    expect(parseOptionalNumber('abc', opts).error).toMatch(/must be a number/);
    expect(parseOptionalNumber('-1', opts).error).toMatch(/at least 0/);
    expect(parseOptionalNumber('1001', opts).error).toMatch(/at most 1000/);
    expect(
      parseOptionalNumber('1.5', { ...opts, integer: true }).error,
    ).toMatch(/whole number/);
    expect(parseOptionalNumber('Infinity', opts).error).toBeTruthy();
  });

  it('helpers for form text', () => {
    expect(emptyToNull('  ')).toBeNull();
    expect(emptyToNull(' hi ')).toBe('hi');
    expect(numberToText(null)).toBe('');
    expect(numberToText(0)).toBe('0');
    expect(numberToText(12.5)).toBe('12.5');
  });
});

describe('uuid', () => {
  it('produces RFC 4122 v4 formatted ids that do not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uuid()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });
});

describe('gauge arc geometry', () => {
  it("measures angles clockwise from twelve o'clock", () => {
    const top = polarToCartesian(100, 100, 50, 0);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
    const right = polarToCartesian(100, 100, 50, 90);
    expect(right.x).toBeCloseTo(150);
    expect(right.y).toBeCloseTo(100);
  });

  it('maps and clamps values onto the sweep', () => {
    expect(valueToAngle(0, 120, -135, 270)).toBe(-135);
    expect(valueToAngle(60, 120, -135, 270)).toBe(0);
    expect(valueToAngle(120, 120, -135, 270)).toBe(135);
    expect(valueToAngle(500, 120, -135, 270)).toBe(135);
    expect(valueToAngle(-5, 120, -135, 270)).toBe(-135);
  });

  it('uses the large-arc flag past 180 degrees', () => {
    expect(describeArc(100, 100, 50, -135, 0)).toContain(' 0 0 1 ');
    expect(describeArc(100, 100, 50, -135, 135)).toContain(' 0 1 1 ');
  });
});

describe('logger', () => {
  beforeEach(() => clearLogs());

  it('scrubs bearer tokens, JWTs and password-like values', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk';
    expect(scrub(`Authorization: Bearer ${jwt}`)).not.toContain('eyJ');
    expect(scrub(`token=${jwt}`)).not.toContain(jwt);
    expect(scrub('{"password":"hunter2","email":"a@b.c"}')).not.toContain(
      'hunter2',
    );
    expect(scrub('password=hunter2&x=1')).toContain('[REDACTED]');
    expect(scrub('plain message')).toBe('plain message');
  });

  it('keeps entries in a bounded buffer and never stores secrets', () => {
    log.info('auth', 'login with password=hunter2');
    for (let i = 0; i < 400; i++) log.debug('t', `line ${i}`);
    const entries = getLogEntries();
    expect(entries.length).toBeLessThanOrEqual(300);
    expect(entries.some(e => e.message.includes('hunter2'))).toBe(false);
  });
});
