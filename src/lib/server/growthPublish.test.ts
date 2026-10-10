/**
 * The growth desk's publishing gate and validation. Everything the route decides
 * before it touches the database is pure and lives in `growthPublish.ts`, so it is
 * tested here without a server or a database.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { toPublicSnapshot, type CatalogLookup } from '@/lib/trip/publicTrip';
import { catalogLookup } from './publicTrips.ts';
import {
  GROWTH_DAILY_MAX,
  LIMITS,
  MIN_TOKEN_LENGTH,
  buildGrowthTrip,
  checkGrowthAuth,
  growthConfig,
  growthTripId,
  isExternalId,
  parseGrowthTrip,
  type GrowthTripInput,
} from './growthPublish.ts';

const TOKEN = 'a'.repeat(MIN_TOKEN_LENGTH);
const EDITOR = '11111111-2222-4333-8444-555555555555';

const fake: CatalogLookup = {
  placeIdsOf: (slug) =>
    ({ tbilisi: new Set(['t1', 't2', 't3']), batumi: new Set(['b1', 'b2']) })[slug],
};

const body = (over: Record<string, unknown> = {}) => ({
  externalId: 'growth:tiktok:7412345678901234567',
  name: 'גאורגיה 5 ימים, למרים',
  days: [
    { citySlug: 'tbilisi', placeIds: ['t1', 't2'], notes: '' },
    { citySlug: 'batumi', placeIds: ['b1'] },
  ],
  startDate: null,
  preferences: { kosher: false, shabbatAware: false },
  ...over,
});

// ---------- Configuration and the gate ----------

test('no token, or a short one, turns the route off rather than open', () => {
  assert.equal(growthConfig({}).token, null);
  assert.equal(growthConfig({ GROWTH_PUBLISH_TOKEN: 'short' }).token, null);
  assert.equal(growthConfig({ GROWTH_PUBLISH_TOKEN: TOKEN }).token, TOKEN);
  assert.equal(checkGrowthAuth(`Bearer ${TOKEN}`, growthConfig({})), 'off');
});

test('the editor id must be a uuid', () => {
  assert.equal(growthConfig({ GROWTH_EDITOR_USER_ID: 'editor@tiyulplus.com' }).editorUserId, null);
  assert.equal(growthConfig({ GROWTH_EDITOR_USER_ID: EDITOR.toUpperCase() }).editorUserId, EDITOR);
});

test('only the exact bearer token passes', () => {
  const cfg = growthConfig({ GROWTH_PUBLISH_TOKEN: TOKEN });
  assert.equal(checkGrowthAuth(`Bearer ${TOKEN}`, cfg), 'ok');
  assert.equal(checkGrowthAuth(null, cfg), 'denied');
  assert.equal(checkGrowthAuth(TOKEN, cfg), 'denied'); // no scheme
  assert.equal(checkGrowthAuth(`Bearer ${TOKEN}x`, cfg), 'denied');
  assert.equal(checkGrowthAuth(`Bearer ${TOKEN.slice(1)}`, cfg), 'denied');
  assert.equal(checkGrowthAuth('Bearer ', cfg), 'denied');
});

// ---------- Identity ----------

test('one external id is always one trip, and two are two', () => {
  const a = growthTripId('growth:tiktok:1');
  assert.equal(a, growthTripId('growth:tiktok:1'));
  assert.notEqual(a, growthTripId('growth:tiktok:2'));
  assert.match(a, /^g-[0-9a-f]{20}$/);
});

test('external ids: the spec’s alphabet and length only', () => {
  assert.ok(isExternalId('growth:agency:acme-tours_2026.10'));
  assert.ok(!isExternalId(''));
  assert.ok(!isExternalId('has space'));
  assert.ok(!isExternalId('קמפיין'));
  assert.ok(!isExternalId('x'.repeat(LIMITS.externalId + 1)));
  assert.ok(!isExternalId(42));
});

// ---------- Validation ----------

test('a well-formed body parses', () => {
  const r = parseGrowthTrip(body(), fake);
  assert.ok(r.ok);
  assert.equal(r.value.days.length, 2);
  assert.deepEqual(r.value.preferences, { kosher: false, shabbatAware: false });
});

const field = (over: Record<string, unknown>) => {
  const r = parseGrowthTrip(body(over), fake);
  return r.ok ? null : r.status === 400 ? r.field : `422`;
};

test('shape errors are a 400 that names the field', () => {
  assert.equal(field({ externalId: 'bad id' }), 'externalId');
  assert.equal(field({ name: '' }), 'name');
  assert.equal(field({ name: 'x'.repeat(LIMITS.name + 1) }), 'name');
  assert.equal(field({ days: [] }), 'days');
  assert.equal(field({ days: Array(LIMITS.days + 1).fill({ citySlug: 'tbilisi', placeIds: ['t1'] }) }), 'days');
  assert.equal(field({ days: [{ citySlug: 'Tbilisi!', placeIds: ['t1'] }] }), 'days[0].citySlug');
  assert.equal(field({ days: [{ citySlug: 'tbilisi', placeIds: [] }] }), 'days[0].placeIds');
  assert.equal(
    field({ days: [{ citySlug: 'tbilisi', placeIds: Array(LIMITS.placesPerDay + 1).fill('t1') }] }),
    'days[0].placeIds',
  );
  assert.equal(field({ days: [{ citySlug: 'tbilisi', placeIds: ['t1', 't1'] }] }), 'days[0].placeIds');
  assert.equal(field({ startDate: '2026-02-30' }), 'startDate');
  assert.equal(field({ startDate: '10/11/2026' }), 'startDate');
  assert.equal(field({ preferences: { kosher: 'yes' } }), 'preferences.kosher');
  assert.equal(parseGrowthTrip(null, fake).ok, false);
  assert.equal(parseGrowthTrip([], fake).ok, false);
});

test('unknown ids are a 422 that lists every one, not a silent drop', () => {
  const r = parseGrowthTrip(
    body({
      days: [
        { citySlug: 'tbilisi', placeIds: ['t1', 'nope'] },
        { citySlug: 'atlantis', placeIds: ['x'] },
        { citySlug: 'batumi', placeIds: ['b9'] },
      ],
    }),
    fake,
  );
  assert.ok(!r.ok && r.status === 422);
  assert.deepEqual(r.unknownCities, ['atlantis']);
  assert.deepEqual(r.unknownPlaces, ['tbilisi/nope', 'batumi/b9']);
});

test('names and notes lose control characters and bidi overrides', () => {
  const rlo = String.fromCharCode(0x202e);
  const r = parseGrowthTrip(
    body({ name: `טיול${rlo}לגאורגיה\n`, days: [{ citySlug: 'tbilisi', placeIds: ['t1'], notes: `a${String.fromCharCode(7)}b` }] }),
    fake,
  );
  assert.ok(r.ok);
  assert.equal(r.value.name, 'טיול לגאורגיה');
  assert.equal(r.value.days[0].notes, 'a b');
});

test('only the two named preferences are kept', () => {
  const r = parseGrowthTrip(body({ preferences: { kosher: true, budget: 'low' } }), fake);
  assert.ok(r.ok);
  assert.deepEqual(r.value.preferences, { kosher: true });
});

// ---------- The trip ----------

const input = (): GrowthTripInput => {
  const r = parseGrowthTrip(body({ days: [
    { citySlug: 'tbilisi', placeIds: ['t1'], notes: 'בוקר' },
    { citySlug: 'batumi', placeIds: ['b1'] },
    { citySlug: 'tbilisi', placeIds: ['t2'] },
  ] }), fake);
  assert.ok(r.ok);
  return r.value;
};

test('the trip has the browser’s shape, and a re-send keeps createdAt and day ids', () => {
  const id = growthTripId('growth:x');
  const first = buildGrowthTrip(input(), id, 1000, null);
  assert.deepEqual(first.citySlugs, ['tbilisi', 'batumi']);
  assert.equal(first.createdAt, 1000);
  assert.equal(first.days[0].notes, 'בוקר');
  assert.equal('notes' in first.days[1], false);
  assert.equal(first.days[2].id, `${id}-d3`);

  const again = buildGrowthTrip(input(), id, 5000, first);
  assert.equal(again.createdAt, 1000);
  assert.equal(again.updatedAt, 5000);
  assert.deepEqual(again.days.map((d) => d.id), first.days.map((d) => d.id));
});

test('empty preferences and no date leave those fields off the trip', () => {
  const r = parseGrowthTrip(body({ preferences: {}, startDate: undefined }), fake);
  assert.ok(r.ok);
  const t = buildGrowthTrip(r.value, 'g-x', 1, null);
  assert.equal('preferences' in t, false);
  assert.equal('startDate' in t, false);
});

test('against the real catalog, every validated stop survives the public snapshot', () => {
  const d = destinations.find((x) => x.slug === 'tbilisi')!;
  const ids = d.places.slice(0, 3).map((p) => p.id);
  const r = parseGrowthTrip(body({ days: [{ citySlug: 'tbilisi', placeIds: ids }] }), catalogLookup());
  assert.ok(r.ok, JSON.stringify(r));
  const snap = toPublicSnapshot(buildGrowthTrip(r.value, 'g-x', 1, null), catalogLookup());
  assert.deepEqual(snap.days[0].placeIds, ids);
});

test('the daily cap matches the spec', () => {
  assert.equal(GROWTH_DAILY_MAX, 20);
});
