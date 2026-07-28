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
