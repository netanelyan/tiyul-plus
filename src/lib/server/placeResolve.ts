import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * ---------- Who decided this was Bratislava? ----------
 *
 * Netanel typed a misspelled city name. The agent quietly decided
 * it was Bratislava, built a two-day route and created a trip. Not a single
 * line of code was involved in that decision: `findDestination` requires an
 * exact substring match, so it recognized nothing - **the name interpretation
 * happened entirely inside the model**, against an index of 166 destinations,
 * with no step a test could be written for.
 *
 * This file is the same pattern that has already worked here three times
 * (`priceGuard`, `filterKosherUnlessOptedIn`, `modelRoute`): **a structural
 * guarantee instead of prompt discipline.** The match is computed in code, the
 * verdict is handed to the model as a fact, and in the "several options" state
 * the city-choosing tools are simply **blocked for this turn** - meaning the
 * model cannot choose even if it wants to.
 *
 * ## The three outcomes, exactly as Netanel phrased them
 *
 * | outcome | what happens |
 * |---|---|
 * | `one` - a single clear match | use it, and say so in one short sentence |
 * | `many` - several plausible ones | ask which, and offer them. Tools blocked |
 * | *nothing close* | no verdict is returned at all - it is an ordinary word or a city we do not cover, and the existing rule ("not covered, here is what is") handles it |
 *
 * ## Why we do not return an explicit `none`
 *
 * Because without a model there is no way to tell "a city we did not cover"
 * from an ordinary Hebrew word. A token with no close neighbor in the catalog
 * simply goes unreported - and that is the safe direction to err in: a wrong
 * verdict on an ordinary word would have stopped a perfectly good conversation.
 */

/* ---------- Normalization ---------- */

/** Final letters - so a name with a final form and one without look the same even after truncation */
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * Prefix letters at the start of a word. The Hebrew prepositional prefixes
 * (b/l/m/h/v/sh/k) are how an Israeli writes a city in most sentences
 * ("in Barcelona", "to Vienna" as one word), and without stripping them every
 * edit distance starts one character in debt.
 *
 * **The full form is kept too**: some country names begin with a letter that is
 * NOT a prefix letter, so the comparison runs against both forms and the
 * better of the two is taken.
 */
const PREFIXES = /^[בלמהושכ]/;

export function normalizeName(s: string): string {
  return (s ?? '')
    .replace(/[֑-ׇ]/g, '') // niqqud and cantillation marks
    .replace(/["'`״׳.,()\-–—]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** The two forms being compared: as written, and also without a leading prefix letter */
function forms(token: string): string[] {
  const n = normalizeName(token);
  const out = [n];
  // From 4 characters up, because a prefixed "in Japan" is four letters and
  // "Japan" is the answer. In the version with the threshold at 5, the
  // traveler who wrote "a week in Japan" got 'I understood Japan (you wrote
  // "in Japan")'. Down to two letters, because words like "and to Jerusalem"
  // or "and in Vienna" are ordinary Hebrew.
  let cur = n;
  for (let i = 0; i < 2; i++) {
    if (cur.length >= 4 && PREFIXES.test(cur)) {
      cur = cur.slice(1);
      out.push(cur);
    } else break;
  }
  return out;
}

/* ---------- Edit distance ---------- */

/**
 * Damerau-Levenshtein (with adjacent transposition).
 *
 * The transposition matters here and is not decoration: the misspelling that
 * started all this vs. "Barcelona" is exactly the typo where one letter was
 * swapped and one doubled, and it is also the pattern of the common
 * "Bratislava" misspellings.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let cur: number[] = [];
  let before: number[] = prev2;
  for (let i = 1; i <= a.length; i++) {
    cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, before[j - 2] + cost);
      }
      cur[j] = v;
    }
    before = prev;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * How many errors are allowed for a word of a given length.
 *
 * **A scale, not a fixed number**, because two errors in a four-letter word
 * are a completely different word, while in a nine-letter word they are a
 * typo. This scale is what keeps "Kyiv" (a city we do not cover) from being
 * mistakenly caught as "Krakow".
 */
function tolerance(len: number): number {
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

/* ---------- The catalog, once ---------- */

export interface NameEntry {
  /** A destination slug. For a country - its first destination, exactly like `findDestination` */
  slug: string;
  /** The name shown to the traveler */
  label: string;
  /** What is compared against */
  norm: string;
}

/** Built once per process - the catalog is static */
let entriesCache: NameEntry[] | null = null;
export function nameEntries(): NameEntry[] {
  if (entriesCache) return entriesCache;
  const out: NameEntry[] = [];
  const push = (slug: string, label: string, raw: string) => {
    const norm = normalizeName(raw);
    if (norm.length >= 3) out.push({ slug, label, norm });
  };
  for (const d of destinations) {
    push(d.slug, d.name, d.name);
    if (d.nameLocal) for (const part of d.nameLocal.split('/')) push(d.slug, d.name, part);
    push(d.slug, d.name, d.slug.replace(/-/g, ' '));
  }
  for (const c of countries) {
    const first = destinations.find((d) => d.countrySlug === c.slug);
    if (!first) continue;
    push(first.slug, c.name, c.name);
    if (c.nameLocal) push(first.slug, c.name, c.nameLocal);
  }
  entriesCache = out;
  return out;
}

/**
 * A name that exists in the catalog as-is - there is nothing to interpret here.
 *
 * **A whole word inside a compound name also counts as exact**, and that is
 * not indulgence: the catalog's destination name is "Tokyo and Mount Fuji",
 * and without this rule the token "Tokyo" would not have been exact, would
 * have been measured against the whole catalog, and would have landed on
 * **Turkey** at distance 2. I sent a traveler bound for Japan to Turkey in the
 * first test of this file.
 */
let wordCache: Set<string> | null = null;
function catalogWords(): Set<string> {
  if (wordCache) return wordCache;
  const set = new Set<string>();
  for (const e of nameEntries()) {
    set.add(e.norm);
    for (const w of e.norm.split(' ')) if (w.length >= 3) set.add(w);
  }
  wordCache = set;
  return set;
}

export function isExactName(token: string): boolean {
  const set = catalogWords();
  return forms(token).some((f) => set.has(f));
}

/* ---------- Words that are not place names ---------- */

/**
 * Common words that survive the filtering and can land close to a catalog
 * name. Every row here was measured on real sentences, not guessed: "visa"
 * landed on Vienna, "recommendation" on Malta, "history"
 * on Istria.
 *
 * **The list is a noise filter, not the guarantee.** The guarantee is
 * `cityGate`, which blocks only when the tool picked a city related to the
 * token - so a noisy verdict on a word nobody chose by does nothing. The list
 * is deliberately short: every word here is a chance to miss a real name.
 */
const STOPWORDS = new Set(
  [
    'טיול', 'טיולים', 'מסלול', 'מסלולים', 'ימים', 'יומיים', 'שבוע', 'שבועיים', 'חופשה', 'נופש',
    'לטייל', 'לטוס', 'טיסה', 'טיסות', 'מלון', 'מלונות', 'לינה', 'ילדים', 'משפחה', 'זוגי',
    'תקציב', 'כשר', 'כשרות', 'שבת', 'מוזיאון', 'מסעדה', 'מסעדות', 'שופינג', 'קניות', 'חוף',
    'הרים', 'מפה', 'עצירה', 'עצירות', 'בבקשה', 'תודה', 'רוצה', 'רוצים', 'אפשר', 'אולי',
    'תבנה', 'תכנן', 'תוסיף', 'תוריד', 'תזיז', 'תעביר', 'תמחק', 'התכוונתי', 'התכוונו',
    'סליחה', 'טעות', 'במקום', 'בעצם', 'אמרתי', 'כתבתי', 'ביקשתי', 'לילות', 'קיץ', 'חורף',
    'אביב', 'סתיו', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'סופש',
    'לילה', 'בוקר', 'ערב', 'צהריים', 'שעה', 'שעות', 'דקות', 'רגוע', 'רגועה',
    'ויזה', 'המלצה', 'המלצות', 'היסטוריה', 'שמונה', 'שבעה', 'שישה', 'חמישה',
    'ארבעה', 'שלושה', 'עשרה', 'עשרים', 'טבע', 'אגמים', 'סים',
  ].map(normalizeName),
);

/** A stopword in any of the word's forms - a prefixed "at night" is derived to "night" and rejected thanks to it */
const isStopword = (token: string): boolean => forms(token).some((f) => STOPWORDS.has(f));

/* ---------- The verdict ---------- */

export interface NameVerdict {
  /** What the traveler typed, as typed */
  typed: string;
  kind: 'one' | 'many';
  /** In the `one` state - the match. In the `many` state - the options, by closeness */
  options: { slug: string; label: string }[];
}

/** Unique matches by slug, sorted by distance */
function bestMatches(token: string): { slug: string; label: string; dist: number }[] {
  const byslug = new Map<string, { slug: string; label: string; dist: number }>();
  for (const form of forms(token)) {
    for (const e of nameEntries()) {
      /*
        **The tolerance is derived from the shorter of the two**, and without
        this the file is noisy. Measured on ten ordinary Hebrew messages:
        "recommendation" landed on Malta, "and many" on Warsaw, "medium" on
        Greece - all five-six letter words measured at their own tolerance
        against a four-letter catalog name. A short name demands a closer
        match, otherwise every other Hebrew word is a destination.
      */
      /*
        And additionally **at most one error per four letters**. This is what
        removed the remaining noise: "Italian"→Italy, "romantic"→Romania,
        "recommendation"→Malta, "wine"→Japan - all two errors in a five-six
        letter word, i.e. a third of the word. A real typo is a small fraction
        of the word; a productive Hebrew suffix is not.
      */
      const tol = Math.min(
        tolerance(form.length),
        tolerance(e.norm.length),
        Math.floor(0.25 * Math.max(form.length, e.norm.length)),
      );
      // A length gap larger than the tolerance cannot improve - a real saving over 166 destinations
      if (Math.abs(e.norm.length - form.length) > tol) continue;
      const dist = editDistance(form, e.norm);
      if (dist > tol) continue;
      const prev = byslug.get(e.slug);
      if (!prev || dist < prev.dist) byslug.set(e.slug, { slug: e.slug, label: e.label, dist });
    }
  }
  return [...byslug.values()].sort((a, b) => a.dist - b.dist || a.label.localeCompare(b.label));
}

/**
 * The verdict for a single token. `null` = nothing to say about it.
 *
 * **"Clear" is defined here in numbers, not by feel**, with three conditions:
 *
 * 1. A single match, or
 * 2. The second is at least two errors farther than the first, or
 * 3. **Only one error in the first, and all the rest are worse.** This
 *    condition was added after measurement: a one-letter typo of "Madrid"
 *    produced "Madrid or Egypt?" - Madrid at distance 1 and Egypt at
 *    distance 2, i.e. a gap of one, i.e. "several plausible" under the
 *    previous rule. A question like that is worse than choosing. A single
 *    typo is the most unambiguous form of a match, so it wins over anything
 *    farther from it.
 *
 * What remains `many` is exactly the case that needs it: **a tie.** The
 * misspelling "Viana" is one error away from both Vienna and Vilnius,
 * and there is no basis whatsoever for choosing.
 */
export function resolveToken(token: string): NameVerdict | null {
  const norm = normalizeName(token);
  if (norm.length < 3 || isStopword(token)) return null;
  if (isExactName(token)) return null;
  const matches = bestMatches(token);
  if (matches.length === 0) return null;
  const clear =
    matches.length === 1 ||
    matches[1].dist - matches[0].dist >= 2 ||
    (matches[0].dist <= 1 && matches[1].dist > matches[0].dist);
  if (clear) {
    return { typed: token, kind: 'one', options: [{ slug: matches[0].slug, label: matches[0].label }] };
  }
  return {
    typed: token,
    kind: 'many',
    options: matches
      .filter((m) => m.dist - matches[0].dist <= 1)
      .slice(0, 4)
      .map((m) => ({ slug: m.slug, label: m.label })),
  };
}

/** Candidate words from a message: Hebrew or Latin, three letters or more */
export function candidateTokens(text: string): string[] {
  const raw = (text ?? '').match(/[֐-׿A-Za-z][֐-׿A-Za-z'׳״-]{2,}/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const n = normalizeName(t);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(t);
  }
  return out;
}

/**
 * The verdict for a whole message. Runs **on every turn**, not only the
 * first - this is what Netanel asked for explicitly, because a city name gets
 * interpreted in a correction and mid-conversation too.
 */
export function resolveMessage(text: string): NameVerdict[] {
  const out: NameVerdict[] = [];
  for (const token of candidateTokens(text)) {
    const v = resolveToken(token);
    if (v) out.push(v);
  }
  return out;
}

/** The slugs that must not be chosen from unassisted this turn */
export function blockedSlugs(verdicts: NameVerdict[]): Set<string> {
  const out = new Set<string>();
  for (const v of verdicts) {
    if (v.kind !== 'many') continue;
    for (const o of v.options) out.add(o.slug);
  }
  return out;
}

/** Whether the message names something that exists in the catalog as-is */
export function namesCatalogExactly(text: string): boolean {
  return candidateTokens(text).some((t) => isExactName(t));
}

/* ---------- The gate ---------- */

export type CityGate = { ok: true; note: string } | { ok: false; message: string };

/**
 * **The gate itself, and it is the reason this file exists.**
 *
 * The block sent to the model is an instruction, and this project's history
 * says instructions get swallowed. So the ruling is enforced at the tool
 * level too: before a city-choosing tool executes, its choice is measured
 * against what the traveler **actually typed**.
 *
 * Three outcomes:
 *
 * 1. **The word is close to several destinations and the tool picked one of
 *    them** - fail. This is exactly "must not choose", and the model gets the
 *    options back so it will ask.
 * 2. **The word resolves to one destination and the tool picked a different
 *    one** - fail. This is the case that actually happened: the misspelling
 *    resolves to Barcelona, and the model picked Bratislava.
 * 3. **Otherwise** - pass, and if there was an interpretation, return a short
 *    sentence the model must say (e.g. 'I understood Barcelona - you wrote
 *    the misspelled form').
 *
 * `chosen` are the slugs the tool is about to write. The check runs only when
 * the message does **not** name a catalog name as-is: whoever wrote "Rome"
 * cleanly needs nobody interpreting anything for them, and a noisy verdict on
 * another word in the same message must not block them.
 */
export function cityGate(lastUserText: string, chosen: string[]): CityGate {
  const uniq = [...new Set(chosen.filter(Boolean))];
  if (uniq.length === 0) return { ok: true, note: '' };
  if (namesCatalogExactly(lastUserText)) return { ok: true, note: '' };

  const verdicts = resolveMessage(lastUserText);
  if (verdicts.length === 0) return { ok: true, note: '' };

  for (const v of verdicts) {
    const slugs = v.options.map((o) => o.slug);
    if (v.kind === 'many' && uniq.some((s) => slugs.includes(s))) {
      const list = v.options.map((o) => o.label).join(' או ');
      return {
        ok: false,
        message:
          `לא בוצע. המטייל כתב "${v.typed}", וזה קרוב באותה מידה ליותר מיעד אחד בקטלוג: ${list}. ` +
          `אסור לבחור עבורו. שאל אותו בעברית באיזה מהם התכוון, הצע בדיוק את האפשרויות האלה, וקרא ל-suggest_quick_replies עם השמות. ` +
          `אל תיצור ואל תשנה טיול עד שיענה.`,
      };
    }
    if (v.kind === 'one' && !uniq.includes(v.options[0].slug)) {
      return {
        ok: false,
        message:
          `לא בוצע. המטייל כתב "${v.typed}". ההתאמה בקטלוג היא ${v.options[0].label} (${v.options[0].slug}), ולא מה שבחרת. ` +
          `אם התכוונת ל${v.options[0].label} - קרא לכלי שוב עם ${v.options[0].slug}. אם אתה חושב שהמטייל התכוון למשהו אחר - שאל אותו, אל תבחר.`,
      };
    }
  }

  const one = verdicts.find((v) => v.kind === 'one' && uniq.includes(v.options[0].slug));
  return {
    ok: true,
    note: one
      ? ` המטייל כתב "${one.typed}" ולא בדיוק את שם היעד; אמור לו במשפט קצר שהבנת ${one.options[0].label}.`
      : '',
  };
}

/**
 * The block sent to the model. Sent **last** in the system sequence, like
 * `OUTPUT_DISCIPLINE` - the project's log documents that a rule sitting at
 * the top of a long prompt gets swallowed, and that the same rule at the end
 * works.
 */
export function verdictBlock(verdicts: NameVerdict[]): string {
  if (verdicts.length === 0) return '';
  const lines = verdicts.map((v) => {
    if (v.kind === 'one') {
      return `- המטייל כתב "${v.typed}". ההתאמה היחידה הקרובה בקטלוג היא ${v.options[0].label} (${v.options[0].slug}). השתמש בה, ואמור זאת במשפט קצר - למשל "הבנתי ${v.options[0].label} (כתבת ${v.typed})". אל תשאל.`;
    }
    const list = v.options.map((o) => `${o.label} (${o.slug})`).join(' / ');
    return `- המטייל כתב "${v.typed}", וזה קרוב ליותר מיעד אחד: ${list}. **אסור לבחור עבורו.** שאל באיזו התכוון והצע בדיוק את האפשרויות האלה, וקרא ל-suggest_quick_replies עם השמות. אל תיצור ואל תשנה טיול בתור הזה עד שיענה.`;
  });
  return `PLACE NAME RESOLUTION - computed by the server from the catalog, not by you. This overrides any guess you would make:\n${lines.join('\n')}`;
}
