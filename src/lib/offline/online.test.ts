/**
 * `isoDay` נראה זניח וזה בדיוק למה הוא כאן.
 *
 * הוא מזין את התאריך שמוצג ליד מידע כשרות ומחירים ללא רשת, ו-
 * `toISOString()` היה מחזיר UTC: מטייל שעומד במקסיקו סיטי בערב היה
 * רואה את התוכן שלו מתוארך **יום קדימה**, ומטייל בטוקיו יום אחורה.
 * זו אותה מלכודת שכבר תועדה ב-`dates.ts` והיא חוזרת בכל פעם שמישהו
 * ממיר חותמת זמן לתאריך.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDay, OFFLINE_HINT } from './online.ts';

test('מחזיר את התאריך המקומי, לא UTC', () => {
  // חצות מקומית בדיוק: כל המרה דרך UTC במקום מזרחית לגריניץ׳ תחזיר
  // את היום הקודם
  const local = new Date(2026, 6, 29, 0, 0, 0);
  assert.equal(isoDay(local.getTime()), '2026-07-29');

  // רגע לפני חצות - עדיין אותו יום מקומי
  const late = new Date(2026, 6, 29, 23, 59, 59);
  assert.equal(isoDay(late.getTime()), '2026-07-29');
});

test('חודש ויום חד-ספרתיים מרופדים באפס', () => {
  assert.equal(isoDay(new Date(2026, 0, 5, 12).getTime()), '2026-01-05');
});

test('הנוסח לפקד מושבת אומר גם מה קרה וגם למה', () => {
  assert.ok(OFFLINE_HINT.includes('אין חיבור'));
  assert.ok(OFFLINE_HINT.includes('דורש'));
});
