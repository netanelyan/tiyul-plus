// Correct Hebrew for how long a visit to a place takes.
//
// Why this is a file and not an expression inside the JSX: the previous wording
// computed a half-hour figure inline and printed it with a plural noun, producing the
// equivalent of "about 1 hours" and "about 0.5 hours". That is not Hebrew. 248 of the
// places in the catalog sit on exactly 45 or 60 minutes, i.e. most of the cards on a
// destination page were showing the wrong form.
//
// Hebrew distinguishes singular, dual and plural, and `travel.ts` already does this
// correctly for journey times. This is the same distinction, in one shared place.

/** Rounds to the half hour, exactly as the page did before - only the wording changes. */
export function roundToHalfHours(minutes: number): number {
  return Math.round(minutes / 30) / 2;
}

/**
 * Produces the correct singular / dual / plural Hebrew form for half an hour, one
 * hour, an hour and a half, two hours, two and a half, and three or more.
 * Returns null when there is no real duration, so the caller simply shows nothing.
 */
export function formatDurationHe(minutes: number | undefined | null): string | null {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return null;

  const hours = roundToHalfHours(minutes);
  if (hours <= 0) return null;
  if (hours === 0.5) return 'כחצי שעה';
  if (hours === 1) return 'כשעה';
  if (hours === 1.5) return 'כשעה וחצי';
  if (hours === 2) return 'כשעתיים';
  if (hours === 2.5) return 'כשעתיים וחצי';

  // From three hours upwards the numeric form is correct Hebrew, so a plain number is used.
  const n = hours % 1 === 0 ? String(hours) : hours.toFixed(1);
  return `כ-${n} שעות`;
}

/**
 * One day / two days / N days - exactly the same distinction, applied to a trip length.
 *
 * Found on the new dashboard ("typical length: 1 days") and then it turned out to have
 * existed for a long time everywhere a trip length is shown: the navigation, the
 * homepage trip card, the summary chip, the account area, the shared trip and the OG
 * description. A one- or two-day trip is an entirely common case, so this is not an
 * edge case.
 *
 * `withCount` returns the dual form rather than "2 days", because that is the Hebrew
 * form - exactly like "two hours" above. From three upwards the numeric form is correct.
 */
export function daysHe(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'בלי ימים';
  if (n === 1) return 'יום אחד';
  if (n === 2) return 'יומיים';
  return `${n} ימים`;
}
