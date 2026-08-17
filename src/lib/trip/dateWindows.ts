/**
 * ---------- What happens on the traveler's dates ----------
 *
 * The data is `src/data/calendar.ts` (`CalendarEntry`) - the site's calendar
 * of events and closures. This file is **only the matching and the display**:
 * what from the calendar concerns this trip, and how to say it without
 * turning an approximate window into a date.
 *
 * ## The central decision: overlap is measured against **the days in the city**, not against the trip
 *
 * A ten-day trip to Rome and Munich starting on September 15 "overlaps"
 * Oktoberfest if you check range against range. But if the traveler is in
 * Munich only on the first two days they will not be there when the festival
 * opens, and the card would have misled them. So the check is **day by day**:
 * every day has a city and a date derived from `startDate`, and an entry is
 * considered relevant only if there is at least one day on which the traveler
 * is within its scope and inside the window.
 *
 * An entry applies to a day if it targets that day's **destination**, or if
 * it is at the **country** level (`destinationSlugs` empty) and the
 * destination's country matches.
 *
 * ## Two lists, because there are two degrees of certainty - and mixing them is forbidden
 *
 * - `dated`   - `datesConfirmed: true`. There are real date ranges, and the
 *               overlap is computed on them. Displayed as a date.
 * - `windows` - `datesConfirmed: false`. **There are no dates in the data at
 *               all**, only a verbal description. Overlap cannot be computed,
 *               so they are not displayed as "overlaps days 3-5" but as "the
 *               typical window, this year's dates not yet published" - which
 *               is exactly what they are.
 */

import type { CalendarEntry } from '@/lib/types';
import type { Trip } from './types';
import { dayDate, formatHebrewRange } from './dates';

/** A minimal city → country mapping. Comes from the trip's cities, not from the catalog. */
export interface CityCountry {
  slug: string;
  countrySlug: string;
}

export interface DatedMatch {
  entry: CalendarEntry;
  /** The day numbers in the trip (1-based) that fall inside one of the entry's ranges */
  dayNumbers: number[];
  /** The range actually met, for display */
  range: { start: string; end: string };
}

export interface WindowMatch {
  entry: CalendarEntry;
  /** Which city in the trip the entry concerns (for display) */
  cityLabel?: string;
}

export interface TripCalendar {
  dated: DatedMatch[];
  windows: WindowMatch[];
}

/* ---------- Scope matching ---------- */

function appliesTo(entry: CalendarEntry, citySlug: string, countrySlug: string): boolean {
  const scoped = entry.destinationSlugs ?? [];
  if (scoped.length > 0) return scoped.includes(citySlug);
  return entry.countrySlug === countrySlug;
}

/* ---------- Months out of a verbal description ---------- */

const MONTH_WORDS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/**
 * Which months are mentioned in the verbal description of an unconfirmed
 * window.
 *
 * **This is an estimate, and it is used solely to decide whether to show the
 * entry** - never to display a date. The text itself is displayed word for
 * word as written.
 *
 * "January until March" is interpreted as three months and not two: the
 * Hebrew word for "until" (or a dash) between two months is a range, and
 * without this fill February would fall between the cracks. When no month
 * can be identified - the entry is **not** shown. Better to miss an
 * approximate window than to show every trip everything stored for the
 * country.
 */
export function monthsInWindow(text: string): number[] {
  const found: { month: number; at: number; range: boolean }[] = [];
  MONTH_WORDS.forEach((w, i) => {
    let from = 0;
    for (;;) {
      const at = text.indexOf(w, from);
      if (at < 0) break;
      const before = text.slice(Math.max(0, at - 12), at);
      found.push({ month: i + 1, at, range: /(עד|מ-|–|—|\bעד\b)\s*$/.test(before) });
      from = at + w.length;
    }
  });
  if (found.length === 0) return [];
  found.sort((a, b) => a.at - b.at);

  const months = new Set<number>();
  found.forEach((f, idx) => {
    months.add(f.month);
    if (f.range && idx > 0) {
      // Fill from the previous month up to this one, including a year
      // wrap-around (November until January)
      let m = found[idx - 1].month;
      for (let guard = 0; guard < 12 && m !== f.month; guard++) {
        m = (m % 12) + 1;
        months.add(m);
      }
    }
  });
  return [...months].sort((a, b) => a - b);
}

/* ---------- The matching ---------- */

export function matchTripCalendar(
  trip: Trip | null,
  entries: CalendarEntry[],
  cities: CityCountry[],
): TripCalendar {
  if (!trip?.startDate || trip.days.length === 0) return { dated: [], windows: [] };

  const countryOf = new Map(cities.map((c) => [c.slug, c.countrySlug]));
  const dated = new Map<string, DatedMatch>();
  /** month -> the cities the traveler is in during that month */
  const monthCities = new Map<number, Set<string>>();

  trip.days.forEach((day, index) => {
    const date = dayDate(trip, index);
    const country = countryOf.get(day.citySlug);
    if (!date || !country) return;

    const month = Number(date.slice(5, 7));
    if (!monthCities.has(month)) monthCities.set(month, new Set());
    monthCities.get(month)!.add(day.citySlug);

    for (const entry of entries) {
      if (!entry.datesConfirmed || !entry.dates?.length) continue;
      if (!appliesTo(entry, day.citySlug, country)) continue;
      const range = entry.dates.find((r) => date >= r.start && date <= r.end);
      if (!range) continue;
      const hit = dated.get(entry.id);
      if (hit) hit.dayNumbers.push(index + 1);
      else dated.set(entry.id, { entry, dayNumbers: [index + 1], range });
    }
  });

  // Unconfirmed windows: they have no dates, so the match is at month+city level
  const windows: WindowMatch[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.datesConfirmed || !entry.window) continue;
    if (seen.has(entry.id)) continue;
    const months = monthsInWindow(entry.window);
    if (months.length === 0) continue;
    const hitCity = months
      .flatMap((m) => [...(monthCities.get(m) ?? [])])
      .find((slug) => appliesTo(entry, slug, countryOf.get(slug) ?? ''));
    if (!hitCity) continue;
    seen.add(entry.id);
    windows.push({ entry, cityLabel: hitCity });
  }

  return {
    dated: [...dated.values()].sort((a, b) => a.dayNumbers[0] - b.dayNumbers[0]),
    windows,
  };
}

/* ---------- Display ---------- */

/**
 * The wording for a window whose dates have not been published.
 *
 * **The most important sentence in this feature.** It appears where a date
 * would otherwise be, so it is not a footnote and not small print.
 */
export const NOT_PUBLISHED = 'התאריכים לשנה הזו עדיין לא פורסמו';

/** A confirmed entry's dates, as a readable range */
export const datedLabel = (m: DatedMatch) => formatHebrewRange(m.range.start, m.range.end);

/** Hebrew "Source: X · checked on July 30" line */
export const sourceLabel = (entry: CalendarEntry) =>
  `מקור: ${entry.source.title} · נבדק ב-${hebrewShort(entry.source.checked)}`;

function hebrewShort(iso: string): string {
  const r = formatHebrewRange(iso, iso);
  return r || iso;
}

export const impactLabel = (entry: CalendarEntry): string =>
  entry.kind === 'closure' || entry.impact === 'closures'
    ? 'סגירות'
    : entry.impact === 'both'
      ? 'אירוע · סגירות'
      : 'אירוע';

/**
 * The day range in the trip as short text: Hebrew for "day 5" or "days 5-7".
 *
 * The days are checked for contiguity and not only for endpoints: a trip that
 * returns to the same city at the end would give [2, 9], and "days 2-9" would
 * claim eight days that were not there.
 */
export function dayRangeLabel(days: number[]): string {
  if (days.length === 0) return '';
  if (days.length === 1) return `יום ${days[0]}`;
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  return contiguous ? `ימים ${days[0]}-${days[days.length - 1]}` : `ימים ${days.join(', ')}`;
}
