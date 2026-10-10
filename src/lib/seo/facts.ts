import { formatDurationHe } from '@/lib/duration';
import { recommendationSegment } from '@/lib/seasonMonths';
import { isKosher } from '@/lib/categories';
import { isDomestic } from '@/lib/domestic';
import type { Destination } from '@/lib/types';

/**
 * ---------- The facts a search snippet is allowed to state ----------
 *
 * A title or meta description is the one sentence of ours most people ever read,
 * and it is read without the page around it - so a claim there carries none of
 * the caveats the page puts next to it. That makes it the worst possible place
 * to round a fact up. Everything a snippet says about flights, seasons, visas or
 * kashrut comes out of this file, and this file only says what the catalog
 * prose says in so many words.
 *
 * ## Strict on purpose: a miss is cheap, a wrong claim is not
 *
 * The catalog fields are hand-written Hebrew prose, not structured data, and the
 * same idea is phrased a dozen ways. Every extractor here therefore accepts a
 * narrow set of shapes and returns `null` for everything else. A destination
 * whose flight sentence is unusual simply gets a title without a flight in it.
 * The opposite failure - "direct flight" on a page whose direct flight lands in
 * a gateway city three hours away - is the one this file exists to prevent.
 *
 * Every fact carries `quote`: the exact slice of catalog text it rests on.
 * `snippets.test.ts` checks the quote really is in the field, so the link from
 * a snippet back to its source is mechanical rather than a matter of trust.
 */

export interface Fact {
  /** What the snippet may print. */
  text: string;
  /** The verbatim catalog text it rests on. Absent only for counts computed from structured fields. */
  quote?: string;
}

/** The first sentence: up to a full stop that ends a word, so "3.5" does not split. */
export function firstSentence(text: string): string {
  const cut = text.search(/\.(?=\s|$)/);
  return (cut === -1 ? text : text.slice(0, cut)).trim();
}

// ---------- Flights ----------

export interface FlightFact {
  kind: 'direct' | 'none';
  /** Short form for a title: the direct flight and its length. */
  short: string;
  /** Long form for a description. */
  long: string;
  quote: string;
  /** The flight length, normalised ("about 3.5 hours"), when one was read. */
  length?: string;
  /** The length phrase as the catalog wrote it. */
  durationQuote?: string;
}

/** A flight, not a train or a road, is what is direct. */
const DIRECT = /(טיסה|טיסות|קו|קווים|טסים) ישיר|ישירות מנתב/;
/**
 * The sentence is about reaching a gateway rather than the destination itself:
 * "fly to Tashkent, then the train", "the closest direct flight is to Tivat".
 */
const GATEWAY = /(ומשם|וממנה|משם|הכי נוח|הכניסה|מגיעים דרך|נוחתים|נכנסים|^טסים|הקרובה)/;

/** "from TLV to X", "to X airport", or an IATA code: the sentence names where it lands. */
const NAMES_A_TARGET = /נתב["״]ג (?:ל|אל )|מתל אביב,? ל|לשדה|לנמל התעופה|\([A-Z]{3}\)/;

/**
 * Destinations whose flight sentence names the city's own airport instead of
 * the city. Checked by hand: each of these is the airport of the destination
 * itself, not of a neighbour.
 */
const OWN_AIRPORT: Record<string, string> = {
  rome: 'פיומיצ׳ינו',
  berlin: 'BER',
  crete: 'הרקליון',
  'new-york': 'JFK',
  amsterdam: 'סכיפול',
  paris: 'שארל דה גול',
  london: 'הית׳רו',
};

/** A word and the forms it takes behind one or two prefix letters, with a doubled vav undone. */
function wordForms(word: string): string[] {
  const out = [word];
  let cur = word;
  for (let i = 0; i < 2 && cur.length > 3 && /^[בלוהמש]/.test(cur); i++) {
    cur = cur.slice(1);
    out.push(cur);
  }
  return out;
}

/**
 * Whether a direct-flight sentence lands at the destination rather than near it.
 *
 * Seven entries said "direct flights to Zurich", "to Tashkent", "to Sofia" for a
 * region hours away from that airport, and the sentence was otherwise a perfect
 * match. So a sentence that names a landing point must name this destination,
 * or one of its own airports listed above. A sentence that names no landing
 * point at all ("direct flights from TLV - about 4 hours") is about the city
 * itself. Anything else gets no flight claim, which makes a new destination
 * safe by default rather than right by luck.
 */
function landsAtDestination(sentence: string, dest: { slug: string; name: string }): boolean {
  if (!NAMES_A_TARGET.test(sentence)) return true;
  const airport = OWN_AIRPORT[dest.slug];
  if (airport && sentence.includes(airport)) return true;
  const nameWords = new Set(
    dest.name
      .split(/[\s,:]+/)
      .flatMap((w, i) => (i > 0 ? wordForms(w) : [w]))
      .filter((w) => w.length >= 3),
  );
  return sentence
    .split(/[\s,.:;()\-–]+/)
    .some((t) => wordForms(t).some((f) => nameWords.has(f)));
}
/**
 * The direct flight exists only some of the time. Frequency is different - a
 * year-round line that flies twice a week is still a direct flight - so clauses
 * about frequency are removed before this is tested.
 */
const PART_TIME = /(עונ|קיץ|חורף|בחלק מ|לסירוגין|משתנ|לעיתים|לפעמים|לבדוק|חיבור)/;
const FREQUENCY = /(תדירות|בשבוע|ביום|יומי)/;
const NO_DIRECT = /^אין (?:ולא הייתה |כיום |כרגע )?(?:טיסה ישירה|טיסות ישירות|קו ישיר|קווים ישירים)(?! קבוע)(?! יציב)/;

const HOUR_WORDS: Record<string, number> = {
  שעה: 1,
  שעתיים: 2,
  שלוש: 3,
  ארבע: 4,
  חמש: 5,
  שש: 6,
  שבע: 7,
  שמונה: 8,
  תשע: 9,
  עשר: 10,
};

/**
 * "about four and a half hours" in its catalog spellings: digits ("4.5 hours"),
 * number words ("four hours and a half", "four and a half hours"), and the two
 * words that are themselves a length ("an hour", "two hours").
 */
const DURATION =
  /ב?כ-?\s?(?:(\d+(?:\.\d+)?)|(שעתיים|שעה|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר))(\s+וחצי)?(\s+שעות)?(\s+וחצי)?/g;
/** What may not follow a length: a range, extra minutes, or a road trip. */
const NOT_A_FLIGHT_LENGTH = /^\s*(?:עד|-\s?\d|ו-?\s?\d|ו(?:עשר|חמש|עשרים|ארבעים)\s+דקות|נסיעה|ברכב|ברכבת|באוטובוס|במעבורת)/;

function readDuration(sentence: string): { minutes: number; quote: string } | null {
  for (const m of sentence.matchAll(DURATION)) {
    const [whole, digits, word, half1, hoursWord, half2] = m;
    let hours: number;
    if (digits) {
      if (!hoursWord) continue; // "about 5 times a week"
      hours = Number(digits);
    } else {
      hours = HOUR_WORDS[word];
      const isLengthWord = word === 'שעה' || word === 'שעתיים';
      if (!isLengthWord && !hoursWord) continue; // "about three flights a week"
      if (isLengthWord && hoursWord) continue;
    }
    if (half1 || half2) hours += 0.5;
    const rest = sentence.slice((m.index ?? 0) + whole.length);
    if (NOT_A_FLIGHT_LENGTH.test(rest)) return null;
    return { minutes: Math.round(hours * 60), quote: whole.trim() };
  }
  return null;
}

/**
 * What a snippet may say about getting there from Israel.
 *
 * Only the first sentence is read: that is where every entry states whether a
 * direct line exists, and later sentences drift into connections and onward
 * travel, where a "direct" means something else.
 */
export function flightFact(
  dest: Pick<Destination, 'slug' | 'name' | 'practical' | 'countrySlug'>,
): FlightFact | null {
  // A domestic destination is reached by road and rail; its `flights` field says how.
  if (isDomestic(dest)) return null;
  const s = firstSentence(dest.practical.flights);

  if (NO_DIRECT.test(s)) {
    // "No direct flight most of the year" means there is one some of the year.
    if (/(ברוב השנה|לאורך כל השנה|עונ)/.test(s)) return null;
    return { kind: 'none', short: 'אין טיסה ישירה', long: 'אין טיסה ישירה מישראל', quote: s };
  }

  if (!DIRECT.test(s) || GATEWAY.test(s) || !landsAtDestination(s, dest)) return null;
  // "Not daily" and "seasonal frequency" qualify how often, not whether: only the
  // clauses that are not about frequency may veto the claim.
  const clauses = s.split(/[,;]| - /).filter((c) => !FREQUENCY.test(c));
  if (clauses.some((c) => PART_TIME.test(c) || /(^|\s)(אין|לא)\s/.test(c))) return null;

  const d = readDuration(s);
  const length = d ? formatDurationHe(d.minutes) : null;
  if (d && length) {
    return {
      kind: 'direct',
      short: `טיסה ישירה של ${length}`,
      long: `טיסה ישירה מנתב"ג של ${length}`,
      quote: s,
      length,
      durationQuote: d.quote,
    };
  }
  return { kind: 'direct', short: 'טיסה ישירה מנתב"ג', long: 'יש טיסה ישירה מנתב"ג', quote: s };
}

// ---------- Season ----------

const MONTH =
  '(?:(?:סוף|תחילת|אמצע) )?(?:ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)';
const MONTH_RANGE = `${MONTH}(?:(?:-| עד )${MONTH})?`;
const MONTH_LIST = new RegExp(`^${MONTH_RANGE}(?:(?:, ו|, | ו)${MONTH_RANGE})*`);
const ANY_MONTH = new RegExp(MONTH);

/**
 * The recommended months, as written, when the sentence opens with nothing but
 * months.
 *
 * Reads only `recommendationSegment` - the same rule the season filter uses,
 * because cautions follow the recommendation and name months too. On top of
 * that, the months must be the whole recommendation: "June-September for
 * hiking, December-March for skiing" and "October-April in the north" both
 * return null, since quoting the months alone would drop the condition that
 * makes them true.
 */
export function seasonFact(bestSeason: string): Fact | null {
  const seg = recommendationSegment(withoutAsides(bestSeason)).split(/[·;]/)[0].trim();
  const m = seg.match(MONTH_LIST);
  if (!m) return null;
  const rest = seg.slice(m[0].length);
  if (rest && !/^(,| הם| היא| הוא)/.test(rest)) return null;
  if (ANY_MONTH.test(rest)) return null;
  // "...are the peak on the south coast": true of part of the destination only.
  if (/\sב(?:חוף|מישור|צפון|דרום|מערב|מזרח|הרים|אזור)/.test(rest)) return null;
  return { text: m[0].replace(/ עד /g, '-'), quote: m[0] };
}

/**
 * The season sentence with its parenthetical asides removed. Without this the
 * recommendation is cut at the first bracket, and Tokyo's "late March-April
 * (cherry blossom) and October-November (foliage)" loses its autumn - a title
 * would then imply autumn is not recommended. `quote` is verbatim in this form.
 */
export const withoutAsides = (s: string) => s.replace(/\s*\([^)]*\)/g, '');

// ---------- Kashrut ----------

/**
 * The overview says there is nowhere to eat. "There is no problem eating kosher
 * for a week" (Vienna) is the opposite claim, hence the two exclusions.
 */
const KOSHER_NONE = /אין(?! בעיה)(?! קושי)[^.]{0,40}(מסעד(?:ה|ות) כשר|תשתית כשרות|כשרות מסודרת)/;

/** "kosher restaurants", plural and indefinite - "THE kosher restaurants are in Melbourne" is about elsewhere. */
const KOSHER_RESTAURANTS = /(?<![הו])מסעדות כשרות/;

/**
 * Whether a snippet may say the city has kosher restaurants.
 *
 * ## Why not the count of kosher places
 *
 * The first version printed the number of kosher entries on the city's map, and
 * Rome came out at 2 - while its overview says the ghetto alone holds more than a
 * dozen kosher restaurants. "2 kosher places" is true of our map and reads as a
 * statement about Rome. So the claim is the overview's own words instead, and
 * only when all three hold:
 *
 * - the overview says "kosher restaurants" in so many words,
 * - it never says there are none ("no kosher restaurant", "no kosher
 *   infrastructure"), so a mixed sentence cannot qualify,
 * - the catalog itself lists at least one kosher place in the city, so the
 *   restaurants are here and not in a city the overview points to.
 */
export function kosherFact(dest: Pick<Destination, 'places' | 'practical'>): Fact | null {
  const overview = dest.practical.kosherOverview;
  if (KOSHER_NONE.test(overview)) return null;
  if (!dest.places.some((p) => isKosher(p.category))) return null;
  const many = overview.match(KOSHER_MANY);
  if (many) return { text: `${many[1]} מקומות כשרים`, quote: many[0] };
  const m = overview.match(KOSHER_RESTAURANTS);
  return m ? { text: 'מסעדות כשרות', quote: m[0] } : null;
}

/** "hundreds of restaurants, bakeries and kosher supermarkets", "dozens of kosher businesses". */
const KOSHER_MANY = /(מאות|עשרות) (?:מסעדות|בתי עסק|עסקים)[^.]{0,40}?כשר/;

export const kosherNegated = (overview: string) => KOSHER_NONE.test(overview);

// ---------- Visa ----------

export interface VisaFact {
  kind: 'free' | 'required' | 'refused' | 'restricted' | 'quoted';
  text: string;
  quote: string;
}

const VISA_FREE = /(ללא ויזה|פטורים מוויזה|פטורים מאשרה|פטור מאשרה|לא צריכים ויזה)/;
const VISA_SPAN = /עד (\d+|תשעים|שישים|שלושים) (?:יום|ימים)(?! בשנה)|עד שנה/;
const SPAN_WORDS: Record<string, string> = { תשעים: '90', שישים: '60', שלושים: '30' };
/** The first sentence qualifies its own answer. */
const VISA_HEDGE = /(בדרך כלל|לפי שיקול|מתעדכנ|משתנ|ייתכן|בלבד)/;
/**
 * "Visa-free" is true but incomplete when an online authorisation is still
 * required before boarding - ESTA, eTA, ETA, TDAC and the rest. A title cannot
 * carry that second half, so it does not get the first half either.
 */
const PRE_REGISTRATION =
  /(ETA|eTA|ESTA|NZeTA|TDAC|eTravel|Arrival Card|אישור נסיעה|הרשמה מקוונת|רישום מקוון|טופס הכניסה|e-Visa|e-visa|אישור כניסה)/;
const ENTRY_REFUSED = /דרכון ישראלי אינו מתקבל לכניסה/;
/**
 * No diplomatic relations and an entry the catalog calls "complicated" or "subject
 * to restrictions" (Indonesia, Malaysia). Not refused, so the page stays a guide -
 * but a title that says "X for Israelis" must not read as an all-clear.
 */
const ENTRY_RESTRICTED = /כניסה (?:ל|של )בעלי דרכון ישראלי [^,.]{0,25}?(?:מורכבת|למגבלות|מוגבלת)/;
const NO_RELATIONS = /אין[^.]{0,15}יחסים דיפלומטיים/;
const VISA_REQUIRED = /^ישראלים (?:חייבים |נדרשים ל)(?:ויזה|וויזה|אשרה)$/;

/**
 * What a snippet may say about entry, read from `practical.visa` exactly as written.
 *
 * - `free`: the first sentence says Israelis need no visa, for a stated span,
 *   without a hedge, and nothing anywhere in the text adds a pre-registration.
 * - `refused`: the text says an Israeli passport is not accepted.
 * - `restricted`: no diplomatic relations, and entry on an Israeli passport is
 *   described as complicated or restricted. `text` is that clause, verbatim.
 * - `required`: the first sentence is nothing but "Israelis need a visa".
 * - `quoted`: none of the above, but the first sentence is short enough to quote
 *   whole - hedges included, since they are part of the answer. Not used when a
 *   later sentence adds a pre-registration the quote would leave out. Descriptions
 *   only; a title never paraphrases a hedged answer.
 *
 * Everything else returns null, and the snippet only says the page covers visas.
 */
export function visaFact(visa: string): VisaFact | null {
  const refused = visa.match(ENTRY_REFUSED);
  if (refused) return { kind: 'refused', text: refused[0], quote: refused[0] };
  const restricted = visa.match(ENTRY_RESTRICTED);
  if (restricted && NO_RELATIONS.test(visa)) return { kind: 'restricted', text: restricted[0], quote: restricted[0] };

  const s = firstSentence(visa);
  if (VISA_REQUIRED.test(s)) return { kind: 'required', text: s, quote: s };

  const span = s.match(VISA_SPAN);
  if (span && VISA_FREE.test(s) && !VISA_HEDGE.test(s) && !PRE_REGISTRATION.test(visa)) {
    const words = span[1] ? `עד ${SPAN_WORDS[span[1]] ?? span[1]} יום` : 'עד שנה';
    return { kind: 'free', text: `ללא ויזה ${words}`, quote: span[0] };
  }

  const after = visa.slice(visa.indexOf(s) + s.length);
  // The quote must answer the visa question itself: Jordan's first sentence names the
  // border crossing, and quoting it alone would hide that the visa is arranged in advance.
  if (s.length <= QUOTABLE && ANSWERS_VISA.test(s) && !PRE_REGISTRATION.test(after)) {
    return { kind: 'quoted', text: s, quote: s };
  }
  return null;
}

/** The longest first sentence quoted whole in a description. */
const QUOTABLE = 85;
const ANSWERS_VISA = /ויזה|אשרה|פטור|visa/i;
