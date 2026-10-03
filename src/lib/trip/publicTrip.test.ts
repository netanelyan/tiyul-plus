/**
 * The strip that stands between a private trip and a page Google can read.
 *
 * The first test is the one that matters: a trip is loaded with **every**
 * personal field this product can hold - a surname in the title, a hotel pin
 * with a street address, per-day notes with a confirmation number, kashrut and
 * Shabbat preferences, exact travel dates - and the serialised snapshot is
 * searched for each of those strings. Not "the fields are absent": the bytes are
 * absent.
 *
 * That shape is deliberate. A test that asserts `snapshot.pins === undefined`
 * passes just as happily the day somebody adds `Trip.homeAddress`, which is
 * exactly the failure this module is built to make impossible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_STOPS_TO_INDEX,
  buildSlug,
  indexable,
  isPublicTripSlug,
  monthLabel,
  monthOf,
  newShortId,
  parseSnapshot,
  primaryCity,
  stopCount,
  toPublicSnapshot,
  type CatalogLookup,
} from './publicTrip.ts';
import type { Trip } from './types.ts';

/** A tiny fake catalog - this module must not depend on the real one. */
const catalog: CatalogLookup = {
  placeIdsOf: (slug) =>
    slug === 'rome'
      ? new Set(['rom-a', 'rom-b', 'rom-c', 'rom-d', 'rom-e'])
      : slug === 'venice'
        ? new Set(['ven-a', 'ven-b', 'ven-c', 'ven-d'])
        : undefined,
};

/** Everything personal a trip can carry, with recognisable values. */
const SECRETS = {
  name: 'הטיול של משפחת כהן',
  note: 'אישור מלון 48213, צ׳ק-אין 15:00',
  pinName: 'Hotel Artemide',
  address: 'Via Nazionale 22, Roma',
  start: '2026-08-15',
  end: '2026-08-22',
};

const loadedTrip = (): Trip => ({
  id: 'trip-private-id',
  name: SECRETS.name,
  citySlugs: ['rome'],
  createdAt: 1_760_000_000_000,
  updatedAt: 1_760_000_100_000,
  startDate: SECRETS.start,
  endDate: SECRETS.end,
  days: [
    { id: 'd1', citySlug: 'rome', placeIds: ['rom-a', 'rom-b'], notes: SECRETS.note },
    { id: 'd2', citySlug: 'rome', placeIds: ['rom-c'], notes: SECRETS.note },
  ],
  preferences: { kosher: true, shabbatAware: true, party: 'family', budget: 'low' },
  pins: [
    {
      id: 'p1',
      kind: 'stay',
      name: SECRETS.pinName,
      citySlug: 'rome',
      address: SECRETS.address,
      lat: 41.9,
      lng: 12.49,
      source: 'geocoded',
      note: SECRETS.note,
    },
  ],
});

test('not one byte of the traveller reaches the snapshot', () => {
  const snap = toPublicSnapshot(loadedTrip(), catalog);
  const serialised = JSON.stringify(snap);

  for (const [field, value] of Object.entries(SECRETS)) {
    assert.ok(!serialised.includes(value), `${field} ("${value}") survived into the public snapshot`);
  }
  // The ids that could tie the page back to the owner's own trip.
  assert.ok(!serialised.includes('trip-private-id'), 'the trip id survived');
  assert.ok(!serialised.includes('d1'), 'a day id survived');
  // And the preferences, which say what this family observes.
  assert.ok(!serialised.includes('kosher'), 'a preference key survived');
  assert.ok(!serialised.includes('family'), 'a preference value survived');
});

test('the snapshot carries exactly three things: cities, catalog ids, a month', () => {
  const snap = toPublicSnapshot(loadedTrip(), catalog);
  assert.deepEqual(Object.keys(snap).sort(), ['days', 'month', 'v']);
  assert.deepEqual(Object.keys(snap.days[0]).sort(), ['citySlug', 'placeIds']);
});

test('the exact dates become a month, and the day is gone', () => {
  const snap = toPublicSnapshot(loadedTrip(), catalog);
  assert.equal(snap.month, '2026-08');
  assert.ok(!JSON.stringify(snap).includes('15'), 'the day of the month survived');
  assert.equal(monthLabel(snap.month), 'אוגוסט');
});

test('a trip with no dates simply has no month', () => {
  const trip = loadedTrip();
  delete trip.startDate;
  delete trip.endDate;
  assert.equal(toPublicSnapshot(trip, catalog).month, null);
});

test('a corrupt date is not parsed into a confident wrong month', () => {
  // new Date('2026-13-40') does not throw, it rolls into the next year.
  assert.equal(monthOf('2026-13-40'), null);
  assert.equal(monthOf('2026-00-10'), null);
  assert.equal(monthOf('not a date'), null);
  assert.equal(monthOf(undefined), null);
  assert.equal(monthOf('2026-08-15'), '2026-08');
});

test('a stop that is not a catalog place is dropped', () => {
  const trip = loadedTrip();
  trip.days = [{ id: 'd1', citySlug: 'rome', placeIds: ['rom-a', 'my-own-pin', 'rom-b'] }];
  const snap = toPublicSnapshot(trip, catalog);
  assert.deepEqual(snap.days[0].placeIds, ['rom-a', 'rom-b']);
});

test('a day in an unknown city keeps its place in the order and loses its stops', () => {
  const trip = loadedTrip();
  trip.days = [
    { id: 'd1', citySlug: 'rome', placeIds: ['rom-a'] },
    { id: 'd2', citySlug: 'atlantis', placeIds: ['atl-a', 'atl-b'] },
    { id: 'd3', citySlug: 'rome', placeIds: ['rom-b'] },
  ];
  const snap = toPublicSnapshot(trip, catalog);
  assert.equal(snap.days.length, 3, 'dropping the day would renumber every day after it');
  assert.deepEqual(snap.days[1].placeIds, []);
});

test('the primary city is the one with the most days', () => {
  const trip = loadedTrip();
  trip.days = [
    { id: '1', citySlug: 'venice', placeIds: ['ven-a'] },
    { id: '2', citySlug: 'rome', placeIds: ['rom-a'] },
    { id: '3', citySlug: 'rome', placeIds: ['rom-b'] },
  ];
  assert.equal(primaryCity(toPublicSnapshot(trip, catalog)), 'rome');
});

test('a tie goes to the city that appears first', () => {
  const trip = loadedTrip();
  trip.days = [
    { id: '1', citySlug: 'venice', placeIds: ['ven-a'] },
    { id: '2', citySlug: 'rome', placeIds: ['rom-a'] },
  ];
  assert.equal(primaryCity(toPublicSnapshot(trip, catalog)), 'venice');
});

/* ---------------- the indexing gate ---------------- */

const tripWithStops = (n: number): Trip => {
  const ids = ['rom-a', 'rom-b', 'rom-c', 'rom-d', 'rom-e', 'ven-a', 'ven-b', 'ven-c', 'ven-d'];
  const trip = loadedTrip();
  trip.days = [
    { id: '1', citySlug: 'rome', placeIds: ids.slice(0, Math.min(n, 5)) },
    { id: '2', citySlug: 'venice', placeIds: n > 5 ? ids.slice(5, n) : [] },
  ];
  return trip;
};

test('below the threshold the page is publishable but not indexable', () => {
  const snap = toPublicSnapshot(tripWithStops(MIN_STOPS_TO_INDEX - 1), catalog);
  assert.equal(stopCount(snap), MIN_STOPS_TO_INDEX - 1);
  assert.equal(indexable(snap, catalog), false);
});

test('at the threshold it is indexable - the boundary is inclusive', () => {
  const snap = toPublicSnapshot(tripWithStops(MIN_STOPS_TO_INDEX), catalog);
  assert.equal(indexable(snap, catalog), true);
});

test('stops outside the catalog do not count toward the threshold', () => {
  const trip = loadedTrip();
  trip.days = [
    { id: '1', citySlug: 'rome', placeIds: ['rom-a', 'rom-b', 'rom-c', 'rom-d', 'rom-e'] },
    { id: '2', citySlug: 'atlantis', placeIds: ['x1', 'x2', 'x3', 'x4', 'x5'] },
  ];
  const snap = toPublicSnapshot(trip, catalog);
  assert.equal(stopCount(snap), 5);
  assert.equal(indexable(snap, catalog), false, 'invented stops padded the page past the bar');
});

test('a trip whose only city is unknown is never indexable', () => {
  const trip = loadedTrip();
  trip.days = [{ id: '1', citySlug: 'atlantis', placeIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }];
  const snap = toPublicSnapshot(trip, catalog);
  assert.equal(indexable(snap, catalog), false);
});

/* ---------------- the slug ---------------- */

test('the slug says what the page is, and validates', () => {
  const slug = buildSlug('rome', 5, 'k7m2pq9x');
  assert.equal(slug, 'rome-5-k7m2pq9x');
  assert.ok(isPublicTripSlug(slug));
});

test('a short id avoids the characters people misread', () => {
  for (let i = 0; i < 200; i++) {
    const id = newShortId();
    assert.equal(id.length, 8);
    assert.ok(!/[ilo01]/.test(id), `ambiguous character in ${id}`);
  }
});

test('junk slugs are rejected before they reach the database', () => {
  for (const bad of [
    '',
    'rome',
    'rome-5',
    'rome-5-SHORTID',           // upper case is not in the alphabet
    'rome-5-k7m2pq9',           // too short
    'rome-5-k7m2pq9xy',         // too long
    '../../etc/passwd',
    "rome-5-k7m2pq9x'",
    'rome-5-k7m2pq9x,other',
  ]) {
    assert.equal(isPublicTripSlug(bad), false, `accepted "${bad}"`);
  }
});

/* ---------------- reading a stored row back ---------------- */

test('a stored snapshot is re-validated against the catalog, not trusted', () => {
  // A place that has since left the catalog, in a row we wrote ourselves.
  const stored = { v: 1, days: [{ citySlug: 'rome', placeIds: ['rom-a', 'rom-gone'] }], month: '2026-08' };
  const parsed = parseSnapshot(stored, catalog);
  assert.deepEqual(parsed?.days[0].placeIds, ['rom-a']);
});

test('a snapshot of the wrong version, or of the wrong shape, is refused', () => {
  assert.equal(parseSnapshot({ v: 99, days: [] }, catalog), null);
  assert.equal(parseSnapshot({ v: 1 }, catalog), null);
  assert.equal(parseSnapshot(null, catalog), null);
  assert.equal(parseSnapshot('days', catalog), null);
  assert.equal(parseSnapshot({ v: 1, days: [{ placeIds: [] }] }, catalog), null);
});

test('a corrupt month in a stored row becomes no month, never a wrong one', () => {
  const parsed = parseSnapshot({ v: 1, days: [], month: '2026-13' }, catalog);
  assert.equal(parsed?.month, null);
});

test('the round trip is stable: snapshot -> JSON -> parse', () => {
  const snap = toPublicSnapshot(loadedTrip(), catalog);
  const back = parseSnapshot(JSON.parse(JSON.stringify(snap)), catalog);
  assert.deepEqual(back, snap);
});
