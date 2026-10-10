/**
 * Hebrew spelling rules the code needs - the vav doubling below, and the definite article (see DEFINITE_FIRST_WORDS).
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
  // The definite article is absorbed by bet, lamed and kaf: "the Dolomites" with lamed
  // is spelled without the he. See DEFINITE_FIRST_WORDS for why this is a list.
  if (ABSORBS_ARTICLE.has(prefix) && DEFINITE_FIRST_WORDS.has(w.split(/\s/)[0])) {
    return `${prefix}${w.slice(1)}`;
  }
  // A word-initial consonantal vav doubles after a prefix letter. A word that already
  // opens with two vavs (e.g. Washington) is already spelled correctly and needs nothing added.
  if (w.startsWith('ו') && !w.startsWith('וו')) return `${prefix}ו${w}`;
  return `${prefix}${w}`;
}

/** The prefixes that swallow a definite article. Mem, shin and vav keep it. */
const ABSORBS_ARTICLE = new Set(['ב', 'ל', 'כ']);

/**
 * Catalog names whose opening he is the definite article, by first word.
 *
 * ## The second rule
 *
 * After bet, lamed or kaf the article disappears in unpointed Hebrew, so the
 * Dolomites with lamed must lose its he. The naive join kept it, and that
 * misspelling sat in the itinerary page title for the Dolomites and in
 * the country title for the Philippines.
 *
 * ## Why a list and not a rule
 *
 * A word-initial he is the article in some names and a root letter in others -
 * Hungary, Holland, India, Hanoi and Hoi An all begin with a he that belongs to
 * the name, and the construct "mountains of" begins with one too. Nothing in
 * the spelling tells them apart, so each catalog name is classified by hand.
 * `hebrew.test.ts` fails on any catalog name that opens with he and appears in
 * neither this set nor `NOT_DEFINITE_FIRST_WORDS`, so a new entry cannot slip
 * through unclassified.
 */
export const DEFINITE_FIRST_WORDS: ReadonlySet<string> = new Set([
  'הדולומיטים',
  'הגרנד',
  'החוף',
  'האי',
  'המרכז',
  'האלפים',
  'המשולש',
  'האטלס',
  'הערבה',
  'הגליל',
  'הפיליפינים',
]);

/** Catalog first words whose he is part of the word itself. Kept for the test above. */
export const NOT_DEFINITE_FIRST_WORDS: ReadonlySet<string> = new Set([
  'הרי',
  'האנוי',
  'הוי',
  'הקפת',
  'הימאצ׳ל',
  'הונגריה',
  'הולנד',
  'הודו',
]);

/** The most common shorthand: "in <city>" */
export const inHe = (word: string): string => hePrefix('ב', word);
