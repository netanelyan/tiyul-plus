/**
 * The Hebrew calendar, and the festivals that change what a trip can do.
 * **Pure arithmetic, zero dependencies.**
 *
 * ## Why computing this is not "fabrication"
 *
 * Same argument as `zmanim.ts`: the Hebrew calendar has been a fixed,
 * deterministic algorithm since Hillel II - the molad of Tishrei, the four
 * dechiyot, and the month lengths that follow from the year's length. Nobody
 * observes or reports these dates; they are calculated, and every printed
 * Jewish calendar in the world calculates them the same way. So this is in the
 * same class as sunset: a computation whose inputs we already hold, not a fact
 * somebody has to source.
 *
 * ## Why it is implemented here rather than taken from Intl
 *
 * `Intl.DateTimeFormat('en-u-ca-hebrew')` can do this, and it is used in the
 * TESTS as an independent check. It is deliberately not used at runtime: the
 * output depends on whether the deployed runtime shipped full ICU data, and a
 * candle-lighting date that silently changes with a Node build is not
 * something to leave to chance. `zmanim.ts` made the same call for month
 * names, for the same reason.
 *
 * ## What this explicitly does NOT decide
 *
 * Whether an Israeli travelling abroad keeps one day of yom tov or two is a
 * genuine halachic dispute, and it is not ours to settle. Every second-day
 * yom tov is therefore flagged `diasporaOnly`, both days are returned, and the
 * UI reports the distinction rather than resolving it - the same rule that
 * stops us grading a hechsher.
 */

// ---------------------------------------------------------------- arithmetic

/** A 19-year cycle has 7 leap years, at these positions. */
export function isHebrewLeapYear(year: number): boolean {
  return ((7 * year + 1) % 19) < 7;
}

/**
 * Days from the calendar's epoch to 1 Tishrei of `year`, by the standard
 * molad-plus-dechiyot calculation.
 */
function elapsedDays(year: number): number {
  const monthsElapsed =
    235 * Math.floor((year - 1) / 19) +
    12 * ((year - 1) % 19) +
    Math.floor((7 * ((year - 1) % 19) + 1) / 19);

  const partsElapsed = 204 + 793 * (monthsElapsed % 1080);
  const hoursElapsed =
    5 +
    12 * monthsElapsed +
    793 * Math.floor(monthsElapsed / 1080) +
    Math.floor(partsElapsed / 1080);

  const conjunctionDay = 1 + 29 * monthsElapsed + Math.floor(hoursElapsed / 24);
  const conjunctionParts = 1080 * (hoursElapsed % 24) + (partsElapsed % 1080);

  let alt: number;
  // The four dechiyot, in order.
  if (conjunctionParts >= 19440) {
    alt = conjunctionDay + 1; // molad zaken
  } else if (
    conjunctionDay % 7 === 2 &&
    conjunctionParts >= 9924 &&
    !isHebrewLeapYear(year)
  ) {
    alt = conjunctionDay + 1; // GaTaRaD
  } else if (
    conjunctionDay % 7 === 1 &&
    conjunctionParts >= 16789 &&
    isHebrewLeapYear(year - 1)
  ) {
    alt = conjunctionDay + 1; // BeTUTaKPaT
  } else {
    alt = conjunctionDay;
  }

  // lo ADU rosh - Rosh Hashanah never falls on Sunday, Wednesday or Friday.
  if (alt % 7 === 0 || alt % 7 === 3 || alt % 7 === 5) return alt + 1;
  return alt;
}

/**
 * Offset between this calculation's day count and the proleptic Gregorian day
 * number used below.
 *
 * Calibrated from a single anchor (1 Tishrei 5786 = 2025-09-23) and then
 * VALIDATED against ICU's independent implementation across every month from
 * 1900 to 2100 in `hebrewCalendar.test.ts`. A constant fixed by one anchor and
 * checked against ~2,400 independent results is not a guess.
 */
const EPOCH_OFFSET = -2_092_591;

/** Days since 1970-01-01 for a proleptic Gregorian date. */
function gregorianDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

function isoFromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** Day number of 1 Tishrei of the given Hebrew year. */
function roshHashanahDayNumber(year: number): number {
  return elapsedDays(year) + EPOCH_OFFSET;
}

export function daysInHebrewYear(year: number): number {
  return roshHashanahDayNumber(year + 1) - roshHashanahDayNumber(year);
}

/**
 * Month lengths, in order from Tishrei. Cheshvan and Kislev are the two that
 * flex, which is what makes a year deficient (353/383), regular (354/384) or
 * complete (355/385).
 */
function monthLengths(year: number): { name: string; days: number }[] {
  const len = daysInHebrewYear(year);
  const cheshvan = len % 10 === 5 ? 30 : 29; // 355 or 385 -> complete
  const kislev = len % 10 === 3 ? 29 : 30; // 353 or 383 -> deficient
  const leap = isHebrewLeapYear(year);
  return [
    { name: 'תשרי', days: 30 },
    { name: 'חשוון', days: cheshvan },
    { name: 'כסלו', days: kislev },
    { name: 'טבת', days: 29 },
    { name: 'שבט', days: 30 },
    ...(leap
      ? [
          { name: 'אדר א׳', days: 30 },
          { name: 'אדר ב׳', days: 29 },
        ]
      : [{ name: 'אדר', days: 29 }]),
    { name: 'ניסן', days: 30 },
    { name: 'אייר', days: 29 },
    { name: 'סיוון', days: 30 },
    { name: 'תמוז', days: 29 },
    { name: 'אב', days: 30 },
    { name: 'אלול', days: 29 },
  ];
}

/** Day number of a Hebrew date, months named as in `monthLengths`. */
function hebrewDayNumber(year: number, monthName: string, day: number): number | null {
  const months = monthLengths(year);
  let n = roshHashanahDayNumber(year);
  for (const m of months) {
    if (m.name === monthName) return n + day - 1;
    n += m.days;
  }
  return null;
}

/** The Hebrew year that contains a given Gregorian date. */
export function hebrewYearOf(iso: string): number {
  const dn = gregorianDayNumber(iso);
  // Hebrew year is roughly Gregorian + 3760/3761.
  let y = new Date(iso).getUTCFullYear() + 3761;
  while (roshHashanahDayNumber(y) > dn) y -= 1;
  while (roshHashanahDayNumber(y + 1) <= dn) y += 1;
  return y;
}

/** A Hebrew date rendered for display, e.g. "15 <month> <year>" in Hebrew. */
export function hebrewDateLabel(iso: string): string {
  const year = hebrewYearOf(iso);
  const dn = gregorianDayNumber(iso);
  let n = roshHashanahDayNumber(year);
  for (const m of monthLengths(year)) {
    if (dn < n + m.days) return `${dn - n + 1} ב${m.name} ${year}`;
    n += m.days;
  }
  return '';
}

// ---------------------------------------------------------------- festivals

export type ChagKind = 'yomtov' | 'cholhamoed' | 'fast' | 'minor';

export interface ChagDay {
  date: string;
  name: string;
  kind: ChagKind;
  /**
   * Work and travel are restricted as on Shabbat. True for yom tov and for
   * Yom Kippur; false for chol hamoed, fasts and minor festivals.
   */
  restsLikeShabbat: boolean;
  /**
   * A second-day yom tov, observed in the diaspora. Israelis abroad differ on
   * whether they keep it, and this flag reports that rather than deciding it.
   */
  diasporaOnly: boolean;
  hebrewDate: string;
}

interface Spec {
  month: string;
  day: number;
  name: string;
  kind: ChagKind;
  rests: boolean;
  diasporaOnly?: boolean;
}

/**
 * The festivals that change what a trip can do. Chosen for travel impact, not
 * for completeness: a day when shops shut, transport stops or an observant
 * traveller will not fly.
 */
function specsFor(year: number): Spec[] {
  const adar = isHebrewLeapYear(year) ? 'אדר ב׳' : 'אדר';
  return [
    { month: 'תשרי', day: 1, name: 'ראש השנה', kind: 'yomtov', rests: true },
    { month: 'תשרי', day: 2, name: 'ראש השנה (יום שני)', kind: 'yomtov', rests: true },
    { month: 'תשרי', day: 3, name: 'צום גדליה', kind: 'fast', rests: false },
    { month: 'תשרי', day: 10, name: 'יום כיפור', kind: 'yomtov', rests: true },
    { month: 'תשרי', day: 15, name: 'סוכות', kind: 'yomtov', rests: true },
    {
      month: 'תשרי',
      day: 16,
      name: 'סוכות (יום שני)',
      kind: 'yomtov',
      rests: true,
      diasporaOnly: true,
    },
    ...[17, 18, 19, 20, 21].map((d) => ({
      month: 'תשרי',
      day: d,
      name: 'חול המועד סוכות',
      kind: 'cholhamoed' as const,
      rests: false,
    })),
    { month: 'תשרי', day: 22, name: 'שמיני עצרת', kind: 'yomtov', rests: true },
    {
      month: 'תשרי',
      day: 23,
      name: 'שמחת תורה',
      kind: 'yomtov',
      rests: true,
      diasporaOnly: true,
    },
    ...[25, 26, 27, 28, 29, 30].map((d) => ({
      month: 'כסלו',
      day: d,
      name: 'חנוכה',
      kind: 'minor' as const,
      rests: false,
    })),
    ...[1, 2].map((d) => ({
      month: 'טבת',
      day: d,
      name: 'חנוכה',
      kind: 'minor' as const,
      rests: false,
    })),
    { month: 'טבת', day: 10, name: 'צום עשרה בטבת', kind: 'fast', rests: false },
    { month: adar, day: 13, name: 'תענית אסתר', kind: 'fast', rests: false },
    { month: adar, day: 14, name: 'פורים', kind: 'minor', rests: false },
    { month: adar, day: 15, name: 'שושן פורים', kind: 'minor', rests: false },
    { month: 'ניסן', day: 15, name: 'פסח', kind: 'yomtov', rests: true },
    {
      month: 'ניסן',
      day: 16,
      name: 'פסח (יום שני)',
      kind: 'yomtov',
      rests: true,
      diasporaOnly: true,
    },
    ...[17, 18, 19, 20].map((d) => ({
      month: 'ניסן',
      day: d,
      name: 'חול המועד פסח',
      kind: 'cholhamoed' as const,
      rests: false,
    })),
    { month: 'ניסן', day: 21, name: 'שביעי של פסח', kind: 'yomtov', rests: true },
    {
      month: 'ניסן',
      day: 22,
      name: 'אחרון של פסח',
      kind: 'yomtov',
      rests: true,
      diasporaOnly: true,
    },
    { month: 'סיוון', day: 6, name: 'שבועות', kind: 'yomtov', rests: true },
    {
      month: 'סיוון',
      day: 7,
      name: 'שבועות (יום שני)',
      kind: 'yomtov',
      rests: true,
      diasporaOnly: true,
    },
    { month: 'תמוז', day: 17, name: 'צום י״ז בתמוז', kind: 'fast', rests: false },
    { month: 'אב', day: 9, name: 'תשעה באב', kind: 'fast', rests: false },
  ];
}

/**
 * Every festival day between two ISO dates, inclusive. Spans the Hebrew years
 * the range touches, so a trip crossing Rosh Hashanah is handled.
 */
export function chagimBetween(startIso: string, endIso: string): ChagDay[] {
  const from = gregorianDayNumber(startIso);
  const to = gregorianDayNumber(endIso);
  if (to < from) return [];

  const out: ChagDay[] = [];
  const firstYear = hebrewYearOf(startIso);
  const lastYear = hebrewYearOf(endIso);

  for (let y = firstYear; y <= lastYear; y += 1) {
    for (const s of specsFor(y)) {
      const dn = hebrewDayNumber(y, s.month, s.day);
      if (dn === null || dn < from || dn > to) continue;
      const date = isoFromDayNumber(dn);
      out.push({
        date,
        name: s.name,
        kind: s.kind,
        restsLikeShabbat: s.rests,
        diasporaOnly: Boolean(s.diasporaOnly),
        hebrewDate: hebrewDateLabel(date),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/** The festival days on one date, if any. */
export function chagimOn(iso: string): ChagDay[] {
  return chagimBetween(iso, iso);
}
