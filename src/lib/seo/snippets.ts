import type { Country, Destination } from '@/lib/types';
import { hePrefix, inHe } from '@/lib/hebrew';
import { daysHe } from '@/lib/duration';
import { HOME_COUNTRY_SLUG, isDomestic } from '@/lib/domestic';
import { SNIPPET_OVERRIDES } from '@/data/seoOverrides';
import { flightFact, kosherFact, seasonFact, visaFact } from './facts';

/**
 * ---------- What a search result shows for a catalog page ----------
 *
 * Title, meta description and the on-page H1 for the three catalog page types:
 * destination, country and itinerary. One builder per type, so the page files
 * hold no copy and the tests can run every page without rendering any.
 *
 * ## Why these templates (October 2026)
 *
 * Search Console, 17 Sep - 5 Oct: 2,253 impressions and 6 clicks. Six destination
 * pages sat on page one with no clicks at all. Every destination shared one long
 * template that Google cut off in Hebrew results, that never used the words people
 * typed, and that gave no reason to pick this result over the next one. The queries
 * that did reach us had four shapes: the bare place name, "trip to X", "X for
 * Israelis" and "trip to X in N days", plus "visa to X" for countries.
 *
 * So each title opens with the query shape its page type answers, and spends the
 * rest on one or two facts from that page's own data:
 *
 * - destination: "X for Israelis" (the name first, so a bare-name query matches
 *   from the first word), then a direct flight and its length, kosher restaurants,
 *   the itinerary length, or the season - the first two that fit.
 * - country: "trip to X", then the visa answer when the catalog states it plainly,
 *   and how many destinations have a ready itinerary.
 * - itinerary: "trip to X N days", then the stop count.
 *
 * Domestic pages say "trip in X" and never mention flights or visas; see `domestic.ts`.
 *
 * ## The rule every word here follows
 *
 * A snippet states only what its page's data states. The facts come from `facts.ts`,
 * which refuses anything it cannot quote, and `snippets.test.ts` re-checks every
 * page against its data: numbers, visa wording, kosher wording, direct flights.
 * The hand-written overrides in `@/data/seoOverrides` go through the same test.
 */

export const TITLE_SUFFIX = ' | טיול+';
/** Characters before the suffix. Hebrew results cut a title at roughly this width. */
export const TITLE_BUDGET = 55;
/** The target for a description; the test enforces a looser 120-160. */
export const DESCRIPTION_TARGET = { min: 140, max: 155 } as const;

export interface Snippet {
  /** The title without the site suffix - the part the budget measures. */
  head: string;
  /** The full <title>, also used for og:title and twitter:title. */
  title: string;
  description: string;
  h1: string;
  /** True when title and description come from the hand-written overrides file. */
  overridden: boolean;
}

// ---------- Composition helpers ----------

/**
 * The query words, then the first reasons that fit the budget (at most `max`).
 * A reason may be a list of phrasings, longest first; the first that fits is used
 * and the rest of that list is skipped, so one fact is never stated twice.
 */
function composeTitle(lead: string, reasons: (string | string[] | null | undefined)[], max = 2): string {
  const chosen: string[] = [];
  for (const r of reasons) {
    if (!r || chosen.length === max) continue;
    const fit = (Array.isArray(r) ? r : [r]).find(
      (p) => `${lead}: ${[...chosen, p].join(', ')}`.length <= TITLE_BUDGET,
    );
    if (fit) chosen.push(fit);
  }
  return chosen.length ? `${lead}: ${chosen.join(', ')}` : lead;
}

/** Entry refused: the long form for descriptions is the catalog's own sentence. */
const REFUSED_SHORT = ['דרכון ישראלי אינו מתקבל כרגע', 'אין כניסה בדרכון ישראלי'];
/**
 * Entry restricted: both catalog entries end in "check the current state before
 * booking anything", which is what the title says when there is room for it.
 */
const RESTRICTED_SHORT = ['לבדוק כניסה בדרכון ישראלי', 'לבדוק כניסה בדרכון'];

/** The opening sentence when entry is refused or restricted; empty otherwise. */
function entryWarning(visa: ReturnType<typeof visaFact>, countryName: string): string {
  if (visa?.kind === 'refused') return `נכון להיום ${visa.text} ${hePrefix('ל', countryName)}.`;
  if (visa?.kind === 'restricted') return `${visa.text}, וצריך לבדוק לפני הזמנה.`;
  return '';
}

/** Where entry is refused or restricted, that is the reason a title gives first - or alone. */
function entryReason(visa: ReturnType<typeof visaFact>): string[] | null {
  return visa?.kind === 'refused' ? REFUSED_SHORT : visa?.kind === 'restricted' ? RESTRICTED_SHORT : null;
}

interface Option {
  text: string;
  /** How much this option says. The fit prefers saying more when lengths allow. */
  score: number;
}

/**
 * Picks one option per slot so the joined description lands in the target range,
 * preferring more facts, then a length near the middle of the range.
 *
 * Exhaustive rather than greedy: a page has at most a few hundred combinations,
 * and greedy trimming kept dropping the most useful fact to make room for a
 * closing line.
 */
function fitDescription(slots: Option[][]): string {
  let best: { text: string; rank: number[] } | null = null;
  const walk = (i: number, parts: string[], score: number) => {
    if (i === slots.length) {
      const text = parts.filter(Boolean).join(' ');
      const n = text.length;
      const tier = n >= DESCRIPTION_TARGET.min && n <= DESCRIPTION_TARGET.max ? 2 : n >= 120 && n <= 160 ? 1 : 0;
      const rank = [tier, score, -Math.abs(n - 150)];
      if (!best || outranks(rank, best.rank)) best = { text, rank };
      return;
    }
    for (const o of slots[i]) walk(i + 1, [...parts, o.text], score + o.score);
  };
  walk(0, [], 0);
  return best!.text;
}

/** Lexicographic: the first position that differs decides. */
function outranks(a: number[], b: number[]): boolean {
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] > b[k];
  return false;
}

const optional = (text: string | null | undefined, score: number): Option[] =>
  text ? [{ text, score }, { text: '', score: 0 }] : [{ text: '', score: 0 }];

/** Every subset of the optional phrases, in order, each joined into a sentence around the required ones. */
function sentenceVariants(
  open: string,
  required: string[],
  extras: { text: string | null | undefined; score: number; at: number }[],
): Option[] {
  const present = extras.filter((e) => e.text);
  const out: Option[] = [];
  for (let mask = 0; mask < 1 << present.length; mask++) {
    const picked = present.filter((_, i) => mask & (1 << i));
    const phrases = [...required.map((t, i) => ({ text: t, at: i * 10 + 5 })), ...picked.map((e) => ({ text: e.text!, at: e.at }))]
      .sort((a, b) => a.at - b.at)
      .map((p) => p.text);
    out.push({ text: `${open}${phrases.join(', ')}.`, score: picked.reduce((s, e) => s + e.score, 0) });
  }
  return out;
}

/** "for 7 days" with the hyphen a digit needs after a prefix letter, and the dual for two. */
function forDays(n: number): string {
  return n <= 2 ? hePrefix('ל', daysHe(n)) : `ל-${n} ימים`;
}

/**
 * "A, B and C", with the conjunction going through hePrefix like any other prefix.
 * Names that carry their own "and" ("Reykjavik and the south coast") make a final
 * "and" ambiguous - three of them in a row reads as four places - so such a list
 * is joined with commas only.
 */
function listHe(names: string[]): string {
  if (names.length <= 1) return names.join('');
  if (names.some((n) => / ו\S/.test(n))) return names.join(', ');
  return `${names.slice(0, -1).join(', ')} ${hePrefix('ו', names[names.length - 1])}`;
}

/**
 * Closing lines. Each one names something every page of its type renders - the
 * planner button, the fact cards - so it is true of the page it describes. Several
 * lengths, so the fit can land in range.
 */
const PLANNER_CLOSERS: Option[] = [
  { text: 'פותחים במתכנן ומתאימים לתאריכים שלכם.', score: 0.5 },
  { text: 'אפשר לפתוח במתכנן ולערוך.', score: 0.4 },
  { text: '', score: 0 },
];

/** The practical cards on a destination page: flights, visa, currency, SIM, payments, transport, kashrut. */
function infoClosers(domestic: boolean): Option[] {
  return [
    domestic
      ? { text: 'כולל איך מגיעים, תחבורה ומצב הכשרות.', score: 0.5 }
      : { text: 'כולל טיסות, ויזה, מטבע ומצב הכשרות.', score: 0.5 },
    { text: 'כולל מצב הכשרות ומידע פרקטי.', score: 0.45 },
    { text: 'כולל מצב הכשרות ביעד.', score: 0.4 },
    { text: 'כולל מצב הכשרות.', score: 0.35 },
    { text: '', score: 0 },
  ];
}

/** A catalog one-liner as a sentence of its own. */
function asSentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * A tagline usable as filler, or null.
 *
 * Flight, visa and kashrut claims each have exactly one source in a snippet - the
 * checked extractors in `facts.ts`. A tagline that makes one of those claims on its
 * own ("two hours' flight", "a community with real kashrut") would be a second,
 * unchecked source, so it is left out. So is one that talks about the site itself.
 */
function filler(tagline: string): string | null {
  return /טיס|ויזה|אשרה|כשר|טיול\+/.test(tagline) ? null : asSentence(tagline);
}

function finish(path: string, auto: Omit<Snippet, 'title' | 'overridden'>): Snippet {
  const o = SNIPPET_OVERRIDES[path];
  const head = o?.title ?? auto.head;
  return {
    head,
    title: `${head}${TITLE_SUFFIX}`,
    description: o?.description ?? auto.description,
    h1: o?.h1 ?? auto.h1,
    overridden: Boolean(o),
  };
}

// ---------- Destination ----------

export function destinationSnippet(dest: Destination, country: Country): Snippet {
  const domestic = isDomestic(dest);
  const lead = domestic ? `טיול ${inHe(dest.name)}` : `${dest.name} לישראלים`;
  const flight = domestic ? null : flightFact(dest);
  const kosher = kosherFact(dest);
  const season = seasonFact(dest.bestSeason);
  const visa = domestic ? null : visaFact(country.practical.visa);
  const days = dest.itinerary.length;

  // Where Israelis cannot enter, that is the only reason the title gives - an
  // itinerary length there would read as an invitation.
  const warning = entryReason(visa);
  const head = warning
    ? composeTitle(lead, [warning, `מסלול ${daysHe(days)}`])
    : composeTitle(lead, [
          flight?.kind === 'direct' ? flight.short : null,
          kosher?.text,
          `מסלול ${daysHe(days)}`,
          season ? `מומלץ ${inHe(season.text)}` : null,
        ]);

  const description = fitDescription([
    [{ text: entryWarning(visa, country.name), score: 0 }],
    sentenceVariants(`${dest.name}: `, [`מסלול מוכן ${forDays(days)} עם ${dest.places.length} מקומות על מפה`], [
      { text: flight?.long, score: 3, at: 1 },
      { text: kosher ? `יש ${kosher.text}` : null, score: 2, at: 20 },
    ]),
    optional(season && `העונה המומלצת: ${season.text}.`, 2),
    optional(filler(dest.tagline), 1),
    PLANNER_CLOSERS,
    infoClosers(domestic),
  ]);

  return finish(`/destinations/${dest.slug}`, { head, description, h1: lead });
}

// ---------- Country ----------

/** The country page heading: the query its title answers, without the reasons. */
export function countryHeading(country: Country): string {
  if (country.slug === HOME_COUNTRY_SLUG) return `טיול ${inHe(country.name)}`;
  // Where Israelis cannot enter, "trip to X" would be an invitation the page then withdraws.
  if (visaFact(country.practical.visa)?.kind === 'refused') return `${country.name} לישראלים`;
  return `טיול ${hePrefix('ל', country.name)}`;
}

/** What the cities' own flight sentences say about flying to this country, when they agree. */
function countryFlightSentence(cities: CountryCity[]): string | null {
  const facts = cities.map((c) => flightFact(c));
  const direct = cities.filter((_, i) => facts[i]?.kind === 'direct');
  if (direct.length === 1) {
    const f = facts[cities.indexOf(direct[0])]!;
    return `יש טיסה ישירה מנתב"ג ${hePrefix('ל', direct[0].name)}${f.length ? ` של ${f.length}` : ''}.`;
  }
  if (direct.length > 1) {
    const [a, b] = direct;
    return `יש טיסות ישירות מנתב"ג ${hePrefix('ל', a.name)} ${hePrefix('ו', hePrefix('ל', b.name))}.`;
  }
  // "No direct flight" only when every city says so; one silent city and the claim is not ours to make.
  if (cities.length && facts.every((f) => f?.kind === 'none')) return 'אין טיסה ישירה מישראל.';
  return null;
}

type CountryCity = Pick<Destination, 'slug' | 'name' | 'itinerary' | 'practical' | 'bestSeason' | 'countrySlug'>;

export function countrySnippet(country: Country, cities: CountryCity[]): Snippet {
  const domestic = country.slug === HOME_COUNTRY_SLUG;
  const visa = domestic ? null : visaFact(country.practical.visa);
  const refused = visa?.kind === 'refused';
  const lead = countryHeading(country);

  const n = cities.length;
  const days = (c: CountryCity) => c.itinerary.length;
  const count =
    n > 1
      ? [`${n} יעדים עם מסלול מוכן`, `${n} יעדים עם מסלול`]
      : n === 1
        ? [`מסלול ${daysHe(days(cities[0]))}`]
        : null;

  let head: string;
  if (refused) head = composeTitle(lead, [REFUSED_SHORT], 1);
  else if (visa?.kind === 'restricted') head = composeTitle(lead, [RESTRICTED_SHORT, count]);
  else if (visa?.kind === 'free') head = composeTitle(lead, [visa.text, count]);
  else if (domestic) head = composeTitle(lead, [count]);
  else head = composeTitle(lead, [count && [...count.map((c) => `${c} ומידע על ויזה`), ...count]], 1);

  const visaSentence =
    visa?.kind === 'free'
      ? `ישראלים נכנסים ${hePrefix('ל', country.name)} ${visa.text}.`
      : visa?.kind === 'required'
        ? `${visa.text} ${hePrefix('ל', country.name)}.`
        : visa?.kind === 'quoted'
          ? `${visa.text}.`
        : refused || visa?.kind === 'restricted'
          ? entryWarning(visa, country.name)
          : null;
  // With no visa sentence to open on, the city sentence opens and names the country.
  const open = visaSentence ? '' : `${country.name}: `;

  // The city list in every length from all names down to two, so the fit can trade names for room.
  const cityOptions: Option[] =
    n > 1
      ? Array.from({ length: n - 1 }, (_, i) => n - i).map((k) => ({
          text: `${open}${n} יעדים עם מסלול יום-יום ומפה: ${
            k === n ? listHe(cities.map((c) => c.name)) : `${cities.slice(0, k).map((c) => c.name).join(', ')} ועוד`
          }.`,
          score: k,
        }))
      : n === 1
        ? [{ text: `${open}מסלול מוכן ${forDays(days(cities[0]))} ${inHe(cities[0].name)}, יום אחרי יום על מפה.`, score: 1 }]
        : [{ text: '', score: 0 }];

  // A single-city country can carry that city's season; several cities rarely share one.
  const season = n === 1 ? seasonFact(cities[0].bestSeason) : null;

  const description = fitDescription([
    [{ text: visaSentence ?? '', score: 0 }],
    cityOptions,
    optional(domestic ? null : countryFlightSentence(cities), 2),
    optional(season && `העונה המומלצת: ${season.text}.`, 1.5),
    // The curated one-liner, last among the facts.
    optional(filler(country.tagline), 0.8),
    // What else the page and its city pages cover - true of every country.
    domestic
      ? optional('כולל מצב הכשרות בכל יעד.', 0.4)
      : visaSentence
        ? [
            { text: 'כולל מטבע, סים, תשלומים ומצב הכשרות בכל יעד.', score: 0.6 },
            { text: 'כולל מטבע, סים ותשלומים.', score: 0.5 },
            { text: 'כולל מצב הכשרות בכל יעד.', score: 0.4 },
            { text: 'כולל מטבע וסים.', score: 0.3 },
            { text: '', score: 0 },
          ]
        : [
            { text: 'כולל ויזה, מטבע, סים, תשלומים ומצב הכשרות בכל יעד.', score: 0.6 },
            { text: 'כולל ויזה, מטבע, סים ותשלומים.', score: 0.5 },
            { text: 'כולל מידע על ויזה ומצב הכשרות.', score: 0.45 },
            { text: 'כולל מידע על ויזה.', score: 0.4 },
          ],
  ]);

  return finish(`/countries/${country.slug}`, { head, description, h1: lead });
}

/** The heading for the visa answer on a country page, or null where it does not apply (home). */
export function visaHeading(country: Country): string | null {
  return country.slug === HOME_COUNTRY_SLUG ? null : `צריך ויזה ${hePrefix('ל', country.name)}?`;
}

// ---------- Itinerary ----------

/** Stops on the first `days` days of the curated itinerary - the ones the page shows. */
export function itineraryStops(dest: Destination, days: number): number {
  const ids = new Set(dest.places.map((p) => p.id));
  return dest.itinerary.slice(0, days).reduce((n, d) => n + d.placeIds.filter((id) => ids.has(id)).length, 0);
}

export function itinerarySnippet(dest: Destination, country: Country, days: number): Snippet {
  const domestic = isDomestic(dest);
  const lead = `טיול ${domestic ? inHe(dest.name) : hePrefix('ל', dest.name)} ${daysHe(days)}`;
  const stops = itineraryStops(dest, days);
  const flight = domestic ? null : flightFact(dest);
  const kosher = kosherFact(dest);
  const season = seasonFact(dest.bestSeason);

  const visa = domestic ? null : visaFact(country.practical.visa);
  const warning = entryReason(visa);
  const head = warning
    ? composeTitle(lead, [warning], 1)
    : composeTitle(lead, [`מסלול יום-יום עם ${stops} עצירות`, 'מסלול יום-יום'], 1);

  const description = fitDescription([
    [{ text: entryWarning(visa, country.name), score: 0 }],
    sentenceVariants(`מסלול ${daysHe(days)} ${inHe(dest.name)}, יום אחרי יום: `, [`${stops} עצירות על מפה`], [
      { text: flight?.long, score: 3, at: 10 },
      { text: kosher ? `יש ${kosher.text}` : null, score: 2, at: 20 },
    ]),
    optional(season && `העונה המומלצת: ${season.text}.`, 2),
    optional(filler(dest.tagline), 1),
    [
      { text: 'נפתח במתכנן ואפשר לערוך לתאריכים שלכם.', score: 0.5 },
      { text: 'נפתח במתכנן לעריכה.', score: 0.4 },
      { text: '', score: 0 },
    ],
    // The fact cards under the itinerary: season, getting there, transport, visa, kashrut.
    [
      domestic
        ? { text: 'כולל איך מגיעים, תחבורה ומצב הכשרות.', score: 0.5 }
        : { text: 'כולל טיסות, ויזה, תחבורה ומצב הכשרות.', score: 0.5 },
      { text: domestic ? 'כולל מצב הכשרות.' : 'כולל ויזה ומצב הכשרות.', score: 0.4 },
      { text: '', score: 0 },
    ],
  ]);

  return finish(`/itinerary/${dest.slug}/${days}`, { head, description, h1: `${lead}: מסלול יום-יום` });
}
