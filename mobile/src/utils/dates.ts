/**
 * Calendar-date helpers. Dates are plain `YYYY-MM-DD` strings (no time zone)
 * so a service date never shifts when the phone changes time zone.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function nowIso(): string {
  return new Date().toISOString();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today's date in the phone's local time zone. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}`;
}

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toUtcMs(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return Date.UTC(year, month - 1, day);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** Adds calendar months, clamping to the end of shorter months (31 Jan + 1 = 28/29 Feb). */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(
    Math.min(day, lastDay),
  )}`;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "03 Oct 2026", or "N/A" when there is no date. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate || !isValidIsoDate(isoDate)) return 'N/A';
  const [year, month, day] = isoDate.split('-') as [string, string, string];
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** "03 Oct 2026, 14:05" in the phone's local time zone, or "N/A". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const day = `${pad(date.getDate())} ${
    MONTHS[date.getMonth()]
  } ${date.getFullYear()}`;
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * A timestamp for "now" that is always later than `previousIso`, even if the
 * clock has not moved (or went backwards). Edits therefore always produce a
 * strictly newer `updatedAt`, which last-write-wins and the "untouched"
 * check both rely on.
 */
export function laterThan(previousIso: string): string {
  const previous = Date.parse(previousIso);
  return new Date(Math.max(Date.now(), previous + 1)).toISOString();
}
