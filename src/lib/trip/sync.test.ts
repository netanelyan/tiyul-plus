import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeTrips } from './sync';
import { pruneTombstones } from './storage';
import type { Trip } from './types';

/**
 * הבאג שהטסטים האלה שומרים עליו: מוחקים טיול, מרעננים, והוא חוזר.
 * המחיקה הייתה "היעדר שורה" ולכן כל עותק מרוחק ניצח אותה. עכשיו יש
 * למחיקה חותמת, והיא משתתפת במיזוג כמו כל שינוי אחר.
 */

const T = 1_700_000_000_000;
const trip = (id: string, at: number): Trip => ({
  id,
  name: id,
  citySlugs: ['vienna'],
  days: [],
  createdAt: at,
  updatedAt: at,
});

test('טיול שנמחק מקומית לא חוזר לחיים ממשיכה מהשרת', () => {
  const r = mergeTrips([], [trip('a', T)], { a: T + 1000 }, {});
  assert.deepEqual(r.applyLocally, []);
  assert.equal(r.pushRemotely.length, 0);
  assert.equal(r.writeRemotely.a, T + 1000);
});

test('העריכה מנצחת כשהעותק המרוחק חדש מהמחיקה (נערך במכשיר אחר אחרי)', () => {
  const r = mergeTrips([], [trip('a', T + 5000)], { a: T }, {});
  assert.equal(r.applyLocally.length, 1);
  assert.equal(r.writeRemotely.a, undefined);
});

test('מצבה מרוחקת מוחקת מקומית - מכשיר אחר מחק', () => {
  const r = mergeTrips([trip('a', T)], [], {}, { a: T + 1000 });
  assert.equal(r.pushRemotely.length, 0, 'לא דוחפים בחזרה טיול שנמחק');
  assert.equal(r.applyDeletions.a, T + 1000);
});

test('מצבה מרוחקת ישנה מהעריכה המקומית לא מוחקת', () => {
  const r = mergeTrips([trip('a', T + 5000)], [], {}, { a: T });
  assert.equal(r.pushRemotely.length, 1);
  assert.equal(r.applyDeletions.a, T, 'המצבה נלמדת, אבל הטיול נשאר - זו החלטת ה-context');
});

test('מחיקה מקומית שהשרת לא מכיר נכתבת כמצבה, כדי שמכשיר שני לא יחזיר אותה', () => {
  const r = mergeTrips([], [], { a: Date.now() }, {});
  assert.ok(r.writeRemotely.a);
});

test('מצבה מקומית עתיקה לא נכתבת לשרת', () => {
  const old = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const r = mergeTrips([], [], { a: old }, {});
  assert.deepEqual(r.writeRemotely, {});
});

test('כתיבת מצבות לשרת חסומה ב-50 שורות', () => {
  const many: Record<string, number> = {};
  for (let i = 0; i < 120; i++) many[`t${i}`] = Date.now() - i;
  const r = mergeTrips([], [], many, {});
  assert.equal(Object.keys(r.writeRemotely).length, 50);
});

test('המיזוג הרגיל לא נשבר: המאוחר מנצח, וייחודיים נשמרים', () => {
  const r = mergeTrips([trip('a', T + 10), trip('b', T)], [trip('a', T), trip('c', T)], {}, {});
  assert.deepEqual(
    r.applyLocally.map((t) => t.id),
    ['c'],
  );
  assert.deepEqual(r.pushRemotely.map((t) => t.id).sort(), ['a', 'b']);
});

test('גזימת מצבות: לפי גיל ולפי תקרה', () => {
  const now = Date.now();
  const pruned = pruneTombstones({ fresh: now - 1000, stale: now - 200 * 86_400_000 }, now);
  assert.deepEqual(Object.keys(pruned), ['fresh']);

  const many: Record<string, number> = {};
  for (let i = 0; i < 300; i++) many[`t${i}`] = now - i;
  assert.equal(Object.keys(pruneTombstones(many, now)).length, 200);
  assert.deepEqual(pruneTombstones(undefined), {});
});

/**
 * הבאג שנתנאל דיווח עליו בפעם השנייה: "מחקתי שניים מהם לפני זמן מה, והם חזרו."
 *
 * המצבות עצמן עובדות. מה ששבר אותן הוא **החתמה מחדש**: `upsertTrip` בהקשר
 * חתם `updatedAt: Date.now()` על כל טיול, כולל טיול שהגיע מהשרת בלי שינוי,
 * ו-`AccountSync` השתמש בו כדי להחיל את תוצאת המשיכה. לכן **עצם ההתחברות
 * במכשיר שני הפכה טיול ישן ל"נערך עכשיו"**, והדחיפה שאחריה כתבה אותו לשרת עם
 * חותמת מאוחרת מהמחיקה. מאותו רגע המיזוג עושה בדיוק מה שנתבקש - "עריכה
 * מאוחרת מהמחיקה מנצחת" - ומחזיר את הטיול לחיים בכל המכשירים, והמצבה אבודה.
 *
 * הכלל לא השתנה. מה שהשתנה הוא שהחלת מצב מהשרת מפסיקה להתחזות לעריכה.
 */
test('a device that only PULLED a trip must not restamp it into an edit that beats a deletion', () => {
  const T0 = 1_000; // הטיול נוצר ונערך לאחרונה
  const T1 = 2_000; // מכשיר א׳ מחק אותו
  const T2 = 3_000; // מכשיר ב׳ התחבר ומשך

  const trip = { id: 'a', name: 'וינה', citySlugs: [], days: [], createdAt: T0, updatedAt: T0 };

  // מכשיר ב׳ מושך את הטיול (עדיין בלי לדעת על המחיקה - הוא התחבר לפניה)
  const pulled = mergeTrips([], [trip], {}, {});
  assert.equal(pulled.applyLocally.length, 1);

  // ההחלה הישנה: החתמה מחדש ל"עכשיו". זה כל ההבדל.
  const restamped = { ...pulled.applyLocally[0], updatedAt: T2 };
  const applied = { ...pulled.applyLocally[0] }; // ההחלה הנכונה: כפי שהגיע

  // מכשיר א׳ מושך אחרי שמכשיר ב׳ דחף. המצבה שלו היא T1.
  const withRestamp = mergeTrips([], [restamped], { a: T1 }, { a: T1 });
  const withoutRestamp = mergeTrips([], [applied], { a: T1 }, { a: T1 });

  assert.equal(withRestamp.applyLocally.length, 1, 'הבאג: החתמה מחדש מחזירה את הטיול לחיים');
  assert.equal(withoutRestamp.applyLocally.length, 0, 'בלי החתמה מחדש המחיקה מחזיקה');
});

/** עריכה אמיתית אחרי המחיקה עדיין מנצחת - הכלל לא נחלש, רק הפסיק לירות לבד */
test('a REAL edit after the deletion still wins', () => {
  const trip = { id: 'a', name: 'וינה', citySlugs: [], days: [], createdAt: 1_000, updatedAt: 5_000 };
  const merged = mergeTrips([], [trip], { a: 2_000 }, { a: 2_000 });
  assert.equal(merged.applyLocally.length, 1);
});
