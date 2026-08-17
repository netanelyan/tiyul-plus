/**
 * The range arithmetic for the growth metrics. The claims worth locking down: the window
 * boundaries (day 6 inside, day 7 in the previous one, day 14 outside), that "all" really
 * does total everything with no trend, that the older export kinds do not leak into the
 * metrics, and that the "old function" detection is not confused by the long-standing
 * share kinds.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGrowth, daysBetween, growthEverCounted, type EventRow } from './growthMath.ts';

const TODAY = '2026-08-13';
const day = (n: number) => {
  const d = new Date(Date.parse(TODAY) - n * 86_400_000);
  return d.toISOString().slice(0, 10);
};
const row = (n: number, kind: string, count: number): EventRow => ({ day: day(n), kind, count });

test('daysBetween: היום 0, אתמול 1, תאריך פגום NaN', () => {
  assert.equal(daysBetween(TODAY, TODAY), 0);
  assert.equal(daysBetween(TODAY, day(1)), 1);
  assert.ok(Number.isNaN(daysBetween(TODAY, 'לא-תאריך')));
});

test('גבולות חלון 7 הימים: יום 6 בנוכחי, יום 7 בקודם, יום 13 בקודם, יום 14 בחוץ', () => {
  const rows = [
    row(0, 'trip_created', 1),
    row(6, 'trip_created', 2),
    row(7, 'trip_created', 4),
    row(13, 'trip_created', 8),
    row(14, 'trip_created', 16), // outside both windows
  ];
  const g = computeGrowth(rows, TODAY, 7);
  assert.equal(g.trips.current, 3); // days 0 and 6
  assert.equal(g.trips.previous, 12); // days 7 and 13
});

test('"הכול" מסכם את כל ההיסטוריה ואין לו מגמה (previous=null)', () => {
  const rows = [row(0, 'trip_created', 1), row(100, 'trip_created', 5), row(400, 'trip_created', 7)];
  const g = computeGrowth(rows, TODAY, 'all');
  assert.equal(g.trips.current, 13);
  assert.equal(g.trips.previous, null);
});

test('שיתופים = share + whatsapp ביחד; סוגי ייצוא אחרים לא דולפים לאף מדד', () => {
  const rows = [
    row(1, 'share', 2),
    row(2, 'whatsapp', 3),
    row(1, 'print', 50), // an export, not growth
    row(1, 'maps', 50),
    row(1, 'סוג-שלא-קיים', 50),
  ];
  const g = computeGrowth(rows, TODAY, 7);
  assert.equal(g.shares.current, 5);
  assert.equal(g.trips.current, 0);
  assert.equal(g.opens.current, 0);
});

test('כל ששת המדדים ממופים לסוג הנכון', () => {
  const rows = [
    row(1, 'trip_created', 1),
    row(1, 'share', 2),
    row(1, 'shared_open', 3),
    row(1, 'shared_adopt', 4),
    row(1, 'newsletter', 5),
    row(1, 'return_visit', 6),
  ];
  const g = computeGrowth(rows, TODAY, 7);
  assert.equal(g.trips.current, 1);
  assert.equal(g.shares.current, 2);
  assert.equal(g.opens.current, 3);
  assert.equal(g.adopts.current, 4);
  assert.equal(g.emails.current, 5);
  assert.equal(g.returns.current, 6);
});

test('שורה עם תאריך עתידי (הסטת שעון) נספרת בנוכחי ולא נעלמת', () => {
  const g = computeGrowth([row(-1, 'trip_created', 1)], TODAY, 7);
  assert.equal(g.trips.current, 1);
});

test('growthEverCounted: share ותיק לא נחשב הוכחה שהפונקציה עודכנה', () => {
  // The site counted share/print for months before the feature - rows like those say
  // nothing about whether bump_event knows the new kinds
  assert.equal(growthEverCounted([row(1, 'share', 9), row(1, 'print', 9)]), false);
  assert.equal(growthEverCounted([row(1, 'trip_created', 1)]), true);
  assert.equal(growthEverCounted([]), false);
});

test('מונים בכמות אפס או שלילית לא נספרים', () => {
  const g = computeGrowth([row(1, 'trip_created', 0), row(2, 'trip_created', -3)], TODAY, 7);
  assert.equal(g.trips.current, 0);
});
