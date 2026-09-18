/**
 * ---------- What the traveller asked for, and what a place actually is ----------
 *
 * One closed vocabulary, used from both ends:
 *
 *   focus of a REQUEST  - read from the traveller's own Hebrew words
 *   focus of a PLACE    - read from its category and tags in the catalog
 *
 * It exists because of a reported bug that is easy to state and impossible to
 * fix with a prompt: a traveller asked for **nature - mountains, lakes and
 * trails, no cities at all**, and two of the four photographs under the answer
 * were a city skyline and a basilica. Nothing was invented and nothing was
 * mis-resolved; the pictures were simply the first four catalog names the reply
 * happened to mention, in the order it mentioned them. What was missing was any
 * notion of what the person had asked for.
 *
 * ## Why one vocabulary and not two
 *
 * `generate.ts` already carries a narrow Hebrew interest map for the wizard's
 * free-text field (`INTEREST_TAGS`, seven single-word patterns). It is the
 * older, thinner twin of this file and it stays where it is - the wizard's
 * input is a short phrase somebody typed into a form, and the chat's is a
 * whole conversation. What this file must not become is a *second* opinion on
 * the same question, so the two ends here - request and place - are deliberately
 * in one module: whoever widens the Hebrew must see, on the same screen, what a
 * place is scored as.
 *
 * ## Hebrew boundaries are the whole risk
 *
 * Every matcher here is a Hebrew word, and this project has already been bitten
 * nine separate times by a Hebrew token sitting inside an unrelated word (see
 * `hebrewMatch.ts` - the word for Europe contains the word for euro). So every
 * alternative goes through `heWord`, and the genuinely ambiguous words are
 * simply not in the list rather than being written cleverly:
 *
 * | rejected  | means  | and also means         |
 * |-----------|--------|------------------------|
 * | `kanyon`  | canyon | a shopping mall        |
 * | `alafim`  | Alps   | thousands              |
 * | `bira`    | beer   | a capital city         |
 * | `layla`   | night  | one night's lodging    |
 *
 * A word that points two ways cannot be used to decide which way the answer
 * should point.
 */

import type { Place, PlaceCategory, PlaceTag } from '@/lib/types';
import { heWord } from '@/lib/hebrewMatch';

/**
 * The closed set. Seven of the eight are exactly `PlaceTag`, so the catalog is
 * already annotated in this vocabulary; `shopping` is added because it is a
 * category rather than a tag (a trap this project's log records more than once:
 * `'shopping'` is a valid `PlaceCategory` and NOT a valid `PlaceTag`).
 */
export type Interest = PlaceTag | 'shopping';

/**
 * A category is evidence about a place on its own, and it has to be, because
 * the tags are not complete: measured against the catalog, 51 of the 594
 * nature/viewpoint places carry no `outdoors` tag and 8 places carry no tags at
 * all. Reading only the tags would silently drop them out of a nature answer.
 */
const BY_CATEGORY: Partial<Record<PlaceCategory, Interest[]>> = {
  nature: ['outdoors'],
  historic: ['history'],
  museum: ['art'],
  food: ['foodie'],
  cafe: ['foodie'],
  'kosher-food': ['foodie'],
  // A market is both something to eat at and something to browse; the catalog's
  // own bar for the category is "a market worth walking".
  market: ['foodie', 'shopping'],
  'kosher-market': ['foodie', 'shopping'],
  shopping: ['shopping'],
  // `attraction` is deliberately absent. It is the catalog's generic bucket -
  // what is left after the historic split - so it says nothing about character
  // and its places are scored on their tags alone.
  //
  // `viewpoint` is absent for the opposite reason: it says two different things.
  // A viewpoint is a mountain lookout in the Dolomites and an observation deck
  // on top of a tower in Bangkok, and reading it as nature is what put New York
  // and Barcelona in the outdoors list on the first run of this. The catalog
  // already separates the two properly - 101 of the 136 viewpoints carry the
  // `outdoors` tag - so a viewpoint is scored on its tags, where the difference
  // is actually recorded.
};

/** What this place offers, from its category and its tags together. */
export function interestsOfPlace(place: Place): Interest[] {
  const out = new Set<Interest>(BY_CATEGORY[place.category] ?? []);
  for (const t of place.tags ?? []) out.add(t);
  return [...out];
}

/* ---------- Reading the request ---------- */

/**
 * Hebrew (and a little English) per interest. Alternatives are longest-first,
 * because the engine takes the first that matches - see `heWord`.
 *
 * Inflections are listed rather than matched by prefix. Allowing a suffix would
 * be shorter to write and would match `har` (mountain) inside `harbe` (a lot),
 * `tev'a` (nature) inside `taba'at` (a ring), and so on.
 */
const PATTERNS: [Interest, RegExp][] = [
  [
    'outdoors',
    new RegExp(
      heWord(
        'טבעיים', 'טבעית', 'טבעי', 'טבע',
        'הררי', 'הרים', 'הר',
        'אגמים', 'אגם',
        'מסלולים', 'מסלול',
        'הליכות', 'הליכה',
        'טרקים', 'טרק',
        'מפלים', 'מפל',
        'יערות', 'יער',
        'נופים', 'נופי', 'נוף',
        'פארקים', 'פארק',
        'שמורות', 'שמורה',
        'פסגות', 'פסגה',
        'שבילים', 'שביל',
        'חופים', 'חוף',
        'פיורדים', 'פיורד',
        'מדבריות', 'מדבר',
        'הרפתקה',
        'טיפוס',
        'סקי',
        'צלילה',
        'אאוטדור',
        'hiking', 'nature', 'trek', 'trekking', 'mountains', 'lakes',
      ),
      'i',
    ),
  ],
  [
    'history',
    new RegExp(
      heWord(
        'היסטוריים', 'היסטורית', 'היסטורי', 'היסטוריה',
        'עתיקות', 'עתיקה', 'עתיק',
        'מורשת',
        'טירות', 'טירה',
        'מבצרים', 'מבצר',
        'ארמונות', 'ארמון',
        'מנזרים', 'מנזר',
        'מקדשים', 'מקדש',
        'ארכיאולוגי', 'ארכיאולוגיה',
        'history', 'historic', 'castles', 'ruins',
      ),
      'i',
    ),
  ],
  [
    'art',
    new RegExp(
      heWord(
        'מוזיאונים', 'מוזיאון',
        'גלריות', 'גלריה',
        'אמנות',
        'אדריכלות',
        'תרבות',
        'museums', 'museum', 'art', 'galleries',
      ),
      'i',
    ),
  ],
  [
    'foodie',
    new RegExp(
      heWord(
        'קולינריה', 'קולינרי',
        'מסעדות', 'מסעדה',
        'שווקים', 'שוק',
        'אוכל',
        'יינות', 'יין',
        'גלידה',
        'טעימות',
        'קפה',
        'שף',
        'food', 'foodie', 'culinary', 'restaurants', 'markets', 'wine',
      ),
      'i',
    ),
  ],
  [
    'shopping',
    new RegExp(
      heWord(
        'שופינג',
        'קניות',
        'אאוטלטים', 'אאוטלט',
        'חנויות',
        'מותגים',
        'בגדים',
        'shopping', 'outlet', 'outlets',
      ),
      'i',
    ),
  ],
  [
    'nightlife',
    new RegExp(
      // "layla" alone is not here: on this site it is far more often one
      // night's lodging than a night out.
      heWord('חיי לילה', 'מועדונים', 'מועדון', 'מסיבות', 'מסיבה', 'ברים', 'פאבים', 'פאב', 'בילויים', 'nightlife', 'clubs', 'bars'),
      'i',
    ),
  ],
  /*
    `families` and `romantic` are deliberately NOT readable from a request, and
    this cost a wrong answer before it was noticed.

    They describe WHO is travelling, not what the traveller wants to see - and
    on this site who is travelling comes up in almost every planning turn,
    because the agent is required to ask it before the first build. So the
    reported conversation read, on the very next message, like this:

      "nature in Europe - mountains, lakes and trails, no cities at all"
      "8 days, a couple, with a car"        <- "a couple" scored as `romantic`

    and the second message quietly replaced the interest stated in the first.
    Party composition already has its own home (`set_preferences`, and the
    `party` preference the wizard and the scorer both read); it has no business
    competing with a statement about what to do.

    Both stay in `interestsOfPlace`, because the catalog genuinely annotates
    places that way - a place can OFFER them; a request just cannot ask for them
    in words that also mean something else.
  */
];

/** What one message asks for. Empty when it states no interest at all. */
export function interestsOfText(text: string): Interest[] {
  const s = text ?? '';
  if (!s.trim()) return [];
  return PATTERNS.filter(([, re]) => re.test(s)).map(([i]) => i);
}

/**
 * What the CONVERSATION asks for: **the newest statement of interest wins.**
 *
 * Walking back to the last message that named an interest, rather than taking
 * the union of everything, is the whole point. A traveller who opens with
 * "nature, no cities" and three turns later says "8 days, a couple, with a car"
 * has not stopped wanting nature - that later message simply says nothing on
 * the subject, so it must not erase the earlier one. But when they DO change
 * the subject ("what about a day in Venice?"), the new message is the answer
 * and the old one is history.
 *
 * The honest cost: a message that changes the subject **without** naming a new
 * interest inherits the old one. That is the side to be wrong on here - the
 * reported bug is a nature request that kept being answered with city
 * photographs, i.e. an interest that was forgotten too fast, not too slowly.
 *
 * @param userTexts the traveller's own messages, oldest first. Never the
 *   agent's - the same rule as the kosher gate: if its own replies counted,
 *   one mention by the agent would keep an interest alive by itself.
 */
export function interestsOfConversation(userTexts: string[], lookBack = 6): Interest[] {
  const recent = userTexts.slice(-lookBack);
  for (let i = recent.length - 1; i >= 0; i--) {
    const found = interestsOfText(recent[i]);
    if (found.length > 0) return found;
  }
  return [];
}

/* ---------- What a destination is ---------- */

/**
 * When a destination "is" a certain character.
 *
 * ## A fixed share was the first rule, and the catalog outgrew it
 *
 * The rule here was `>= 25% of the destination's places`. It measured well when
 * destinations averaged ~11 places. By the time the catalog reached 3,116 places
 * across the same 166 destinations - an average of 18.8, filled in by data
 * passes that added nature, food and market places in bulk - the same threshold
 * had broken in **both** directions at once:
 *
 *   outdoors 124/166 (75%)   history 98/166 (59%)
 *   art 1/166                foodie 2/166            shopping 0/166
 *
 * So two traits described three quarters of the catalog and three traits
 * described nothing. Both halves are failures: a trait four destinations in five
 * share cannot separate them, and "which of ours are shopping destinations" has
 * no answer at all.
 *
 * A fixed threshold cannot fix this, and that is the point rather than a tuning
 * miss. Raising it would prune the common traits and leave the rare ones at
 * zero forever, because museums, food and shops are a minority of *every*
 * city's places - there is no cutoff at which they become a quarter.
 *
 * ## The rule, which this repo had already arrived at once
 *
 * Among the destinations that have a trait **at all**, those whose share is in
 * the top forty percent carry it. It reads as "the destinations where this
 * stands out most", it needs no per-trait number, and it holds as the catalog
 * grows because it is relative to the catalog.
 *
 * This is deliberately the same rule - and the same 0.4 - as `VIBE_TOP_SHARE`
 * in `destinationFacets.ts`, which reached it by rejecting exactly the two
 * approaches that just failed here (an absolute count: 139 of 150 "nature"; a
 * fixed 25% ratio: nature 128, history 113, nightlife zero). Worth reading next
 * to this comment.
 *
 * **They are two constants on purpose, not a missed de-duplication.** That one
 * scores UI filter chips from place *tags*; this one scores the model's own
 * directory from place *categories*. Sharing a constant would mean a tuning
 * change for a filter chip silently rewrites what the agent is told the catalog
 * contains, and that is the more expensive of the two to get wrong.
 *
 * ## One more rule tried and rejected, because it undid the reported bug
 *
 * Ranking by share alone leaves a big mixed city out of everything: Rome is 38%
 * historic of its classified places against a 40% cutoff, so it carries no
 * `history`. The obvious repair is to add a second, absolute path - also take
 * the destinations whose raw *count* for a trait is in the top 40% - so that
 * depth qualifies as well as proportion. It does fix Rome.
 *
 * It was rejected because it brings back the defect this whole file exists for:
 * with a count path, **New York, Barcelona, Prague and Vienna all become
 * `outdoors`** again, on the strength of having eight or more nature places
 * simply by being large. Proportion is exactly what separates "has many parks
 * because it is a big city" from "is a nature destination", and an absolute
 * count cannot make that distinction at any threshold.
 *
 * So a broad city genuinely carries few traits here, and that is the honest
 * answer rather than a gap: its places really do spread evenly. The legend in
 * the grounding index says so, and tells the model that absence is not a reason
 * to leave a destination out.
 */
const CHARACTER_TOP_SHARE = 0.4;

/**
 * A floor under the relative rule. Being in the top 40% of a trait nobody has
 * much of would otherwise let a single place characterise a destination - one
 * museum in fifty places is not an art destination, however rare museums are.
 */
const CHARACTER_MIN_SHARE = 0.08;

/** At most this many traits, so the field stays a label and not a report. */
const MAX_CHARACTER = 3;

/**
 * The share of a destination's *classified* places that map to each character.
 *
 * The denominator is the places whose category says something, not every place.
 * `attraction` and `viewpoint` map to no character on purpose (see
 * `BY_CATEGORY`), and counting them in the denominator deflated every trait of
 * every destination that has many of them - worst exactly where it mattered
 * most, because a wild destination's scenery is often filed as `attraction` or
 * `viewpoint`. Measured: Lofoten is 7 nature places of 18, i.e. 39% and below
 * the bar, while 7 of its 18 are unclassifiable; of the 11 places that do say
 * something, 7 are nature - 64%, which is what it plainly is.
 *
 * So this asks "of what we can read, how much is X", which is the honest
 * question. It does not invent a character for a destination we cannot read: no
 * classified places means no character at all.
 */
function characterShares(places: Place[]): Map<Interest, number> {
  const shares = new Map<Interest, number>();
  const counts = new Map<Interest, number>();
  let classified = 0;
  for (const p of places) {
    const traits = BY_CATEGORY[p.category];
    if (!traits?.length) continue;
    classified++;
    for (const i of traits) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  if (classified === 0) return shares;
  for (const [i, n] of counts) shares.set(i, n / classified);
  return shares;
}

/**
 * The character of every destination in the catalog, slug -> traits, strongest
 * first.
 *
 * This is the half of the fix that is about the model rather than the pictures.
 * The grounding index gives it every city's slug, name and place list and
 * nothing about what any city IS - so "I want nature in Europe" can only be
 * answered from what the model happens to recognise, and a live answer named
 * four nature destinations out of the dozens we hold. Everything else in the
 * catalog is invisible to that question, which is precisely the wrong way round
 * for a site whose data is the product.
 *
 * Computed rather than authored, so it cannot drift from the catalog and costs
 * nobody a data pass.
 *
 * **Categories only, not tags** - and that is the difference between a label
 * that means something and one that does not. Tags say who a place suits, and
 * they are sprayed widely: `outdoors` sits on a large share of the shopping
 * places and `romantic` on a quarter of everything, so scoring tags too made
 * "outdoors" describe four destinations in five. Categories say what a place
 * *is*, which is the question being asked here.
 *
 * Catalog-wide rather than per-destination because the rule is relative: see
 * `CHARACTER_TOP_SHARE` for why a per-destination threshold cannot work, and
 * why the per-destination version of this function was removed rather than
 * re-tuned. Callers compute this once and look slugs up, so the ranking runs
 * once per process rather than once per destination.
 */
export function destinationCharacters<T extends { slug: string; places: Place[] }>(
  all: T[],
): Map<string, Interest[]> {
  const shares = new Map<string, Map<Interest, number>>();
  for (const d of all) shares.set(d.slug, characterShares(d.places));

  /*
    The cutoff per trait: the share at the top-40% mark among the destinations
    that have any of it. Destinations with none are excluded from the ranking
    rather than counted as zero - otherwise a rare trait's cutoff would be set
    by the majority that lacks it, which is how "nightlife: zero" happened in
    the filter-chip version of this rule.
  */
  const traits = new Set<Interest>();
  for (const m of shares.values()) for (const i of m.keys()) traits.add(i);

  const cutoff = new Map<Interest, number>();
  for (const trait of traits) {
    const ranked = [...shares.values()]
      .map((m) => m.get(trait) ?? 0)
      .filter((v) => v > 0)
      .sort((a, b) => b - a);
    if (ranked.length === 0) continue;
    const at = Math.max(0, Math.ceil(ranked.length * CHARACTER_TOP_SHARE) - 1);
    cutoff.set(trait, Math.max(ranked[at], CHARACTER_MIN_SHARE));
  }

  const out = new Map<string, Interest[]>();
  for (const [slug, m] of shares) {
    out.set(
      slug,
      [...m.entries()]
        .filter(([trait, share]) => share >= (cutoff.get(trait) ?? Infinity))
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_CHARACTER)
        .map(([trait]) => trait),
    );
  }
  return out;
}
