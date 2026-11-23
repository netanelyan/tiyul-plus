import { chagimBetween } from '@/lib/hebrewCalendar';

/**
 * ---------- The coming Passover, for the Pesach hub ----------
 *
 * Passover destinations are searched with the year in them, and families book the April
 * school break from December, so the hub names the year and the dates. The
 * festival dates are computed from the Hebrew calendar rather than typed, so the
 * page rolls over to the next year by itself on the first build after the
 * seventh day.
 *
 * The school break is different: it is a Ministry of Education decision and
 * cannot be computed. It is copied from the ministry's published calendar into
 * `SCHOOL_BREAK`, one year at a time, and a year with no entry shows no break
 * rather than a guess.
 */

export interface PesachDates {
  /** Gregorian year of the first day. */
  year: number;
  /** The evening of the seder: the day before the first day. ISO date. */
  seder: string;
  firstDay: string;
  /** The seventh day - the last day of the festival in Israel. */
  seventhDay: string;
  /** The diaspora second days, which Israelis abroad keep in different ways. */
  secondDayAbroad: string | null;
  lastDayAbroad: string | null;
  schoolBreak: SchoolBreak | null;
}

export interface SchoolBreak {
  from: string;
  to: string;
  /** The first school day after the break. */
  back: string;
  source: string;
}

/**
 * By Gregorian year. Checked against the source on the date in the comment;
 * add the next year when the ministry publishes it.
 */
const SCHOOL_BREAK: Record<number, SchoolBreak> = {
  // Checked 2026-11-23: the break runs Tuesday 13.04.2027 to Wednesday 28.04.2027, school resumes 29.04.
  2027: {
    from: '2027-04-13',
    to: '2027-04-28',
    back: '2027-04-29',
    source: 'https://meyda.education.gov.il/files/PreSchool/maonot/jewish2026-2027.pdf',
  },
};

const DAY_MS = 86_400_000;
const addDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/**
 * The Passover that has not ended yet as of `today` (ISO date): this year's
 * until its seventh day, then next year's.
 */
export function upcomingPesach(today: string): PesachDates | null {
  const days = chagimBetween(today, addDays(today, 400));
  const seventh = days.find((d) => d.name === 'שביעי של פסח');
  if (!seventh) return null;
  // The first day may already be behind `today` during the festival itself.
  const window = chagimBetween(addDays(seventh.date, -8), seventh.date);
  const first = window.find((d) => d.name === 'פסח');
  if (!first) return null;
  const year = Number(first.date.slice(0, 4));
  const after = chagimBetween(first.date, addDays(seventh.date, 1));
  return {
    year,
    seder: addDays(first.date, -1),
    firstDay: first.date,
    seventhDay: seventh.date,
    secondDayAbroad: after.find((d) => d.name === 'פסח (יום שני)')?.date ?? null,
    lastDayAbroad: after.find((d) => d.name === 'אחרון של פסח')?.date ?? null,
    schoolBreak: SCHOOL_BREAK[year] ?? null,
  };
}

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T00:00:00Z`));

/** Day and month, e.g. 21 April. */
export const heDayMonth = (iso: string) => fmt(iso, { day: 'numeric', month: 'long' });
/** The weekday name. */
export const heWeekday = (iso: string) => fmt(iso, { weekday: 'long' });

/** A date range in one month as "13-28 <month>", across months as "<from> until <to>". */
export function heDateRange(from: string, to: string): string {
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8, 10))}-${heDayMonth(to)}`;
  }
  return `${heDayMonth(from)} עד ${heDayMonth(to)}`;
}
