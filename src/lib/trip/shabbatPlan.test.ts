import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shabbatPlanFor, ZMANIM_METHOD_HE } from '@/lib/trip/shabbatPlan';
import type { Destination, Place } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';

// Vienna's real centre; the coordinates only have to be plausible for the
// astronomy to be meaningful.
const vienna = {
  slug: 'vienna',
  name: 'וינה',
  countrySlug: 'austria',
  center: { lat: 48.2082, lng: 16.3738 },
} as unknown as Destination;
const bratislava = {
  slug: 'bratislava',
  name: 'ברטיסלבה',
  countrySlug: 'slovakia',
  center: { lat: 48.1486, lng: 17.1077 },
} as unknown as Destination;

const PLACES: Record<string, Place> = {
  museum: {
    id: 'museum',
    name: 'מוזיאון',
    category: 'museum',
    lat: 48.2035,
    lng: 16.3585,
  } as Place,
  park: {
    id: 'park',
    name: 'פארק',
    category: 'nature',
    lat: 48.2105,
    lng: 16.3705,
  } as Place,
  far: {
    id: 'far',
    name: 'מקום רחוק',
    category: 'nature',
    lat: 48.28,
    lng: 16.45,
  } as Place,
};

const destOf = (s: string) =>
  s === 'vienna' ? vienna : s === 'bratislava' ? bratislava : undefined;
const placeOf = (id: string) => PLACES[id];

function trip(over: Partial<Trip>): Trip {
  return {
    id: 't',
    name: 'טיול',
    citySlugs: ['vienna'],
    days: [],
    startDate: '2026-04-03', // a Friday
    ...over,
  } as Trip;
}

// 2026-04-03 is a Friday, 2026-04-04 a Saturday. 2026-04-02 is 15 Nisan
// (Pesach), verified independently against ICU in hebrewCalendar.test.ts.

test('a Saturday in the trip is flagged as a rest day, with an end time', () => {
  const t = trip({
    startDate: '2026-04-03',
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'vienna', placeIds: [] },
    ],
  } as Partial<Trip>);
  const plan = shabbatPlanFor(t, destOf, placeOf);
  const sat = plan.find((d) => d.date === '2026-04-04');
  assert.ok(sat, 'Saturday not found in the plan');
  assert.equal(sat!.isRestDay, true);
  assert.equal(sat!.reason.shabbat, true);
  assert.ok(sat!.ends, 'no end time computed');
});

test('a Friday carries a candle-lighting time and is not itself a rest day', () => {
  // 2026-05-15: a Friday that is NOT also a chag. The first draft of this test
  // used 2026-04-03, which is a Friday AND the second day of Pesach - so the
  // code was right to call it a rest day and the fixture was wrong. Worth
  // keeping as a note: around Pesach and Sukkot, "a Friday" and "an ordinary
  // Friday" are not the same thing.
  const t = trip({
    startDate: '2026-05-15',
    days: [{ id: 'a', citySlug: 'vienna', placeIds: [] }],
  } as Partial<Trip>);
  const fri = shabbatPlanFor(t, destOf, placeOf).find((d) => d.date === '2026-05-15');
  assert.ok(fri);
  assert.equal(fri!.isRestDay, false);
  assert.ok(fri!.candles, 'no candle time on the Friday');
});

test('a Friday that is also yom tov is a rest day, not merely an erev', () => {
  // 2026-04-03 is Friday and the second day of Pesach. Treating it as an
  // ordinary Friday would tell an observant traveller the day is free.
  const t = trip({
    startDate: '2026-04-03',
    days: [{ id: 'a', citySlug: 'vienna', placeIds: [] }],
  } as Partial<Trip>);
  const day = shabbatPlanFor(t, destOf, placeOf)[0];
  assert.equal(day.isRestDay, true);
  assert.ok(day.reason.chagim.length > 0);
});

test('a chag is flagged even midweek, and Pesach is not confused with Shabbat', () => {
  const t = trip({
    startDate: '2026-04-02', // 15 Nisan, a Thursday
    days: [{ id: 'a', citySlug: 'vienna', placeIds: [] }],
  } as Partial<Trip>);
  const day = shabbatPlanFor(t, destOf, placeOf)[0];
  assert.equal(day.isRestDay, true);
  assert.equal(day.reason.shabbat, false, 'Pesach is not Shabbat');
  assert.ok(day.reason.chagim.some((c) => c.name === 'פסח'));
});

test('an ordinary week produces no rows at all - no noise on a trip that misses both', () => {
  const t = trip({
    startDate: '2026-05-18', // Monday
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'vienna', placeIds: [] },
    ],
  } as Partial<Trip>);
  assert.deepEqual(shabbatPlanFor(t, destOf, placeOf), []);
});

// ------------------------------------------------------------ the warnings

test('inter-city travel landing on a rest day is warned about', () => {
  const t = trip({
    startDate: '2026-04-03',
    citySlugs: ['vienna', 'bratislava'],
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'bratislava', placeIds: [] }, // Saturday, different city
    ],
  } as Partial<Trip>);
  const sat = shabbatPlanFor(t, destOf, placeOf).find((d) => d.date === '2026-04-04');
  assert.ok(sat!.warnings.some((w) => w.kind === 'intercity-travel'));
});

test('museums and shops on a rest day are flagged as likely affected, never as closed', () => {
  const t = trip({
    startDate: '2026-04-03',
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'vienna', placeIds: ['museum', 'park'] },
    ],
  } as Partial<Trip>);
  const sat = shabbatPlanFor(t, destOf, placeOf).find((d) => d.date === '2026-04-04');
  const w = sat!.warnings.find((x) => x.kind === 'likely-closed');
  assert.ok(w, 'no closure warning');
  // We hold no opening hours, so the wording must never assert a closed door.
  assert.match(w!.text, /לבדוק|בחלק/);
  assert.doesNotMatch(w!.text, /סגור היום|בטוח סגור/);
});

test('the second day of yom tov is reported as a personal decision, not ruled on', () => {
  const t = trip({
    startDate: '2026-04-03', // 16 Nisan - second day of Pesach
    days: [{ id: 'a', citySlug: 'vienna', placeIds: [] }],
  } as Partial<Trip>);
  const day = shabbatPlanFor(t, destOf, placeOf)[0];
  const w = day.warnings.find((x) => x.kind === 'chag-second-day');
  assert.ok(w, 'second day not reported');
  assert.match(w!.text, /יש.*שנוהגים.*ויש שלא|הכרעה אישית/);
  assert.doesNotMatch(w!.text, /חייבים|אסור לכם|מותר לכם/);
});

// -------------------------------------------------- walking from the lodging

test('walking distances are measured from the lodging pin of THAT city', () => {
  const t = trip({
    startDate: '2026-04-03',
    citySlugs: ['vienna', 'bratislava'],
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'vienna', placeIds: ['far'] },
    ],
    pins: [
      { id: 'p1', kind: 'stay', name: 'מלון וינה', citySlug: 'vienna', lat: 48.2082, lng: 16.3738 },
      { id: 'p2', kind: 'stay', name: 'מלון ברטיסלבה', citySlug: 'bratislava', lat: 48.1486, lng: 17.1077 },
    ],
  } as Partial<Trip>);
  const sat = shabbatPlanFor(t, destOf, placeOf).find((d) => d.date === '2026-04-04');
  assert.equal(sat!.walkFromStay.length, 1);
  // Measured against the Vienna pin (~8km), not the Bratislava one (~55km).
  assert.ok(sat!.walkFromStay[0].km < 20, `used the wrong city's pin: ${sat!.walkFromStay[0].km}km`);
  assert.ok(sat!.warnings.some((w) => w.kind === 'far-from-stay'));
});

test('a pin with no coordinates is ignored rather than guessed at', () => {
  const t = trip({
    startDate: '2026-04-03',
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'vienna', placeIds: ['park'] },
    ],
    pins: [{ id: 'p1', kind: 'stay', name: 'מלון', citySlug: 'vienna' }],
  } as Partial<Trip>);
  const sat = shabbatPlanFor(t, destOf, placeOf).find((d) => d.date === '2026-04-04');
  assert.deepEqual(sat!.walkFromStay, []);
  assert.ok(sat!.warnings.some((w) => w.kind === 'no-lodging-pin'));
});

test('a city-less pin is not borrowed across a multi-city trip', () => {
  const t = trip({
    startDate: '2026-04-03',
    citySlugs: ['vienna', 'bratislava'],
    days: [
      { id: 'a', citySlug: 'vienna', placeIds: [] },
      { id: 'b', citySlug: 'vienna', placeIds: ['park'] },
    ],
    pins: [{ id: 'p1', kind: 'stay', name: 'מלון', lat: 48.2, lng: 16.37 }],
  } as Partial<Trip>);
  const sat = shabbatPlanFor(t, destOf, placeOf).find((d) => d.date === '2026-04-04');
  assert.deepEqual(sat!.walkFromStay, [], 'a pin with no city was used on a multi-city trip');
});

// ---------------------------------------------------------------- the method

test('the calculation method is stated, and states that customs differ', () => {
  assert.match(ZMANIM_METHOD_HE, /18 דקות/);
  assert.match(ZMANIM_METHOD_HE, /8\.5 מעלות/);
  assert.match(ZMANIM_METHOD_HE, /לא היחידים|נוהגות אחרת/);
});

test('a trip with no dates produces nothing rather than assuming a date', () => {
  const t = trip({ startDate: undefined, days: [{ id: 'a', citySlug: 'vienna', placeIds: [] }] } as Partial<Trip>);
  assert.deepEqual(shabbatPlanFor(t, destOf, placeOf), []);
});
