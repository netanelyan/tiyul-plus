/**
 * המסווג. הוא הדבר היחיד שקובע איזה מודל רץ, ולכן הוא הדבר היחיד
 * שאפשר וצריך לבדוק אופליין - התנהגות המודל עצמו נמדדת חי.
 *
 * הטיית הבדיקות כאן מכוונת: **שגיאה כלפי מעלה זולה, שגיאה כלפי מטה
 * יקרה.** בקשה מורכבת שנשלחה בטעות למודל החזק עולה כמה אגורות; בקשה
 * מורכבת שנשלחה למודל הזול עולה תור מבוזבז ועריכה שגויה על מסך של
 * מטייל. לכן רוב המקרים כאן הם "ודא שזה **לא** ירד למסלול הקל".
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
      חפיפה מכוונת: "תסמן שיש לנו כבר מלון" הוא בדיוק `set_booking_status`,
      כלי שכן ברשימה הלבנה - אבל המילה "מלון" פוסלת אותו. זה מקרה אמיתי
      של שמרנות יתר, ונשאר כך: תור סימון הזמנות הוא נדיר, וההפרדה בין
      "יש לנו מלון" ל"תמצא לי מלון" לפי מילות מפתח היא בדיוק סוג ההבחנה
      שכשהיא נשברת היא נשברת לכיוון היקר.
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
    46 תווים, שתי בקשות. אורך לבדו לא היה תופס את זה, וזה בדיוק המצב
    שבו כלים מוגבלים משאירים חצי עריכה על הטיול.
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

/* ---------- הערובה המבנית ---------- */

test('כל כלי ברשימה הלבנה קיים באמת', () => {
  const names = new Set(AGENT_TOOLS.map((t) => t.name));
  for (const t of LIGHT_TOOLS) assert.ok(names.has(t), `כלי שלא קיים: ${t}`);
});

test('הכלים המסוכנים אינם ברשימה הלבנה', () => {
  /*
    זו הרשימה שמגנה על השאר. `create_trip_full` בונה טיול, `remove_day`
    מוחק, `set_day_places` דורס יום שלם, והשלושה האחרונים יוצאים החוצה
    או מייצרים טענה על העולם - כולם דורשים את המודל החזק.
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

/* ---------- ההסלמה ---------- */

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
    ההנחיה במסלול הקל אומרת למודל לומר במשפט אחד שהוא לא ביצע, ולא
    לקרוא לכלי. בלי הבדיקה הזאת "אני לא יכול" היה נשמר כתשובה סופית
    למטייל במקום לעבור למודל שכן יכול.
  */
  assert.equal(shouldEscalate({ ...base, toolRan: false }), 'לא בוצעה שום עריכה');
});
