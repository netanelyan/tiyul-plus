/**
 * טסטים ל-isTransient. הרצה: `npm test`.
 *
 * הכלים הם node:test ו-node:assert המובנים, ו-TypeScript נקרא דרך
 * type-stripping של Node - במפורש בלי להוסיף תלות פיתוח (חוק קשיח 6).
 *
 * המקרה הראשון הוא הרגרסיה האמיתית: הקוד הקודם בדק `err.status` ואז
 * חיפש מילים בטקסט, אבל השגיאה שנזרקה בפועל הייתה
 * `new Error('anthropic 529')` - בלי status ובלי אף מילה מהרשימה - ולכן
 * עומס של ה-API סווג כשגיאה קבועה והניסיון השני לא רץ אף פעם.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTransient } from './transient.ts';

/** בדיוק הצורה שנזרקה מ-runClaudeTurn לפני התיקון */
const legacyShape = (status: number) => new Error(`anthropic ${status}`);

class WithStatus extends Error {
  status: number;
  constructor(status: number) {
    super(`anthropic ${status}`);
    this.status = status;
  }
}

test('קוד סטטוס שמופיע רק בטקסט ההודעה - הרגרסיה', () => {
  assert.equal(isTransient(legacyShape(529)), true, '529 overloaded');
  assert.equal(isTransient(legacyShape(429)), true, '429 rate limit');
  assert.equal(isTransient(legacyShape(500)), true);
  assert.equal(isTransient(legacyShape(503)), true);
  assert.equal(isTransient(legacyShape(529)), true);
});

test('שגיאות בקשה אינן חולפות - ניסיון שני לא יעזור', () => {
  assert.equal(isTransient(legacyShape(400)), false, 'בקשה שגויה');
  assert.equal(isTransient(legacyShape(401)), false, 'מפתח שגוי');
  assert.equal(isTransient(legacyShape(403)), false);
  assert.equal(isTransient(legacyShape(404)), false);
  assert.equal(isTransient(legacyShape(413)), false, 'גוף גדול מדי');
});

test('קוד סטטוס על האובייקט מקבל עדיפות', () => {
  assert.equal(isTransient(new WithStatus(529)), true);
  assert.equal(isTransient(new WithStatus(400)), false);
  assert.equal(isTransient({ status: 502 }), true);
  assert.equal(isTransient({ status: 401 }), false);
});

test('408 ו-429 מטופלים כחולפים', () => {
  assert.equal(isTransient(new WithStatus(408)), true);
  assert.equal(isTransient(new WithStatus(429)), true);
});

test('timeout של AbortSignal.timeout', () => {
  // בדיוק מה ש-AbortSignal.timeout(50_000) זורק
  const err = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  assert.equal(isTransient(err), true);
  assert.equal(isTransient(new DOMException('aborted', 'AbortError')), true);
});

test('תקלות רשת לפי טקסט', () => {
  for (const msg of [
    'fetch failed',
    'socket hang up',
    'ECONNRESET',
    'Overloaded',
    'rate limit exceeded',
    'terminated',
  ]) {
    assert.equal(isTransient(new Error(msg)), true, msg);
  }
});

test('שגיאת קוד רגילה אינה חולפת', () => {
  assert.equal(isTransient(new TypeError("Cannot read properties of undefined (reading 'days')")), false);
  assert.equal(isTransient(new Error('placeId לא קיים בדאטה')), false);
  assert.equal(isTransient(null), false);
  assert.equal(isTransient(undefined), false);
});
