/**
 * ---------- Hebrew word boundaries for matchers ----------
 *
 * `\b` only knows ASCII. In Hebrew there is no boundary a regex can lean on,
 * so every short token used as a matcher is also a substring of some ordinary,
 * unrelated word:
 *
 * | token | means      | but also sits inside |
 * |-------|------------|----------------------|
 * | `airo`  | euro     | `airopa` - Europe          |
 * | `shekel`| shekel   | `mishkal` - weight        |
 * | `alut`  | cost     | `maalot` - degrees        |
 * | `azal`  | sold out | `Bazel` - Basel           |
 * | `yarid` | fair     | `yerida` - a drop         |
 * | `mai`   | May      | `me-Italia` - from Italy  |
 * | `kasher`| kosher   | `kishron` - talent        |
 *
 * Every one of those was a live false positive in the reply guard. The one
 * that was reported: a traveller asked what the largest lake in Europe is, and
 * the answer was replaced with "I can't check prices or availability" - because
 * the Hebrew word for Europe opens with the Hebrew word for euro, and the
 * sentence also carried a number.
 *
 * ## What a boundary is here
 *
 * Not "no letter on either side": Hebrew attaches its prepositions and article
 * to the front of the word, so "in euros" and "the fair" are one word each. The
 * rule is therefore **no Hebrew letter after the token, and before it at most
 * two prefix letters which themselves have no Hebrew letter in front.**
 *
 * `m` is deliberately NOT a prefix letter here even though it is one in Hebrew
 * ("from"). Allowing it would let `mishkal` (weight) read as `mi` + `shekel`
 * and turn "a bag of up to 8 kg" into a price claim, and `maalot` (degrees)
 * read as `mi` + `alut` (cost) and turn "35 degrees in August" into one. In
 * real prose the "from" prefix attaches to the number rather than to the
 * currency ("from 100 shekels"), so nothing is lost.
 */

/** The Hebrew block. Includes the five final forms, which fall inside this range. */
export const HE_LETTER = 'א-ת';

/** Prefix letters that may attach to the front of a matched word. See the note above about `m`. */
const HE_PREFIX = '[בהוכלש]';

/**
 * Wraps alternatives in Hebrew-aware boundaries and returns the **source
 * string**, so callers keep composing their own patterns and flags.
 *
 * Order the alternatives longest-first: the engine takes the first that
 * matches, and a short one that fails the trailing check only backtracks into
 * a longer one if the longer one is still available to try.
 */
export function heWord(...alts: string[]): string {
  return `(?<![${HE_LETTER}])${HE_PREFIX}{0,2}(?:${alts.join('|')})(?![${HE_LETTER}])`;
}
