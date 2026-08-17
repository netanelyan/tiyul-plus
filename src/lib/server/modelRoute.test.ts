/**
 * The classifier. It is the only thing that decides which model runs, so it
 * is the only thing that can and should be tested offline - the model's own
 * behavior is measured live.
 *
 * The bias of these tests is deliberate: **an error upward is cheap, an
 * error downward is expensive.** A complex request mistakenly sent to the
 * strong model costs a few cents; a complex request sent to the cheap model
 * costs a wasted turn and a wrong edit on a traveller's screen. That is why
 * most cases here are "make sure this does **not** drop to the light path".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_TOOLS } from '@/lib/trip/agent.ts';
import type { Trip } from '@/lib/trip/types';
import {
  LIGHT_TOOLS,
  MAX_LIGHT_ITERATIONS,
  classifyTurn,
  isLightTool,
  shouldEscalate,
} from './modelRoute.ts';

const trip = (days = 3): Trip => ({
  id: 't1',
  name: 'וינה ורומא',
  citySlugs: ['vienna', 'rome'],
  createdAt: 1,
  days: Array.from({ length: days }, (_, i) => ({
    id: `d${i}`,
    citySlug: i < 2 ? 'vienna' : 'rome',
    placeIds: [],
  })),
  preferences: {},
});

const light = (text: string) => classifyTurn(text, trip(), false).light;

test('הבקשה של נתנאל עצמה יורדת למסלול הקל', () => {
  assert.equal(light('תזיז את יום 5 ליום 1'), true);
  assert.equal(light('תעביר את היום הראשון לסוף'), true);
});

test('עריכות מכניות נוספות יורדות למסלול הקל', () => {
  for (const t of [
    'תוסיף את הקולוסיאום ליום 2',
    'תוריד את העצירה השנייה מיום 3',
    'תסיר את הפארק מיום 1',
    'תשנה את השם של הטיול לחופשה באיטליה',
    'תוסיף הערה ליום 2: לצאת מוקדם',
    'תסמן שסגרנו הכול',
  ]) {
    assert.equal(light(t), true, t);
  }
});

test('בנייה נשארת על המודל החזק', () => {
  for (const t of [
    'תבנה לי 8 ימים באיטליה',
    'תכנן מחדש את הטיול',
    'צור טיול חדש לפריז',
    'תתחיל מהתחלה',
  ]) {
    assert.equal(light(t), false, t);
  }
});

test('מחיקה נשארת על המודל החזק - הרישום מתעד דילוג על אישור', () => {
  for (const t of ['תמחק את יום 3', 'תבטל את הטיול', 'תרוקן את יום 2', 'תוריד יום']) {
    assert.equal(light(t), false, t);
  }
});

test('שאלה נשארת על המודל החזק - שם נמדדה סחיפה מהדאטה', () => {
  for (const t of [
    'מה כדאי לראות ברומא?',
    'איזה יום הכי עמוס',
    'תמליץ לי על משהו לילדים',
    'האם כדאי להוסיף עוד יום',
  ]) {
    assert.equal(light(t), false, t);
  }
});

test('נושאים שדורשים מקור נשארים על המודל החזק', () => {
  for (const t of [
    'תוסיף מלון ליום 2',
    'תוסיף מסעדה כשרה ליום 1',
    'תזיז את יום 2 בגלל הפסטיבל',
    'תוסיף משהו זול ליום 3',
    'תזיז את יום 2 לשבת',
    /*
      Deliberate overlap: "mark that we already have a hotel" is exactly
      `set_booking_status`, a tool that IS on the whitelist - but the word
      "hotel" disqualifies it. This is a real case of over-conservatism, and
      it stays that way: a booking-marking turn is rare, and separating "we
      have a hotel" from "find me a hotel" by keywords is exactly the kind of
      distinction that, when it breaks, breaks in the expensive direction.
    */
    'תסמן שיש לנו כבר מלון',
  ]) {
    assert.equal(light(t), false, t);
  }
});

test('בלי טיול פעיל - תמיד המודל החזק', () => {
  assert.equal(classifyTurn('תזיז את יום 5 ליום 1', null, false).light, false);
  const empty = { ...trip(0), days: [] };
  assert.equal(classifyTurn('תזיז את יום 5 ליום 1', empty, false).light, false);
});

test('תמונה מצורפת - תמיד המודל החזק', () => {
  assert.equal(classifyTurn('תזיז את יום 5 ליום 1', trip(), true).light, false);
});

test('הודעה ארוכה - תמיד המודל החזק, גם אם יש בה פועל מכני', () => {
  const long =
    'תזיז את יום 5 ליום 1 בבקשה, כי אנחנו נוחתים מוקדם ואני רוצה שהיום הראשון יהיה קליל ' +
    'ולא עמוס מדי, ואחר כך נראה מה עושים עם השאר';
  assert.ok(long.length > 90, String(long.length));
  assert.equal(light(long), false);
});

test('שתי פעולות בהודעה אחת - המודל החזק, גם כשהיא קצרה', () => {
  /*
    46 characters, two requests. Length alone would not have caught this,
    and it is exactly the situation where a limited tool set leaves half an
    edit on the trip.
  */
  const t = 'תזיז את יום 5 ליום 1 ותוסיף שם עוד עצירה';
  assert.ok(t.length < 90);
  assert.equal(light(t), false);
});

test('הודעה בלי פועל מכני כלל - המודל החזק, גם אם היא קצרה', () => {
  for (const t of ['תודה', 'אוקיי', 'יופי', 'רומא']) {
    assert.equal(light(t), false, t);
  }
});

/* ---------- The structural guarantee ---------- */

test('כל כלי ברשימה הלבנה קיים באמת', () => {
  const names = new Set(AGENT_TOOLS.map((t) => t.name));
  for (const t of LIGHT_TOOLS) assert.ok(names.has(t), `כלי שלא קיים: ${t}`);
});

test('הכלים המסוכנים אינם ברשימה הלבנה', () => {
  /*
    This is the list that protects everything else. `create_trip_full`
    builds a trip, `remove_day` deletes, `set_day_places` overwrites a whole
    day, and the last three go outward or produce a claim about the world -
    all require the strong model.
  */
  for (const t of [
    'create_trip',
    'create_trip_full',
    'set_day_places',
    'remove_day',
    'explore_destination',
    'booking_search',
    'city_date_notes',
    'add_pin',
    'remove_pin',
  ]) {
    assert.equal(isLightTool(t), false, t);
  }
});

test('סינון הכלים בפועל מחזיר בדיוק את הרשימה הלבנה', () => {
  const filtered = AGENT_TOOLS.filter((t) => isLightTool(t.name)).map((t) => t.name);
  assert.deepEqual([...filtered].sort(), [...LIGHT_TOOLS].sort());
  assert.ok(filtered.length < AGENT_TOOLS.length);
});

/* ---------- The escalation ---------- */

const base = { toolRan: true, toolFailed: false, stopReason: 'end_turn', iterations: 1 };

test('הצלחה נקייה לא מסלימה', () => {
  assert.equal(shouldEscalate(base), null);
});

test('כל כישלון מסלים', () => {
  assert.ok(shouldEscalate({ ...base, toolFailed: true }));
  assert.ok(shouldEscalate({ ...base, toolRan: false }));
  assert.ok(shouldEscalate({ ...base, stopReason: 'max_tokens' }));
  assert.ok(shouldEscalate({ ...base, iterations: MAX_LIGHT_ITERATIONS + 1 }));
});

test('תשובה בלי אף כלי מסלימה - זה המסלול של "אני לא יכול"', () => {
  /*
    The light-path instruction tells the model to say in one sentence that it
    did not perform, and not to call a tool. Without this check, "I cannot"
    would be kept as a final answer to the traveller instead of moving to a
    model that can.
  */
  assert.equal(shouldEscalate({ ...base, toolRan: false }), 'לא בוצעה שום עריכה');
});
