/**
 * The dashboard's aggregation.
 *
 * A wrong number on a dashboard is a wrong business decision, so these functions are pure and
 * are tested directly. Two claims recur here: **a malformed row is not counted** (and does not
 * bring the dashboard down), and **a city is counted once per trip** even if it runs for five
 * days - otherwise "where people plan to go" measures length of stay instead of popularity.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, summarize, tripView, type TripRow } from './tripStats.ts';

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const row = (over: Partial<TripRow> & { data?: unknown } = {}): TripRow => ({
  user_id: 'u1',
  id: 't1',
  updated_at: day(0),
  data: {
    name: 'רומא וונציה',
    citySlugs: ['rome', 'venice'],
    createdAt: Date.now(),
    days: [
      { id: 'd1', citySlug: 'rome', placeIds: ['rom-colosseum', 'rom-pantheon'] },
      { id: 'd2', citySlug: 'rome', placeIds: ['rom-trevi'] },
      { id: 'd3', citySlug: 'venice', placeIds: [] },
    ],
  },
  ...over,
});

/* ---------- summarize ---------- */

test('שורה תקינה מסוכמת נכון', () => {
  const s = summarize(row());
  assert.ok(s);
  assert.equal(s.name, 'רומא וונציה');
  assert.equal(s.days, 3);
  assert.equal(s.stops, 3);
  assert.deepEqual(s.citySlugs, ['rome', 'venice']);
});

test('שורה פגומה לא נספרת ולא מפילה', () => {
  for (const bad of [null, 'string', 42, [], undefined]) {
    assert.equal(summarize(row({ data: bad })), null, String(bad));
  }
});

test('שדות חסרים נקראים כאפס ולא כשגיאה', () => {
  const s = summarize(row({ data: {} }));
  assert.ok(s);
  assert.equal(s.days, 0);
  assert.equal(s.stops, 0);
  assert.equal(s.name, '(ללא שם)');
  assert.deepEqual(s.citySlugs, []);
});

test('citySlugs שאינו מערך של מחרוזות מסונן', () => {
  const s = summarize(row({ data: { citySlugs: ['rome', 5, null, { x: 1 }], days: [] } }));
  assert.deepEqual(s?.citySlugs, ['rome']);
});

/* ---------- aggregate ---------- */

const summaries = (rows: TripRow[]) =>
  rows.map(summarize).filter((t): t is NonNullable<typeof t> => t !== null);

test('עיר נספרת פעם אחת לטיול, גם כשיש בה שלושה ימים', () => {
  const a = aggregate(
    summaries([
      row({
        data: {
          citySlugs: ['rome', 'rome', 'rome'],
          createdAt: Date.now(),
          days: [
            { citySlug: 'rome', placeIds: ['a'] },
            { citySlug: 'rome', placeIds: ['b'] },
            { citySlug: 'rome', placeIds: ['c'] },
          ],
        },
      }),
    ]),
  );
  assert.equal(a.topCities.find((c) => c.slug === 'rome')?.trips, 1);
});

test('מטיילים הם מזהים ייחודיים, לא שורות', () => {
  const a = aggregate(
    summaries([
      row({ user_id: 'u1', id: 'a' }),
      row({ user_id: 'u1', id: 'b' }),
      row({ user_id: 'u2', id: 'c' }),
    ]),
  );
  assert.equal(a.trips, 3);
  assert.equal(a.travelers, 2);
});

test('אורך טיפוסי הוא חציון - טיול חריג אחד לא מזיז אותו', () => {
  const mk = (n: number, id: string) =>
    row({
      id,
      data: {
        citySlugs: ['rome'],
        createdAt: Date.now(),
        days: Array.from({ length: n }, () => ({ citySlug: 'rome', placeIds: [] })),
      },
    });
  const a = aggregate(summaries([mk(3, 'a'), mk(3, 'b'), mk(4, 'c'), mk(90, 'd')]));
  assert.equal(a.medianDays, 4);
  // A mean would have been 25 - and that is exactly the number that would have caused a wrong decision
});

test('יום בלי טיולים מוצג כאפס ולא נעלם מהגרף', () => {
  const a = aggregate(summaries([row()]), 30);
  assert.equal(a.perDay.length, 30);
  assert.ok(a.perDay.every((d) => Number.isFinite(d.trips)));
  assert.equal(a.perDay.at(-1)?.trips, 1);
});

test('טיול ישן מהחלון לא מזייף את גרף היצירה', () => {
  const old = row({
    id: 'old',
    updated_at: day(200),
    data: { citySlugs: ['rome'], createdAt: Date.now() - 200 * 86_400_000, days: [] },
  });
  const a = aggregate(summaries([old]), 30);
  assert.equal(a.trips, 1, 'הטיול עצמו כן נספר');
  assert.equal(
    a.perDay.reduce((n, d) => n + d.trips, 0),
    0,
    'אבל לא בתוך חלון 30 הימים',
  );
});

test('מדינה נגזרת מהערים ולא נשמרת פעמיים', () => {
  const a = aggregate(summaries([row()]));
  const italy = a.topCountries.find((c) => c.slug === 'italy');
  assert.ok(italy, 'רומא וונציה הן איטליה');
  assert.equal(italy.trips, 1, 'שתי ערים באותה מדינה הן טיול אחד לאותה מדינה');
});

/* ---------- tripView ---------- */

test('תצוגת טיול מפענחת מזהים לשמות', () => {
  const v = tripView(row().data);
  assert.ok(v);
  assert.equal(v.days.length, 3);
  assert.equal(v.days[0].cityName, 'רומא');
  assert.equal(v.days[0].countryName, 'איטליה');
  assert.ok(v.days[0].stops[0].name.length > 0);
  assert.notEqual(v.days[0].stops[0].name, 'rom-colosseum', 'מזהה גולמי אינו שם');
});

test('מקום שאינו בקטלוג מסומן ולא מוסתר', () => {
  const v = tripView({ name: 'x', days: [{ citySlug: 'rome', placeIds: ['xp-17'] }] });
  assert.equal(v?.days[0].stops[0].unknown, true);
  assert.equal(v?.days[0].stops[0].name, 'xp-17');
});

test('העדפה שלא נקבעה אינה מוצגת כ"לא"', () => {
  const none = tripView({ name: 'x', days: [], preferences: {} });
  assert.deepEqual(none?.preferences, []);
  const some = tripView({ name: 'x', days: [], preferences: { pace: 'relaxed', kosher: true } });
  assert.equal(some?.preferences.length, 2);
  const off = tripView({ name: 'x', days: [], preferences: { kosher: false } });
  assert.deepEqual(off?.preferences, [], 'כשרות כבויה אינה שורה');
});

test('תצוגת טיול לא נופלת על שורה פגומה', () => {
  assert.equal(tripView(null), null);
  assert.equal(tripView('nope'), null);
  const v = tripView({ days: [{ placeIds: 'not-an-array' }], pins: 'nope' });
  assert.equal(v?.days.length, 1);
  assert.deepEqual(v?.days[0].stops, []);
  assert.deepEqual(v?.pins, []);
});

test('סיכה בלי מיקום מסומנת כלא מאומתת', () => {
  const v = tripView({
    name: 'x',
    days: [],
    pins: [
      { name: 'Hotel Devin', kind: 'stay', lat: 48.1, lng: 17.1 },
      { name: 'משהו', kind: 'other' },
    ],
  });
  assert.equal(v?.pins[0].located, true);
  assert.equal(v?.pins[1].located, false);
});
