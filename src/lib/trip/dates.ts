import type { Trip } from './types';

/**
 * Trip dates.
 *
 * ## The one rule the whole file rests on: a date is `YYYY-MM-DD`, not an instant.
 *
 * `new Date('2026-08-12')` is read as midnight **UTC**. In Israel that is still the
 * 12th, but in any time zone west of Greenwich it is the 11th - so merely
 * displaying a date would shift it a day backwards for anyone browsing from New
 * York. Hence there is no `new Date(string)` here at all: the string is split into
 * three numbers and a local date at noon is built, which no daylight-saving shift
 * can move across a day boundary.
 *
 * The month and weekday names are written here rather than taken from `Intl`, so
 * the display is Hebrew even if the runtime was built without full ICU data - and
 * above all so the tests assert one known string rather than the machine's ICU version.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
];
const MONTHS_BARE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
/** getDay(): 0=Sunday */
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = value.match(ISO);
  if (!m) return false;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12);
  // Rejects 2026-02-31 and friends: the constructor "rolls" it into March, and that would look valid
  return (
    date.getFullYear() === Number(y) &&
    date.getMonth() === Number(mo) - 1 &&
    date.getDate() === Number(d)
  );
}

/** `YYYY-MM-DD` -> a local Date at noon (see the explanation above) */
export function parseISODate(value: string): Date | null {
  if (!isISODate(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(iso: string, n: number): string | null {
  const d = parseISODate(iso);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** How many days the range covers, inclusive of both ends. null if either is invalid. */
export function rangeDays(startDate?: string, endDate?: string): number | null {
  const a = startDate ? parseISODate(startDate) : null;
  const b = endDate ? parseISODate(endDate) : null;
  if (!a || !b) return null;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff >= 0 ? diff + 1 : null;
}

/** The date of day number `index` (0-based) in the trip, derived from the start date */
export function dayDate(trip: Pick<Trip, 'startDate'>, index: number): string | null {
  return trip.startDate ? addDays(trip.startDate, index) : null;
}

export interface FormatOpts {
  /** "Tuesday, 12 August" versus "12 August" */
  weekday?: boolean;
  /** Add the year when it is not the current year */
  year?: boolean;
}

export function formatHebrewDate(iso: string, opts: FormatOpts = {}): string {
  const d = parseISODate(iso);
  if (!d) return '';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const withYear = opts.year ? `${base} ${d.getFullYear()}` : base;
  return opts.weekday ? `${WEEKDAYS[d.getDay()]}, ${withYear}` : withYear;
}

/**
 * A readable range: "12-18 August", and across a month boundary "28 August - 3
 * September". Across a year boundary - the year is added to both ends.
 */
export function formatHebrewRange(startDate?: string, endDate?: string): string {
  const a = startDate ? parseISODate(startDate) : null;
  if (!a) return '';
  const b = endDate ? parseISODate(endDate) : null;
  if (!b || toISODate(a) === toISODate(b)) return formatHebrewDate(startDate!);
  if (a.getFullYear() !== b.getFullYear()) {
    return `${formatHebrewDate(startDate!, { year: true })} - ${formatHebrewDate(endDate!, { year: true })}`;
  }
  if (a.getMonth() === b.getMonth()) {
    // Same month: "12-18 August" - the month name once
    return `${a.getDate()}-${b.getDate()} ${MONTHS[a.getMonth()]}`;
  }
  return `${formatHebrewDate(startDate!)} - ${formatHebrewDate(endDate!)}`;
}

/** The month name without the Hebrew prefix letter - for headings */
export function hebrewMonth(iso: string): string {
  const d = parseISODate(iso);
  return d ? MONTHS_BARE[d.getMonth()] : '';
}

export type Countdown =
  | { kind: 'future'; days: number; label: string }
  | { kind: 'today'; label: string }
  | { kind: 'during'; day: number; label: string }
  | { kind: 'past'; label: string };

/**
 * Countdown. `today` is passed in as a parameter rather than read from `Date.now()`
 * inside, so a test can pin a day - and above all so no render depends on the clock
 * during hydration (server and client can be on different days).
 */
export function countdown(
  todayISO: string,
  startDate?: string,
  endDate?: string,
): Countdown | null {
  if (!startDate || !isISODate(startDate) || !isISODate(todayISO)) return null;
  const today = parseISODate(todayISO)!;
  const start = parseISODate(startDate)!;
  const end = endDate && isISODate(endDate) ? parseISODate(endDate)! : start;
  const toStart = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  const toEnd = Math.round((end.getTime() - today.getTime()) / 86_400_000);

  if (toStart > 0) {
    if (toStart === 1) return { kind: 'future', days: 1, label: 'יוצאים מחר' };
    return { kind: 'future', days: toStart, label: `עוד ${toStart} ימים לטיול` };
  }
  if (toStart === 0) return { kind: 'today', label: 'יוצאים היום' };
  if (toEnd >= 0) return { kind: 'during', day: 1 - toStart, label: `יום ${1 - toStart} בטיול` };
  return { kind: 'past', label: 'הטיול הסתיים' };
}

/** Today's date, as a local ISO string */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/**
 * The completion that makes a "range" convenient: giving only one end fills in the
 * other from the number of days the trip already has, so the default is always
 * consistent with the plan. **It does not touch the days themselves** - adjusting
 * the trip's length is an explicit user action, not a side effect of picking a date
 * (see TripDates).
 */
export function completeRange(
  dayCount: number,
  startDate?: string,
  endDate?: string,
): { startDate?: string; endDate?: string } {
  const span = Math.max(1, dayCount) - 1;
  const s = startDate && isISODate(startDate) ? startDate : undefined;
  const e = endDate && isISODate(endDate) ? endDate : undefined;
  if (s && !e) return { startDate: s, endDate: addDays(s, span) ?? undefined };
  if (!s && e) return { startDate: addDays(e, -span) ?? undefined, endDate: e };
  if (s && e && rangeDays(s, e) === null) return { startDate: s, endDate: addDays(s, span) ?? undefined };
  return { startDate: s, endDate: e };
}

/**
 * Validating dates that arrive from outside - the agent, a shared link, old storage.
 * Anything that is not a valid `YYYY-MM-DD` is dropped silently, and a reversed
 * range loses its end rather than keeping a state that cannot be displayed.
 */
export function safeDates(t: { startDate?: unknown; endDate?: unknown }): {
  startDate?: string;
  endDate?: string;
} {
  const startDate = isISODate(t.startDate) ? t.startDate : undefined;
  const endDate = isISODate(t.endDate) ? t.endDate : undefined;
  if (startDate && endDate && rangeDays(startDate, endDate) === null) return { startDate };
  if (!startDate && endDate) return {};
  return { startDate, endDate };
}
