/**
 * ---------- When to go, as months, read from the curator's own sentence ----------
 *
 * Every destination carries `bestSeason` as Hebrew prose. Nothing carries
 * months as numbers, and `bestMonths` has been empty 166 of 166 since the field
 * was invented - which is why the season filter on the catalog is built and
 * hidden, and why the seasonal hubs (Pesach, winter) were never built at all.
 *
 * ## Why this is a parse and not a data pass
 *
 * The months are already written down. Authoring a second copy as arrays would
 * mean 166 hand-typed literals that drift from the sentence beside them the
 * first time a data session edits one - the same failure /about had, quoting
 * catalog numbers from memory. Deriving keeps one source.
 *
 * ## The rule, and why a naive parse is dangerous
 *
 * **A month named in `bestSeason` is not necessarily a recommended month.**
 * Ninety-seven of the 166 sentences contain a caution, and the caution usually
 * names months:
 *
 *     "March-June, September-November (July-August very hot)"
 *
 * Grabbing every month here recommends July and August in the same breath as
 * warning about them. That is exactly the "correct-looking but wrong" class
 * hard rule 2 exists for, and it is why this file is careful rather than clever.
 *
 * The saving structure is that the sentences are written the same way: **the
 * recommendation comes first, and every caution follows** - in parentheses,
 * after a dash, or in a second sentence. So only the leading segment is read,
 * and everything from the first `(`, `.` or free-standing dash onward is
 * discarded.
 *
 * ## What that deliberately gives up
 *
 * Vienna's sentence ends with a parenthesis naming December for the Christmas
 * markets - a parenthesis that ADDS a recommendation rather than a warning, and
 * December is therefore dropped. That is a miss,
 * not an error, and it is the safe direction: a missing month costs a filter
 * hit, a wrong month sends somebody to Athens in August.
 *
 * A sentence whose leading segment names no month returns an empty array, and
 * the destination simply does not answer a season filter.
 */

/** Month names as the catalog writes them, including the two spellings of March. */
const MONTHS: [RegExp, number][] = [
  [/ינואר/, 1],
  [/פברואר/, 2],
  [/מר[םץס]|מארס/, 3],
  [/אפריל/, 4],
  [/מאי/, 5],
  [/יוני/, 6],
  [/יולי/, 7],
  [/אוגוסט/, 8],
  [/ספטמבר/, 9],
  [/אוקטובר/, 10],
  [/נובמבר/, 11],
  [/דצמבר/, 12],
];

/** Every month token in order of appearance, with where it starts and ends. */
function monthTokens(text: string): { month: number; at: number; end: number }[] {
  const out: { month: number; at: number; end: number }[] = [];
  for (const [re, n] of MONTHS) {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(text))) out.push({ month: n, at: m.index, end: m.index + m[0].length });
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Whether the text sitting between two month words joins them into a range.
 *
 * A range is written "April-June" or "April until June". A list is written
 * "April, June" or "April and June". The difference is entirely in this gap, so
 * it is matched exactly rather than searched loosely - a comma between two
 * months must never be read as a span, or "March, September" becomes seven
 * months including the summer the sentence is warning about.
 */
function joinsAsRange(gap: string): boolean {
  return /^\s*[-–—]\s*$/.test(gap) || /^\s*עד\s*$/.test(gap);
}

/**
 * The part of the sentence that recommends, before any caution.
 *
 * Cuts at the first parenthesis, full stop, or dash that stands between spaces.
 * A hyphen inside a range ("April-June") has no spaces around it and survives.
 */
export function recommendationSegment(bestSeason: string): string {
  const cut = bestSeason.search(/[(.]| [-–—] /);
  return (cut === -1 ? bestSeason : bestSeason.slice(0, cut)).trim();
}

/** Inclusive month span, wrapping the year: 11..3 is Nov, Dec, Jan, Feb, Mar. */
function span(from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === to) break;
    if (out.length > 12) break;
  }
  return out;
}

/**
 * The months a destination is recommended in, or [] when the sentence does not
 * say plainly enough to be worth acting on.
 */
export function bestMonthsOf(bestSeason?: string): number[] {
  if (!bestSeason) return [];
  const seg = recommendationSegment(bestSeason);
  const tokens = monthTokens(seg);
  if (!tokens.length) return [];

  const months = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    const next = tokens[i + 1];
    if (next && joinsAsRange(seg.slice(cur.end, next.at))) {
      for (const m of span(cur.month, next.month)) months.add(m);
      i++; // the second month closed this range; it does not open another
      continue;
    }
    months.add(cur.month);
  }
  return [...months].sort((a, b) => a - b);
}
