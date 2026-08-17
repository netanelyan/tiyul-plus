/**
 * Hebrew spelling rules the code needs - **one rule for now, and that is enough**.
 *
 * ## The bug
 *
 * Naively concatenating a one-letter prefix onto a city name produces the wrong
 * spelling. In unpointed Hebrew, a prefix letter added to a word beginning with a
 * consonantal vav **doubles that vav**. The catalog holds seven such names (Vienna,
 * Venice, Warsaw, Vilnius, Vojvodina, Valle and Zermatt, Vietnam) - and Vienna is one
 * of the flagship cities.
 *
 * This is the same family as the "about 1 hours" bug from entry (kk): the value was
 * right, the Hebrew was not, and no type check or validator can see it. The
 * difference is that this time it was caught before it reached the screen - in the
 * new panel's "search lodging in <city>" button.
 *
 * ## Why a function and not a fix in eight places
 *
 * The prefix-plus-name construction appears in 14 places today: accessibility
 * labels, a search field placeholder, the agent's action chips, page titles and
 * descriptions. A manual fix would hold only until the next caller somebody writes.
 */

/** The prefix letters that double a word-initial vav */
const PREFIXES = new Set(['ב', 'ל', 'כ', 'מ', 'ש', 'ה', 'ו', 'כש', 'לכש']);

/**
 * Joins a prefix letter to a name.
 *
 * ```
 * Transliterated (the real arguments are Hebrew strings):
 *   prefix B + "Vina"       -> "BVVina"       (the initial vav doubles)
 *   prefix B + "Bratislava" -> "BBratislava"  (unchanged)
 *   prefix M + "Venetsia"   -> "MVVenetsia"
 * ```
 *
 * An empty name is returned as-is rather than as a lone letter - a bare prefix
 * letter on screen is worse than nothing.
 */
export function hePrefix(prefix: string, word: string): string {
  const w = (word ?? '').trim();
  if (!w) return '';
  if (!PREFIXES.has(prefix)) return `${prefix}${w}`;
  // A word-initial consonantal vav doubles after a prefix letter. A word that already
  // opens with two vavs (e.g. Washington) is already spelled correctly and needs nothing added.
  if (w.startsWith('ו') && !w.startsWith('וו')) return `${prefix}ו${w}`;
  return `${prefix}${w}`;
}

/** The most common shorthand: "in <city>" */
export const inHe = (word: string): string => hePrefix('ב', word);
