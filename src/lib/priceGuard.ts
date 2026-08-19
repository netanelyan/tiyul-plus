/**
 * ---------- The price guard: what the model cannot say, even if it tries ----------
 *
 * ## Why this exists instead of another prompt clause
 *
 * The agent has **no** hotel data in its context: no name, no price, no
 * availability. Therefore any price number it writes is necessarily an
 * invention. The prompt has long forbidden this, and this project's log
 * documents three cases where a prompt ban did not hold - walking distances,
 * city lists, and kashrut that volunteered itself into prose. The conclusion
 * written there is the rule applied here: **when the model ignores a rule,
 * don't phrase the rule harder - move it to a place where it isn't a choice.**
 *
 * This filter runs on **every** reply, on the server, after the model and
 * before the user. It is deterministic, unit-tested, and cannot be persuaded.
 *
 * ## The single principle: a number is allowed only if the traveler said it
 *
 * Instead of deciding what is "reasonable", the whitelist is **what the user
 * themselves wrote**. A traveler who said "my budget is 400 shekels a night"
 * can get 400 back; a number not spoken in the conversation cannot leave it.
 * Same for names: a hotel name is allowed only if it is already a pin on the
 * trip or the traveler typed it.
 *
 * ## What this explicitly does **not** catch
 *
 * A made-up hotel name in Hebrew script with no anchor word at all (a
 * fabricated Hebrew-named "Jerusalem hotel"). There is no way to distinguish
 * that from ordinary prose without a second model, and that would not be
 * deterministic. Three other layers cover this risk: it has no hotel data to
 * invent from, the prompt forbids it, and every lodging answer arrives with a
 * real search card the traveler clicks.
 */

import { PREMIUM_PRICE_ILS } from './plans';

/** The wording that replaces a cut claim. Must pass the filter itself - there's a test. */
export const NO_PRICE_LINE =
  'אני לא יכול לבדוק מחירים או זמינות בעצמי, ולכן לא אנקוב במספרים - החיפוש שמצורף כאן מראה את המצב האמיתי אצל הספק.';

/** Same, when there is no search card in this turn */
export const NO_PRICE_LINE_BARE =
  'אני לא יכול לבדוק מחירים או זמינות בעצמי, ולכן לא אנקוב במספרים - חיפוש אצל הספק יראה את המצב האמיתי.';

/**
 * The replacement for a claim about an event or a closure. **Must be separate
 * from the price one**: a sentence about a festival replaced with "I can't
 * check prices" reads like a malfunction, not like an honest answer.
 */
export const NO_EVENT_LINE =
  'אין לי מידע רשום על אירועים או סגירות בתאריכים האלה, ואני לא רוצה לנחש - כדאי לבדוק מקומית לקראת הנסיעה.';

/**
 * The replacement for a kashrut claim not backed by anything in our catalog -
 * see `KOSHER_WORD`/`KOSHER_ASSERTION` below. **This is not another prompt
 * rule but structure**: even if the model wrote such a sentence, it does not
 * leave the agent, for exactly the same reason a made-up price does not.
 */
export const NO_KOSHER_LINE =
  'לגבי כשרות אני יכול להתייחס רק למקומות שמאומתים אצלנו בקטלוג, ואין לי נתון כזה כרגע - כדאי לוודא מול המקום עצמו, או לשאול על עיר אחרת שכן מכוסה אצלנו.';

/**
 * The replacement for an hours/admission-price/existence claim not attached to
 * a citation - see `LOOKUP_ANCHOR`. Phrased as the inverse of what it used to
 * be ("I have no way to check") because now there is one: if the model did not
 * actually search (or forgot to cite), this is the honest offer - not a
 * permanent refusal.
 */
export const NO_LOOKUP_LINE =
  'לא בדקתי את זה בפועל בתור הזה, ולכן לא אכתוב שעות, מחיר כניסה או אם המקום עדיין קיים מהזיכרון שלי - אפשר לבקש שאבדוק את זה עכשיו.';

/**
 * The replacement when the model rules on a kashrut standard.
 *
 * Deliberately NOT the "I have no data" line: here we usually DO have the
 * data, and the problem is the verdict rather than the fact. Saying "I have no
 * information" would be false, and replacing a real certification name with a
 * refusal would lose the traveler the one thing they need. So this line hands
 * the decision back and points at what we can say.
 */
export const NO_KASHRUT_VERDICT_LINE =
  'אני מדווח מי הגוף המשגיח ומתי בדקנו, אבל ההחלטה אם להסתמך על השגחה מסוימת היא אישית ותלויה במנהג שלכם - אשמח לומר בדיוק מה רשום אצלנו ומאיזה מקור.';

/**
 * The replacement categories. `kashrut-verdict` is its own category rather
 * than folding into `kosher`, because the two say opposite things: the kosher
 * line says we have no verified data, while this one says we DO have the data
 * and it is not our place to grade it.
 */
export type GuardCategory = 'price' | 'event' | 'kosher' | 'lookup' | 'kashrut-verdict';

/**
 * Words that put a sentence in kashrut territory for the purposes of the
 * verdict rule.
 *
 * Wider than `KOSHER_WORD` on purpose. The sentence that got through the first
 * version was a comparison between two named bodies - one beth din said to be
 * stricter than a rabbinate - and it contains no word for "kosher" at all. The
 * body words themselves are the context, so they are matched here.
 */
const KASHRUT_BODY_WORD = /(רבנות|בית הדין|בית דין|בד["״'׳]?ץ|הכשר|כשרות|השגחה)/;

/**
 * Ruling on a kashrut standard. Comparatives and sufficiency judgements only -
 * naming a body is fine and is the point.
 */
const KASHRUT_VERDICT =
  /(מספיק(ה)?|לא מספיק(ה)?|אמין(ה)?|לא אמין(ה)?|מחמיר(ה)?\s*(יותר|פחות)?|קפדנ(י|ית)|מקל(ה)?|רמת\s*הכשרות|רמה\s*גבוהה|רמה\s*נמוכה|עדיף(ה)?|טוב(ה)?\s*יותר|פחות\s*טוב(ה)?|הכי\s*(טוב|מחמיר|אמין)|סומכים\s*עליו|אפשר\s*לסמוך|לא\s*הייתי\s*סומך|ברמה\s*של|נחשב(ת)?\s*ל?(מחמיר|אמין|טוב))/;

/** Which replacement line each rule belongs to */
const CATEGORY: Record<string, GuardCategory> = {
  superlative: 'price',
  availability: 'price',
  'room-type': 'price',
  stars: 'price',
  'per-unit-price': 'price',
  'currency-amount': 'price',
  'price-claim': 'price',
  'property-name': 'price',
  'event-claim': 'event',
  'closure-claim': 'event',
  'kosher-claim': 'kosher',
  'kashrut-verdict': 'kashrut-verdict',
  'hours-claim': 'lookup',
  'existence-claim': 'lookup',
};

export interface GuardReplacements {
  price?: string;
  event?: string;
  kosher?: string;
  lookup?: string;
  'kashrut-verdict'?: string;
}

/** Currencies. On their own they are entirely legitimate ("the currency is the euro") - a number next to them is not. */
const CURRENCY =
  /(₪|€|\$|£|\bILS\b|\bEUR\b|\bUSD\b|שקלים|שקל|ש"ח|ש״ח|אירו|יורו|דולרים|דולר)/;

/** Strong price words. The Hebrew verb for "costs" is deliberately excluded - it also means "climbs" ("the trail climbs 300 meters"). */
const MONEY_WORD = /(מחיר|מחירים|עלות|עלויות|תעריף|תעריפים|דמי כניסה|כמה עולה|יעלה לכם|בתקציב של)/;

/** A number attached to a pricing unit. Catches "400 per night" and not "3 nights". */
const PER_UNIT =
  /\d[\d.,]*\s*(?:₪|€|\$|£|ש"ח|ש״ח|שקל\w*|אירו|יורו|דולר\w*)?\s*(ללילה|לאדם|לזוג|לחדר|לאורח|בלילה|לכניסה)/;

/** Star ratings - we have no hotels in the data, so every star is an invention */
const STARS = /(\d\s*כוכבים|חמישה כוכבים|ארבעה כוכבים|שלושה כוכבים|5 כוכבים|4 כוכבים)/;

/** Room types and meal plans - a claim about inventory we don't have */
const ROOM_TYPE =
  /(סוויטה|סוויטות|חדר זוגי|חדר כפול|חדר משפחתי|חדר טווין|חצי פנסיון|פנסיון מלא|ארוחת בוקר כלולה|כולל ארוחת בוקר|הכל כלול|all[- ]inclusive)/i;

/**
 * Availability. **Deliberately phrased narrowly**: "a free day" in a plan is a
 * valid and common sentence, so the matcher requires the word room/place/
 * booking next to it.
 */
const AVAILABILITY =
  /(חדרים פנויים|חדר פנוי|יש זמינות|אין זמינות|נותרו \d|נותר חדר|מקומות אחרונים|אזל|אזלו|חדרים אחרונים|זמין להזמנה|תפוס בתאריכים)/;

/**
 * "The cheapest" and its friends. Forbidden **always** and with no whitelist:
 * we do not scan all providers and cannot claim this, not even as an answer to
 * a direct question. A sentence cut here is replaced with the honest message,
 * which says exactly what is true.
 */
const SUPERLATIVE =
  /(הזול ביותר|הזולה ביותר|הזולים ביותר|הזולות ביותר|הכי זול|הכי זולה|המחיר הטוב ביותר|המשתלם ביותר|המשתלמת ביותר|העסקה הטובה ביותר|cheapest|best price|lowest price)/i;

/* ---------- Events and dates ---------- */

/** Words that signal an event is being discussed */
const EVENT_WORD =
  /(פסטיבל|קרנבל|ביאנלה|אוקטוברפסט|מצעד|תהלוכה|יריד|קונצרט|הופעה|הופעות|מופע|מופעים|תערוכה|מרתון|חגיגות|טקס|אירוע|אירועים)/;

/** Words that signal a closure claim */
const CLOSURE_WORD = /(סגור|סגורה|סגורים|סגורות|סגירה|סגירות|ייסגר|תיסגר|נסגר|שובת|שביתה)/;

/**
 * A **specific** date: a month name, a year, or a numeric date.
 *
 * Deliberately, "this year" or "in the summer" alone are not here. "The city
 * has many events throughout the year" is a perfectly valid sentence, and
 * blocking it would turn the guard into noise somebody would switch off within
 * a week. "This year" only counts when attached to an occurrence verb.
 */
const SPECIFIC_TIME =
  /(בינואר|בפברואר|במרץ|באפריל|במאי|ביוני|ביולי|באוגוסט|בספטמבר|באוקטובר|בנובמבר|בדצמבר|ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר|20\d{2}|\d{1,2}[./]\d{1,2})/;

/** "Takes place this year" / "will be held on" - a claim about the occurrence itself */
const HAPPENING =
  /(מתקיים|מתקיימת|מתקיימים|יתקיים|יתקיימו|נערך|ייערך|חוזר)\s*(השנה|ב-?\d|בתאריך)|השנה\s*(מתקיים|יתקיים|נערך)/;

/** Anchor words that are followed by a hotel name */
const STAY_WORD = /(מלון|המלון|הוסטל|אכסניה|אכסניית|וילה|ריזורט|בית הארחה)/;

/** A Latin run carrying a hotel word - the common form of a property name */
const LATIN_PROPERTY =
  /\b[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*\s*\b(Hotel|Hostel|Hostal|Inn|Resort|Suites?|Apartments?|Guesthouse|Motel|Riad|Ryokan|Palace|Plaza)\b|\b(Hotel|Hostel|Resort|Inn)\s+[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*/;

/** Anchor word + a Latin name or a quoted name: the Hebrew word for hotel followed by "Devin" or a quoted Hebrew name */
const NAMED_STAY = new RegExp(
  `${STAY_WORD.source}\\s+(?:[A-Z][\\w&'.-]*|["״'][^"״']{2,40}["״'])`,
);

/* ---------- Kashrut: not from memory, not from search - only from the catalog ---------- */

/**
 * Kashrut words. **The same list** as `KOSHER_ASK` in `grounding.ts` - see
 * `kosherIntentText` there, which is the shared version. Defined here again
 * rather than imported, in the same style in which this file already defines
 * all of its patterns locally.
 */
const KOSHER_WORD =
  /כשר(ו|י|ה|ות)?|מהדרין|גלאט|בד["״'׳]?ץ|הכשר|השגחה|חב["״'׳]?ד|בית חב|kosher|chabad|glatt|hechsher/i;

/**
 * **Assertion** words - not every sentence that mentions kashrut is a claim
 * that must be blocked. "It's worth verifying kashrut with the venue" is a
 * valid warning with no anchor at all; "there is a large Jewish community and
 * kosher restaurants there" is a claim about reality that needs backing.
 * Without these words - the gate does not close, and the honest reminder has
 * room to remain.
 */
const KOSHER_ASSERTION =
  /(יש\s|ישנ(ם|ה)|נמצא(ת|ים)?|ממוקמ(ת|ים)?|קיימ(ת|ים)|מציע(ה)?|מגיש(ה)?|מומלץ|ידוע(ה)?\s*(כ|בתור)|מרכז|רובע|שכונה|קהילה|בית כנסת|מסעדה כשר|חנות כשר|אין\s*(שם\s*)?(כשרות|מסעד|חנויות))/;

/* ---------- Live lookup: hours/admission-price/existence, only with an attached citation ---------- */

/**
 * **The citation must be in the same sentence** - because streaming is
 * sentence-by-sentence (`GuardedTextStream`), and "waiting for the next
 * sentence" is impossible mid-stream. The prompt teaches the model to write
 * fact+citation as one sentence; anything that fails this is cut, and that is
 * the safe direction - better to lose a backed fact than show an unbacked one.
 */
export const LOOKUP_ANCHOR =
  /נבדק ב-?\s*\d{1,2}[./]\d{1,2}([./]\d{2,4})?|נבדק היום|checked\s+(on|today)/i;

/** Opening hours - a number with a colon, or Hebrew "open between"/"closes at" */
const HOURS_CLAIM =
  /\d{1,2}:\d{2}|שעות\s*ה?(פתיחה|פעילות)\s*(הן|הם)?|פתוח(ה)?\s*(בין|מ-?\d)|נסגר(ת)?\s*ב-?\d{1,2}(:\d{2})?/;

/** Whether a specific place still exists/is open, or closed permanently */
const EXISTENCE_CLAIM =
  /(עדיין\s*(פתוח|קיים|פועל|קיימת|פועלת)|נסגר(ה)?\s*לצמיתות|כבר לא (קיים|פועל)|is\s+(still\s+)?(open|closed)|has closed permanently|no longer exists)/i;

/**
 * Admission-fee context - narrow and deliberate, so it does not interfere with
 * lodging prices. The optional Hebrew definite-article prefix before "entry":
 * "the entry fee" with the article is entirely standard Hebrew, not just the
 * bare form.
 */
const TICKET_CONTEXT =
  /(דמי\s*ה?כניסה|כרטיס\s*ה?כניסה|מחיר\s*ה?כניסה|עלות\s*ה?כניסה|entrance fee|admission (fee|price)|ticket price)/i;

export interface GuardAllowlist {
  /** Texts the traveler themselves wrote in the conversation (including descriptions of images they attached) */
  userText?: string;
  /** Names of pins already saved on the trip - the traveler provided them */
  pinNames?: string[];
  /**
   * Names of the events and closure periods **returned from the data in this
   * turn** (`city_date_notes`). This is the whitelist for claims about events
   * and dates.
   *
   * The rule derived from this: a sentence discussing an event or closure with
   * a specific date is allowed only if it **names the record**. This is not
   * just a guard - it also pushes attribution: "Ferragosto on August 15"
   * passes, "on August 15 lots of things are closed" does not, and that is the
   * better answer anyway. When the list is empty - i.e. nothing was returned
   * from the data - no such claim passes.
   */
  eventNames?: string[];
  /**
   * Names that a kashrut claim may be backed by: names of kosher places and
   * names of cities **that were actually sent in this turn** - built in
   * `kosherAllowedNames` in grounding.ts and updated on every iteration,
   * because `set_preferences` can switch kosher on mid-turn. Empty = no
   * kashrut claim passes, even if the general gate is open.
   */
  kosherNames?: string[];
}

export interface GuardResult {
  text: string;
  /** What was cut, for logging and tests. Empty = nothing was cut. */
  redactions: string[];
  /** Which replacement lines were injected in this call (see `alreadyReplaced`) */
  replaced: Set<GuardCategory>;
}

/** Every digit run in the text */
const digitRuns = (s: string): string[] => s.match(/\d[\d.,]*/g)?.map((n) => n.replace(/[.,]$/, '')) ?? [];

/**
 * The numbers that may be echoed back: what the traveler typed, plus the
 * premium price - a real number stored on our side, and there is no reason the
 * agent cannot answer about it.
 */
function allowedNumbers(allow: GuardAllowlist): Set<string> {
  const set = new Set<string>(digitRuns(allow.userText ?? ''));
  // **Only the exact forms.** The first version also added the rounded price,
  // and that quietly whitelisted the number "20" in every reply on the site -
  // a test on a day note containing "about 20 euros for entry" is what
  // caught it.
  for (const form of [
    String(PREMIUM_PRICE_ILS),
    String(PREMIUM_PRICE_ILS).replace('.', ','),
    PREMIUM_PRICE_ILS.toFixed(2),
    PREMIUM_PRICE_ILS.toFixed(2).replace('.', ','),
  ]) {
    set.add(form);
  }
  return set;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s"״'`.,-]/g, '');

/** Whether every number in the segment is a number the traveler themselves gave */
const numbersAreUserOwn = (segment: string, allowed: Set<string>): boolean => {
  const runs = digitRuns(segment);
  return runs.length > 0 && runs.every((n) => allowed.has(n));
};

/** Whether the name that appeared here is a name the traveler gave (a pin or their own typing) */
function nameIsUserOwn(segment: string, allow: GuardAllowlist): boolean {
  const hay = norm(`${allow.userText ?? ''} ${(allow.pinNames ?? []).join(' ')}`);
  if (!hay) return false;
  // Every Latin run of 3+ characters in the segment must appear in what the traveler gave
  const tokens = segment.match(/[A-Za-z][A-Za-z&'.-]{2,}/g) ?? [];
  const named = tokens.filter((t) => !/^(hotel|hostel|resort|inn|suites?|apartments?|the|and)$/i.test(t));
  if (named.length === 0) {
    // A quoted name in Hebrew script
    const quoted = segment.match(/["״']([^"״']{2,40})["״']/);
    return quoted ? hay.includes(norm(quoted[1])) : false;
  }
  return named.every((t) => hay.includes(norm(t)));
}

/**
 * Checks a single sentence. Returns the name of the broken rule, or null if it
 * is clean.
 *
 * The order does not affect the outcome (the sentence is cut either way) but
 * it does affect the name recorded in the log, so the categorical rules come
 * first - they are the more precise ones.
 */
export function violationOf(sentence: string, allow: GuardAllowlist = {}): string | null {
  const allowed = allowedNumbers(allow);

  /*
    Kashrut first of all. The kosher gate (`kosherAllowed` in grounding.ts)
    can be open while the specific city the model is discussing is not in the
    catalog at all - and that is exactly the situation in which it tends to
    fill in kosher geography from memory. The check here does not trust the
    gate; it checks whether **this** sentence rests on a real name from this
    turn's data.
  */
  if (KOSHER_WORD.test(sentence) && KOSHER_ASSERTION.test(sentence) && !namesAllowedKosher(sentence, allow)) {
    return 'kosher-claim';
  }

  /*
    Ruling on somebody's kashrut standard.

    Naming a certifying body is now allowed and is the whole point of the
    structured model - a traveler decides by the name. What is never allowed
    is us deciding FOR them: "that hechsher is reliable enough", "the local
    rabbinate is not strict enough", "better supervision than the other one".
    Israeli travelers hold genuinely different standards, and a travel site
    grading a hechsher is both outside its competence and the fastest way to
    lose half its audience.

    This is deliberately independent of the allowlist above. A sentence can be
    perfectly well grounded - naming a real body from this turn's data - and
    still be a verdict, which is precisely the case the prompt alone would
    miss. It is checked BEFORE the allowlist can wave it through.
  */
  if (
    (KOSHER_WORD.test(sentence) ||
      KASHRUT_BODY_WORD.test(sentence) ||
      namesAllowedKosher(sentence, allow)) &&
    KASHRUT_VERDICT.test(sentence)
  ) {
    return 'kashrut-verdict';
  }

  if (SUPERLATIVE.test(sentence)) return 'superlative';
  if (AVAILABILITY.test(sentence)) return 'availability';

  if (ROOM_TYPE.test(sentence)) {
    const m = sentence.match(ROOM_TYPE)![0];
    if (!norm(allow.userText ?? '').includes(norm(m))) return 'room-type';
  }

  if (STARS.test(sentence) && !numbersAreUserOwn(sentence.match(STARS)![0], allowed)) {
    return 'stars';
  }

  if (PER_UNIT.test(sentence) && !numbersAreUserOwn(sentence.match(PER_UNIT)![0], allowed)) {
    return 'per-unit-price';
  }

  const hasDigit = /\d/.test(sentence);
  /*
    Cited admission fees are exempt from the general block - **only they**,
    and only when attached to a citation. `ROOM_TYPE`/`STARS`/`PER_UNIT`,
    checked above, have already caught any phrasing that sounds like lodging,
    so this carve-out cannot "bypass" them - the permission arrives only after
    they have already found nothing.
  */
  const admissionOk = hasDigit && TICKET_CONTEXT.test(sentence) && LOOKUP_ANCHOR.test(sentence);
  if (hasDigit && CURRENCY.test(sentence) && !numbersAreUserOwn(sentence, allowed) && !admissionOk) {
    return 'currency-amount';
  }
  if (hasDigit && MONEY_WORD.test(sentence) && !numbersAreUserOwn(sentence, allowed) && !admissionOk) {
    return 'price-claim';
  }

  const property = sentence.match(LATIN_PROPERTY) ?? sentence.match(NAMED_STAY);
  if (property && !nameIsUserOwn(property[0], allow)) return 'property-name';

  /**
   * A claim about an event or closure with a specific date.
   *
   * Allowed only if the sentence names a record returned from the data in this
   * turn. When nothing was returned - it has nothing to rest on, and every
   * such claim is from its memory.
   */
  const timed = SPECIFIC_TIME.test(sentence) || HAPPENING.test(sentence);
  if (timed && !namesStoredEvent(sentence, allow)) {
    if (EVENT_WORD.test(sentence)) return 'event-claim';
    if (CLOSURE_WORD.test(sentence)) return 'closure-claim';
  }

  /*
    Opening hours and existence - the same principle as events, but the anchor
    here is a citation rather than a record name: there is no fixed "data" to
    back opening hours with, only a live lookup that either happened in this
    turn or did not. See `LOOKUP_ANCHOR`.
  */
  if (HOURS_CLAIM.test(sentence) && !LOOKUP_ANCHOR.test(sentence)) return 'hours-claim';
  if (EXISTENCE_CLAIM.test(sentence) && !LOOKUP_ANCHOR.test(sentence)) return 'existence-claim';

  return null;
}

/** Whether the sentence names a record that was returned from the data in this turn */
function namesStoredEvent(sentence: string, allow: GuardAllowlist): boolean {
  const names = allow.eventNames ?? [];
  if (names.length === 0) return false;
  const hay = norm(sentence);
  return names.some((n) => n.trim().length >= 3 && hay.includes(norm(n)));
}

/** Whether the sentence names a real kosher name (place or city) returned from the data in this turn */
function namesAllowedKosher(sentence: string, allow: GuardAllowlist): boolean {
  const names = allow.kosherNames ?? [];
  if (names.length === 0) return false;
  const hay = norm(sentence);
  return names.some((n) => n.trim().length >= 2 && hay.includes(norm(n)));
}

/**
 * Sentence splitting. Keeps the mark at the end of each sentence so that the
 * reassembled text is identical to the original when there is nothing to cut -
 * there's a test for this.
 */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?:\n])/).filter((s) => s !== '');
}

/**
 * Runs the filter on text. A broken sentence is replaced with the honest line -
 * **once**, so that an answer with three price claims does not become three
 * repetitions of the same sentence.
 */
export function guardText(
  text: string,
  allow: GuardAllowlist = {},
  replacements: GuardReplacements = {},
  /**
   * For which categories the honest line has already been said **within the
   * same reply**.
   *
   * This is not a detail: in streaming every sentence passes through a
   * separate call, so a local counter would think each time that it is the
   * first - and that is exactly what happened in a demo run, where the user
   * got the same apology sentence twice in a row. The count is per category,
   * so a reply that touched both a price and an event explains both.
   */
  alreadyReplaced: Set<GuardCategory> = new Set(),
): GuardResult {
  const line = {
    price: replacements.price ?? NO_PRICE_LINE_BARE,
    event: replacements.event ?? NO_EVENT_LINE,
    kosher: replacements.kosher ?? NO_KOSHER_LINE,
    lookup: replacements.lookup ?? NO_LOOKUP_LINE,
    'kashrut-verdict': replacements['kashrut-verdict'] ?? NO_KASHRUT_VERDICT_LINE,
  };
  const redactions: string[] = [];
  const replacedHere = new Set<GuardCategory>();
  const out = splitSentences(text).map((sentence) => {
    if (!sentence.trim()) return sentence;
    const bad = violationOf(sentence, allow);
    if (!bad) return sentence;
    redactions.push(bad);
    const cat = CATEGORY[bad] ?? 'price';
    if (alreadyReplaced.has(cat) || replacedHere.has(cat)) {
      return sentence.match(/\n+$/)?.[0] ?? '';
    }
    replacedHere.add(cat);
    // The split leaves the space after the period at the start of the next
    // sentence, so there is no need to add a space here - only to preserve
    // newlines attached to the end.
    const tail = sentence.match(/\s+$/)?.[0] ?? '';
    return line[cat] + tail;
  });
  return { text: out.join(''), redactions, replaced: replacedHere };
}

/**
 * The "notes" variant: cuts the **clause** rather than the sentence, and
 * without injecting apology wording.
 *
 * A day note is not a conversation - there is no room in it for an "I can't
 * check prices" sentence, and it is usually one sentence with commas, so a
 * sentence-level replacement would erase the useful part too ("the cathedral
 * is worth a visit, about 20 euros for entry" would become "the cathedral is
 * worth a visit" losing everything). This is also the behavior that already
 * exists there for transit line numbers: remove the uncovered detail and keep
 * the sentence.
 */
export function stripClaims(text: string, allow: GuardAllowlist = {}): GuardResult {
  const parts = text.split(/([,;.!?:\n]+)/);
  const redactions: string[] = [];
  let out = '';
  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i];
    const sep = parts[i + 1] ?? '';
    if (!clause.trim()) {
      out += clause + sep;
      continue;
    }
    const bad = violationOf(clause, allow);
    if (bad) {
      redactions.push(bad);
      continue; // the clause and its trailing separator leave together
    }
    out += clause + sep;
  }
  return { text: out.replace(/[\s,;]+$/, '').trim(), redactions, replaced: new Set() };
}

/**
 * ---------- Safe streaming ----------
 *
 * The text is streamed to the user as it is written, so filtering "at the
 * end" is impossible: what was sent was sent. This emitter releases **only
 * complete sentences**, so a price expression cannot be split in two and pass
 * half-and-half ("400" now, the currency word later).
 *
 * The cost is a delay of one sentence, not of the whole reply. On a
 * pathologically long sentence (more than `HARD_CAP` without punctuation) we
 * release anyway, but **hold back a tail** of a few characters, so a
 * "number + currency" pair cut at the boundary stays together.
 */
const HARD_CAP = 700;
const TAIL_KEEP = 48;

export class GuardedTextStream {
  private acc = '';
  private emitted = 0;
  private readonly allow: GuardAllowlist;
  private readonly replacements: GuardReplacements;
  /** Each honest line is said once per reply, even when it consists of several flushes */
  private readonly replacedOnce = new Set<GuardCategory>();

  readonly redactions: string[] = [];

  // Explicit fields rather than constructor parameter properties: the tests
  // run under `--experimental-strip-types`, which does not support that syntax.
  constructor(allow: GuardAllowlist, replacements: GuardReplacements = {}) {
    this.allow = allow;
    this.replacements = replacements;
  }

  /** Adds a delta and returns what may be sent now (can be empty) */
  push(delta: string): string {
    this.acc += delta;
    const pending = this.acc.slice(this.emitted);
    let cut = pending.lastIndexOf('\n') + 1;
    for (const mark of ['. ', '! ', '? ', ': ', '.\n']) {
      const at = pending.lastIndexOf(mark);
      if (at >= 0) cut = Math.max(cut, at + mark.length);
    }
    // A sentence-ending mark at the end of the buffer with no space after it
    // counts too. The digit before it is excluded so that "19.90" is not cut
    // mid-number into "19." and "90 ILS".
    if (/(?<!\d)[.!?:]$/.test(pending)) cut = Math.max(cut, pending.length);
    if (cut === 0 && pending.length > HARD_CAP) {
      // A pathological sentence with no punctuation. Release from it only if
      // **all of it** is clean - otherwise hold everything, because a cut in
      // the middle can separate a number from its currency and then the two
      // halves pass separately. Better to delay an edge case than miss a claim.
      if (violationOf(pending, this.allow)) return '';
      cut = pending.length - TAIL_KEEP;
    }
    if (cut <= 0) return '';
    return this.flush(this.emitted + cut);
  }

  /** Releases what remains. Called once at the end of the stream. */
  end(): string {
    return this.flush(this.acc.length);
  }

  private flush(to: number): string {
    const chunk = this.acc.slice(this.emitted, to);
    this.emitted = to;
    if (!chunk) return '';
    const res = guardText(chunk, this.allow, this.replacements, this.replacedOnce);
    for (const cat of res.replaced) this.replacedOnce.add(cat);
    this.redactions.push(...res.redactions);
    return res.text;
  }
}
