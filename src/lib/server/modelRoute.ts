import type { Trip } from '@/lib/trip/types';

/**
 * Model routing by request type - **in code, not in the prompt**.
 *
 * ## The problem
 *
 * "Move day 5 to day 1" and "build me two weeks in Italy with kids" used to
 * run on the same model with the same 240,000-char prefix. The first is an
 * index move in an array: it does not need the catalog, it does not need
 * judgement, and the server validates it anyway.
 *
 * ## Why this is a deterministic classifier and not a classifying model
 *
 * A classifier that is a model adds a call to every turn, and moves the
 * decision itself somewhere no test can be written for. This file is the
 * pattern that has already worked here twice - `priceGuard` and
 * `filterKosherUnlessOptedIn`: **a structural guarantee instead of prompt
 * discipline.**
 *
 * ## The two savings, and the second is bigger than the first
 *
 * 1. **A cheap model.** haiku instead of sonnet.
 * 2. **A small prefix.** And this is the main point: the light path **does
 *    not send the catalog index at all** - about 240,000 chars, about 80,000
 *    tokens. It can only afford that because of the tools clause below: every
 *    whitelisted tool operates on what is already in the trip, so there is
 *    nothing to look up in the catalog.
 *
 * ## The guarantee itself
 *
 * The cheap model receives **only the whitelisted tools**. This is not an
 * instruction it can ignore - a tool that is not sent does not exist for it.
 * A request that needs more is not "performed badly"; it is not performed at
 * all, and the turn is escalated to the strong model and rerun from scratch.
 *
 * ## What deliberately stays with the strong model
 *
 * Building and deleting (`create_trip*`, `remove_day`, `set_day_places`),
 * destination exploration, booking search, the events calendar, and every
 * question. The record in this file (CLAUDE.md, "Haiku as the agent")
 * documents two real, measured failures: skipping confirmation before a
 * destructive change, and drifting off-data in follow-up suggestions. The
 * two lists below derive directly from those two failures.
 */

/**
 * The only tools the light path receives.
 *
 * The common denominator: **all of them operate on something that already
 * exists in the trip**, the traveler named it explicitly, and the server
 * validates every field. None of them deletes a day, builds a trip, reaches
 * outward, or produces a claim about the world.
 *
 * `add_place` stays on the list even though it does touch the catalog - and
 * so the light path DOES receive the **detail block for the trip's own
 * cities**. That is what makes "add the Colosseum to day 2" possible without
 * sending all 166 destinations.
 */
export const LIGHT_TOOLS = [
  'move_day',
  'set_day_city',
  'add_place',
  'remove_place',
  'move_place',
  'set_day_notes',
  'rename_trip',
  'set_preferences',
  'set_booking_status',
  'set_trip_dates',
] as const;

const LIGHT_SET = new Set<string>(LIGHT_TOOLS);
export const isLightTool = (name: string): boolean => LIGHT_SET.has(name);

/**
 * Mechanical actions. At least one of them must be present, otherwise there
 * is no reason to assume this is a simple request - the default is the
 * strong model, always.
 */
const MECHANICAL =
  /תזיז|תעביר|להזיז|להעביר|תחליף בין|תוסיף|להוסיף|תוריד|להוריד|תסיר|להסיר|תמחק את העצירה|שנה את השם|תשנה את השם|תקרא לטיול|תרשום ליום|תוסיף הערה|ההערה של יום|תסמן|סמן|תעדכן תאריכ|התאריכים של הטיול|יוצאים ב|חוזרים ב/;

/**
 * Disqualifiers. **One is enough** to stay on the strong model - and that is
 * the right direction to err in: misrouting downward costs a wasted turn,
 * misrouting upward costs a few cents.
 */
const DISQUALIFY: { re: RegExp; why: string }[] = [
  // Rebuilding - the heaviest tool, and also the only one that gets cut off on max_tokens
  { re: /תבנה|בנה לי|תבני|תכין|תכנן|תכנון|צור טיול|טיול חדש|מחדש|תתחיל מ|תתכנן/, why: 'בנייה' },
  // Deletion - the record documents skipping confirmation before a destructive change
  { re: /תמחק|למחוק|תבטל|לבטל|תרוקן|תוריד יום|תסיר יום/, why: 'מחיקה' },
  // A question - this is where off-data drift was measured
  { re: /\?|מה |למה |איך |כדאי|האם |מתי |כמה |איזה |מומלץ|תמליץ|המלצ|תספר|ספר לי|תסביר/, why: 'שאלה' },
  // Things that require a source: prices, events, availability, a destination not in the catalog
  { re: /מחיר|עולה|תקציב|כמה כסף|זול|יקר/, why: 'מחיר' },
  { re: /אירוע|פסטיבל|סגור|חופשות|חופשת |חג /, why: 'לוח אירועים' },
  { re: /מלון|לינה|טיסה|כרטיס|הזמנ|לחפש|חיפוש/, why: 'הזמנות' },
  // Kashrut and Shabbat are sensitive preferences - set via buttons, not in conversation
  { re: /כשר|מהדרין|גלאט|בד״ץ|בד"ץ|השגחה|חב״ד|חב"ד|שבת/, why: 'כשרות' },
];

export interface TurnRoute {
  /** true = the light path: cheap model, small prefix, restricted tools */
  light: boolean;
  /** log only - why this was decided */
  reason: string;
}

const HEAVY = (reason: string): TurnRoute => ({ light: false, reason });

/**
 * Maximum message length for the light path. A long message almost always
 * contains more than one request ("move day 5 to the start of the trip, and
 * add something for the kids there, and maybe it's actually better to..."),
 * and that is exactly the situation in which a restricted tool fails.
 */
const MAX_LIGHT_CHARS = 90;

/**
 * A complex request. Length alone misses: "move day 5 to day 1, and add
 * something for the kids there" is 46 characters and two requests. **Two
 * mechanical actions in one message are the tell**, and they are also exactly
 * the situation in which the restricted tools fail midway and leave half an
 * edit - better for the strong model to do both from the start.
 */
const MECHANICAL_GLOBAL = new RegExp(MECHANICAL.source, 'g');
const countMechanical = (t: string): number => (t.match(MECHANICAL_GLOBAL) ?? []).length;

/**
 * The decision. `trip` is the trip **before** the turn.
 */
export function classifyTurn(lastUserText: string, trip: Trip | null, hasImage: boolean): TurnRoute {
  const text = (lastUserText ?? '').trim();

  // With no trip there is nothing to edit - every request is a build or a conversation
  if (!trip || trip.days.length === 0) return HEAVY('אין טיול פעיל');
  // An image = needs a model that can see, and also a request that cannot be classified from the text
  if (hasImage) return HEAVY('תמונה מצורפת');
  if (text.length === 0) return HEAVY('הודעה ריקה');
  if (text.length > MAX_LIGHT_CHARS) return HEAVY(`הודעה ארוכה (${text.length})`);

  for (const d of DISQUALIFY) if (d.re.test(text)) return HEAVY(d.why);

  const n = countMechanical(text);
  if (n === 0) return HEAVY('לא זוהתה פעולה מכנית');
  if (n > 1) return HEAVY(`${n} פעולות בהודעה אחת`);

  return { light: true, reason: 'עריכה מכנית' };
}

/**
 * Whether the light turn needs to fall back to the strong model.
 *
 * The rule: **anything that is not a clean success escalates.** The light
 * turn is cheap, so it is worth throwing it away and rerunning the moment it
 * did not do exactly what it was sent to do - better to pay twice than to
 * leave a partial edit on the trip.
 */
export function shouldEscalate(o: {
  /** whether any tool ran and executed successfully */
  toolRan: boolean;
  /** whether any tool returned an error (input rejected by the server) */
  toolFailed: boolean;
  /** the last stop_reason */
  stopReason: string;
  /** number of iterations used */
  iterations: number;
}): string | null {
  if (o.toolFailed) return 'כלי נכשל';
  if (o.stopReason === 'max_tokens') return 'התשובה נקטעה';
  if (!o.toolRan) return 'לא בוצעה שום עריכה';
  if (o.iterations > MAX_LIGHT_ITERATIONS) return 'יותר מדי איטרציות';
  return null;
}

/**
 * Iteration ceiling for the light path. A mechanical edit is one call,
 * sometimes two (e.g. `set_day_city` followed by `add_place`). Three is
 * already a sign the model is groping - and groping is exactly what the
 * strong model is supposed to do.
 */
export const MAX_LIGHT_ITERATIONS = 3;
