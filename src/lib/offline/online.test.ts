/**
 * `isoDay` looks trivial and that is exactly why it is here.
 *
 * It feeds the date shown beside kashrut information and prices when offline, and
 * `toISOString()` would have returned UTC: a traveller standing in Mexico City in the
 * evening would have seen their content dated **a day forward**, and a traveller in Tokyo a
 * day back. This is the same trap already documented in `dates.ts`, and it returns every
 * time somebody converts a timestamp into a date.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDay, OFFLINE_HINT } from './online.ts';

test('מחזיר את התאריך המקומי, לא UTC', () => {
  // Exactly local midnight: any conversion through UTC from east of Greenwich would return
  // the previous day
  const local = new Date(2026, 6, 29, 0, 0, 0);
  assert.equal(isoDay(local.getTime()), '2026-07-29');

  // A moment before midnight - still the same local day
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
