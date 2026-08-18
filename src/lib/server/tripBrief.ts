/**
 * Did the traveller ever say how LONG the trip is?
 *
 * Netanel, from a real conversation: asked for a trip without naming a length
 * and got a **4-day** itinerary. Nobody chose four. The model picked a number
 * that looked reasonable, and a length is not a detail - it decides how many
 * cities fit, how the days split between them and what the whole plan looks
 * like. Guessing it is the same class of mistake as inventing a price: a
 * confident value where there is no fact.
 *
 * The prompt now says to ask. This module is the half that does not depend on
 * the model reading its instructions: `/api/chat` refuses `create_trip` /
 * `create_trip_full` when nothing in the conversation states a length, exactly
 * the way the kashrut guard and the city gate refuse a tool call rather than
 * hoping the wording held. A tool that fails cannot produce a made-up trip.
 *
 * The bias is deliberately toward asking: a missed phrasing costs one extra
 * question, which is a small annoyance, while a false positive costs an
 * invented itinerary - the thing being fixed.
 */

const LENGTH_PATTERNS: RegExp[] = [
  // A digit + days/nights: "5 yamim", "le-10 yamim", "3 leylot"
  /\d{1,2}\s*(?:ימים|לילות)/,
  /*
    A Hebrew count word + days/nights ("shlosha yamim", "hamisha leylot),
    written as one literal rather than assembled with `new RegExp` from a
    template string. That is not a style choice: `\s` inside a template literal
    is not an escape at all, so the pattern silently became `...)s+(?:` and
    matched nothing. It passed tsc, it passed lint, and only the test caught it.
  */
  /(?:שני|שתי|שלוש|שלושה|שלשה|ארבע|ארבעה|חמש|חמישה|שש|שישה|שבע|שבעה|שמונה|תשע|תשעה|עשר|עשרה)\s+(?:ימים|לילות)/,
  // Words that are a length all by themselves
  /יומיים|שבועיים|חודשיים/,
  /סופ["״']?ש|סוף\s?שבוע/,
  /*
    "shavua be-Italia" (a week in Italy) is a length; "ba-shavua ha-ba" (next
    week) and "ha-shavua" (this week) are dates, so those are excluded rather
    than counted - a wrong positive here is the original bug.

    The trailing Hebrew-letter lookahead is load-bearing and was found by the
    test: without it, "shavua be-Italia" was REJECTED, because the word for
    "in Italy" opens with the same two letters as the word for "next" and
    tripped the negative lookahead. JavaScript's `\b` only knows ASCII, so the
    boundary has to be spelled out as a letter range.
  */
  /(?<![בהו])שבוע(?!\s*(?:ה?בא|ה?קרוב|שעבר)(?![א-ת]))/,
  /(?<![בהו])חודש(?!\s*(?:ה?בא|ה?קרוב|שעבר)(?![א-ת]))/,
  // English, for the occasional mixed message
  /\b\d{1,2}\s*(?:days?|nights?|weeks?)\b/i,
  /\bweekend\b|\ba week\b|\btwo weeks\b/i,
  // A date range implies a length: "12-18/8", "3-10 be-August", "from 5 to 9"
  /\d{1,2}\s*[-–]\s*\d{1,2}\s*(?:\/|ב[א-ת])/,
  /מ\s*-?\s*\d{1,2}\s*(?:עד|ועד)\s*\d{1,2}/,
];

/**
 * A message that is nothing but a small number - the answer to "how many
 * days?", typed rather than tapped. It counts only when it is the WHOLE
 * message: a number inside a sentence is already covered by the patterns above,
 * and this narrow form is what keeps "5" from being ignored and the traveller
 * asked twice.
 */
const BARE_NUMBER = /^\s*(\d{1,2})\s*[.!]?\s*$/;

/** Does this single message state a trip length? */
export function statesTripLength(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  const bare = BARE_NUMBER.exec(t);
  if (bare) {
    const n = Number(bare[1]);
    return n >= 1 && n <= 60;
  }
  return LENGTH_PATTERNS.some((re) => re.test(t));
}

/**
 * Does the conversation establish a length?
 *
 * **User messages only.** The assistant proposing "four days" must never count
 * as the traveller having said so - that is precisely how a guess becomes a
 * fact one turn later. Same rule as the kashrut gate, for the same reason.
 */
export function conversationStatesLength(
  messages: { role: string; content: string }[],
): boolean {
  return messages.some((m) => m.role === 'user' && statesTripLength(m.content));
}

/* ------------------------------------------------------------------ *
 * Who is travelling, and what they are after
 * ------------------------------------------------------------------ */

/**
 * Netanel's instruction went past the day count: "even if I ask him to do a
 * trip, he should not assume, but ask for personality". A length alone is not
 * a brief - "build me a 6-day trip to Vienna" says nothing about whether this
 * is a couple, a family with small children or friends in their twenties, and
 * those produce genuinely different itineraries.
 *
 * So the same treatment: if the traveller has said neither who is coming nor
 * what they like, the first build is refused once and the model asks. Unlike
 * the length this one has an explicit way out (below), because a traveller is
 * allowed to not care - what they are not allowed to get is an itinerary built
 * on a guess about them that nobody made out loud.
 */
const PARTY = /זוג|זוגי|רומנט|משפח|ילד|ילדים|תינוק|הורים|סבא|סבת|חבר'?ה|חברים|לבד|סולו|בנות|בחורים|קבוצה|אנשים|נוסעים|נוסע|טיול רווקים|ירח דבש|שנינו|לשנינו|אני ואשתי|אני ובעלי/;
/*
  Deliberately no bare two-letter token for "sea" here. The first version had
  one, and the Hebrew word for "days" ends with exactly those two letters - so
  "6 days" read as a stated interest and the gate never fired at all. Caught by
  the test, and it is the same species as the prefix collision above: Hebrew
  has no word boundary a regex can lean on, so short tokens must be spelled
  out long.
*/
const INTERESTS =
  /אוכל|קולינר|מסעד|היסטור|מוזיאונ|מוזיאון|אמנות|תרבות|טבע|הרים|הליכ|חופים|חוף |שנורקל|שופינג|קניות|חיי לילה|ברים|מסיב|ספורט|אתגר|נופש|רגוע|שקט|צילום|יין|קפה|אדריכל|ארמונ|כנסי|פסטיבל/;

/** Does this message say who is travelling, or what kind of trip they want? */
export function statesTravellerBrief(text: string): boolean {
  if (!text) return false;
  return PARTY.test(text) || INTERESTS.test(text);
}

/** Has the traveller said anything at all about themselves or their taste? */
export function conversationStatesBrief(
  messages: { role: string; content: string }[],
): boolean {
  return messages.some((m) => m.role === 'user' && statesTravellerBrief(m.content));
}

/**
 * Has the agent already put a question to the traveller in this conversation?
 *
 * This is the loop breaker, and it is deliberately crude: any question mark in
 * any assistant message. The alternative - trying to detect whether the
 * question was *about* the travellers - would fail closed, i.e. ask again, and
 * a traveller asked the same thing twice is worse than one that slips through.
 * Once the agent has engaged at all, the brief gate stops firing and "just
 * build it" builds.
 */
export function agentAlreadyAsked(
  messages: { role: string; content: string }[],
): boolean {
  return messages.some((m) => m.role === 'assistant' && /[?？]/.test(m.content));
}
