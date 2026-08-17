import { inHe } from '@/lib/hebrew';
/**
 * One sentence describing the catalog's scope, instead of dumping it.
 *
 * ## Why this file exists
 *
 * The keyless reply opened with "right now I have full itineraries in:" and then
 * `countries.map(c => c.name).join(' - ')` - **every** country name. With eight
 * countries that was reasonable. The catalog today holds more than seventy, and the
 * data session adds more every hour, so that one line of code grew into a wall of
 * text nobody reads - and it also pushed the important part (what you can ask) below
 * the fold.
 *
 * This is also the text Netanel actually saw: the reply that looked like amnesia in
 * the morning's screenshots was exactly this sentence with every country in it.
 *
 * ## The rule
 *
 * A number + a few examples + a question back. The number is derived from the data, so
 * it stays correct without touching the code; the examples are capped at
 * `MAX_EXAMPLES`, so the length **does not grow with the catalog**, and that is the
 * whole point.
 */

/** How many countries are named. More than that is a list, not an example. */
export const MAX_EXAMPLES = 5;

/**
 * Preferred examples: recognisable countries that are easy to connect with, rather
 * than whatever happens to come first in the file. Filtered against the data, so a
 * country removed from the catalog will not appear here.
 */
const PREFERRED = ['italy', 'greece', 'japan', 'thailand', 'portugal', 'georgia'];

/**
 * @param all every country name in the catalog, in data order
 * @param bySlug a slug-to-name map, for picking the preferred examples
 */
export function coverageLine(all: string[], bySlug: Record<string, string>): string {
  const preferred = PREFERRED.map((s) => bySlug[s]).filter(Boolean);
  // If the data changed and there are not enough preferred ones - top up from the start, with no duplicates
  const examples = [...new Set([...preferred, ...all])].slice(0, MAX_EXAMPLES);
  if (all.length === 0) return 'הקטלוג בהרחבה כרגע.';
  if (all.length <= MAX_EXAMPLES) return `יש לי מסלולים מלאים ${inHe(examples.join(', '))}.`;
  return `יש לי מסלולים מלאים ביותר מ-${all.length} מדינות - ${examples.join(', ')} ועוד.`;
}
