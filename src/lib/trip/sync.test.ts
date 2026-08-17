import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeTrips } from './sync';
import { pruneTombstones } from './storage';
import type { Trip } from './types';

/**
 * The bug these tests guard: delete a trip, refresh, and it comes back.
 * The deletion used to be "the absence of a row", so any remote copy beat
 * it. Now a deletion carries a timestamp, and it participates in the merge
 * like any other change.
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
 * The bug Netanel reported the second time: "I deleted two of them a while
 * ago, and they came back."
 *
 * The tombstones themselves work. What broke them is **restamping**:
 * `upsertTrip` in the context stamped `updatedAt: Date.now()` on every trip,
 * including a trip that came from the server unchanged, and `AccountSync`
 * used it to apply the pull result. Therefore **merely signing in on a
 * second device turned an old trip into "edited now"**, and the push that
 * followed wrote it to the server with a timestamp later than the deletion.
 * From that moment on the merge does exactly what it was asked - "an edit
 * later than the deletion wins" - and brings the trip back to life on all
 * devices, and the tombstone is lost.
 *
 * The rule did not change. What changed is that applying state from the
 * server stops impersonating an edit.
 */
test('a device that only PULLED a trip must not restamp it into an edit that beats a deletion', () => {
  const T0 = 1_000; // the trip was created and last edited
  const T1 = 2_000; // device A deleted it
  const T2 = 3_000; // device B signed in and pulled

  const trip = { id: 'a', name: 'וינה', citySlugs: [], days: [], createdAt: T0, updatedAt: T0 };

  // Device B pulls the trip (still unaware of the deletion - it signed in before it)
  const pulled = mergeTrips([], [trip], {}, {});
  assert.equal(pulled.applyLocally.length, 1);

  // The old application: restamping to "now". That is the whole difference.
  const restamped = { ...pulled.applyLocally[0], updatedAt: T2 };
  const applied = { ...pulled.applyLocally[0] }; // the correct application: as it arrived

  // Device A pulls after device B pushed. Its tombstone is T1.
  const withRestamp = mergeTrips([], [restamped], { a: T1 }, { a: T1 });
  const withoutRestamp = mergeTrips([], [applied], { a: T1 }, { a: T1 });

  assert.equal(withRestamp.applyLocally.length, 1, 'הבאג: החתמה מחדש מחזירה את הטיול לחיים');
  assert.equal(withoutRestamp.applyLocally.length, 0, 'בלי החתמה מחדש המחיקה מחזיקה');
});

/** A real edit after the deletion still wins - the rule was not weakened, it just stopped firing on its own */
test('a REAL edit after the deletion still wins', () => {
  const trip = { id: 'a', name: 'וינה', citySlugs: [], days: [], createdAt: 1_000, updatedAt: 5_000 };
  const merged = mergeTrips([], [trip], { a: 2_000 }, { a: 2_000 });
  assert.equal(merged.applyLocally.length, 1);
});

/* ---------- A shared device: switching between accounts ---------- */

/**
 * **The bug these tests guard.** Signing out did not clear local storage,
 * so the next sign-in on the same computer merged the previous person's
 * trips. The merge itself is correct - it is supposed to push a local trip
 * that is not on the server, and that is the migration of anonymous trips.
 * What was wrong is **what counts as "local"** at that moment.
 */
test('טיול של האדם הקודם היה נדחף לחשבון החדש - זו הצורה של הבאג', () => {
  const previousPersons: Trip[] = [trip('svk', 1000)];
  const { pushRemotely } = mergeTrips(previousPersons, [], {}, {});
  assert.equal(pushRemotely.length, 1, 'מיזוג תמים דוחף אותו - ולכן חייבים לנקות לפניו');
});

test('אחרי ניקוי, ההתחברות של האדם החדש לא מעלה כלום שאינו שלו', () => {
  // This is what AccountSync passes when switchAccount returned "cleared"
  const { pushRemotely, applyLocally } = mergeTrips([], [trip('rome', 500)], {}, {});
  assert.deepEqual(pushRemotely, []);
  assert.equal(applyLocally.length, 1, 'והטיולים שלו כן יורדים אליו');
});

test('טיול אנונימי אמיתי עדיין מהגר בהתחברות ראשונה', () => {
  // accountId === null in storage => no clearing => the migration is preserved
  const { pushRemotely } = mergeTrips([trip('anon', 900)], [], {}, {});
  assert.equal(pushRemotely.length, 1);
});
