/**
 * The itinerary page set: what is honestly supportable, and what ships first.
 *
 * Run against the REAL catalog, not a fixture, because both claims this file makes
 * are claims about the live data: that no page promises more days than exist, and
 * that the first batch is the markets the rollout is for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import {
  ITINERARY_LENGTHS,
  ITINERARY_ROLLOUT_LIMIT,
  ROLLOUT_ORDER,
  allItineraryPages,
  isItineraryLength,
  rolledOutItineraryPages,
  toDestLike,
} from './itineraries.ts';

const input = destinations.map(toDestLike);
const bySlug = new Map(destinations.map((d) => [d.slug, d]));

test('no page ever promises more days than the catalog actually curates', () => {
  /*
    The hard-rule-2 claim of this whole page type. A "7 days in Lisbon" page for a
    city with three curated days would have to invent four, so it must not exist.
  */
  for (const p of allItineraryPages(input)) {
    const dest = bySlug.get(p.slug);
    assert.ok(dest, `${p.slug} is not in the catalog`);
    assert.ok(
      dest.itinerary.length >= p.days,
      `/itinerary/${p.slug}/${p.days} promises ${p.days} days but only ${dest.itinerary.length} are curated`,
    );
  }
});

test('every offered length is one of the declared lengths', () => {
  for (const p of allItineraryPages(input)) {
    assert.ok(isItineraryLength(p.days), `${p.days} is not a declared length`);
  }
});

test('the first batch is exactly the rollout limit, and every page is distinct', () => {
  const live = rolledOutItineraryPages(input);
  assert.equal(live.length, ITINERARY_ROLLOUT_LIMIT);
  const keys = live.map((p) => `${p.slug}/${p.days}`);
  assert.equal(new Set(keys).size, keys.length, 'a page is listed twice');
});

test('**the first batch is 30 DIFFERENT cities** - no near-duplicate pair in it', () => {
  /*
    The thin-content guard, and the reason the ordering was rewritten twice. Four
    lengths of one city are the most similar pages the set can produce, and a first
    submission made of those would ask Google to judge near-duplicates on a domain
    with no authority. One page per city removes the risk entirely.
  */
  const live = rolledOutItineraryPages(input);
  const cities = new Set(live.map((p) => p.slug));
  assert.equal(
    cities.size,
    live.length,
    `${live.length - cities.size} page(s) share a city with another page in the first batch`,
  );
});

test('the first batch stays inside the named markets, and covers all of them', () => {
  /*
    The rollout exists to test demand in the markets Israelis actually fly to. A batch
    that wandered into the alphabetical tail before covering Cyprus and Romania was the
    second rejected ordering - this asserts the outcome rather than the mechanism.
  */
  const live = rolledOutItineraryPages(input);
  const countriesCovered = new Set(live.map((p) => bySlug.get(p.slug)!.countrySlug));

  for (const c of countriesCovered) {
    assert.ok(ROLLOUT_ORDER.includes(c), `${c} is not a named rollout market but got a page`);
  }
  const missing = ROLLOUT_ORDER.filter((c) => !countriesCovered.has(c));
  assert.deepEqual(missing, [], `named markets with no page in the first batch: ${missing.join(', ')}`);
});

test('the rollout is stable - same input, same pages, same order', () => {
  /*
    The sitemap and content-dates both read this. An unstable order would re-date
    pages nothing changed on, which teaches a crawler to discount lastmod across the
    whole file.
  */
  const a = rolledOutItineraryPages(input).map((p) => `${p.slug}/${p.days}`);
  const b = rolledOutItineraryPages(input).map((p) => `${p.slug}/${p.days}`);
  assert.deepEqual(a, b);
});

test('raising the limit only ADDS pages - it never reorders the ones already live', () => {
  /*
    The rollout mechanism is "raise the number". If that reshuffled the existing set,
    every batch would change the URLs already submitted and indexed.
  */
  const first = rolledOutItineraryPages(input, 30).map((p) => `${p.slug}/${p.days}`);
  const second = rolledOutItineraryPages(input, 80).map((p) => `${p.slug}/${p.days}`);
  assert.equal(second.length, 80);
  assert.deepEqual(second.slice(0, 30), first, 'the first 30 moved when the limit was raised');
});

test('the limit cannot exceed what the catalog supports', () => {
  const all = allItineraryPages(input);
  const huge = rolledOutItineraryPages(input, all.length + 500);
  assert.equal(huge.length, all.length, 'the rollout invented pages beyond the supportable set');
});

test('toDestLike accepts both catalog shapes and agrees on the day count', () => {
  /*
    The page holds a full Destination and the sitemap holds a DestinationSummary. If
    these two disagreed, the submitted set and the built set would drift into 404s.
  */
  const dest = destinations[0];
  const fromFull = toDestLike(dest);
  const fromSummary = toDestLike({
    slug: dest.slug,
    countrySlug: dest.countrySlug,
    days: dest.itinerary.length,
  });
  assert.deepEqual(fromFull, fromSummary);
});

test('5 days is offered wherever it exists - it is the length people search', () => {
  /*
    Guards the LENGTH_ORDER choice: if 5 ever stopped being preferred, most of the
    batch would silently become 3-day pages and the most valuable query would be
    uncovered.
  */
  const live = rolledOutItineraryPages(input);
  for (const p of live) {
    const curated = bySlug.get(p.slug)!.itinerary.length;
    if (curated >= 5) {
      assert.equal(p.days, 5, `${p.slug} has ${curated} curated days but got a ${p.days}-day page`);
    }
  }
});

test('ITINERARY_LENGTHS is sorted and has no duplicates', () => {
  const arr = [...ITINERARY_LENGTHS];
  assert.deepEqual(arr, [...new Set(arr)].sort((a, b) => a - b));
});

/* ============================================================
 *  The conversion path: the page's button must produce exactly the itinerary
 *  the page showed. If these disagree, the visitor gets a different trip from
 *  the one they read, which is worse than no button at all.
 * ============================================================ */

test('tripFromTemplate with a length produces exactly the days the page renders', async () => {
  const { tripFromTemplate } = await import('@/lib/trip/generate');
  const { itineraryDays } = await import('./guide.ts');

  for (const p of rolledOutItineraryPages(input)) {
    const dest = bySlug.get(p.slug)!;
    const trip = tripFromTemplate(dest, { days: p.days });
    assert.equal(trip.days.length, p.days, `${p.slug}/${p.days}: built ${trip.days.length} days`);

    /*
      And the same days, in the same order, with the same stops - not merely the same
      count. The page shows the first n of the curated route; the button must build
      that, not a re-derivation.
      Kosher stops are filtered out of a template unless kashrut was chosen, so the
      comparison drops them from the expected side too.
    */
    const { isKosher } = await import('@/lib/categories');
    const byId = new Map(dest.places.map((x) => [x.id, x]));
    const expected = itineraryDays(dest)
      .slice(0, p.days)
      .map((d) => d.places.filter((x) => !isKosher(x.category)).map((x) => x.id));
    const built = trip.days.map((d) => d.placeIds.filter((id) => !isKosher(byId.get(id)!.category)));
    assert.deepEqual(built, expected, `${p.slug}/${p.days}: the built stops differ from the page`);
  }
});

test('a length beyond the curated route is clamped, never padded with empty days', async () => {
  const { tripFromTemplate } = await import('@/lib/trip/generate');
  const dest = bySlug.get('lisbon')!; // 3 curated days
  const trip = tripFromTemplate(dest, { days: 9 });
  assert.equal(trip.days.length, dest.itinerary.length);
  /*
    An empty day renders as a broken plan on the map whatever the note says - the same
    rule the agent follows. So clamping, not padding.
  */
  assert.ok(
    trip.days.every((d) => d.placeIds.length > 0),
    'a day with zero stops reached the trip',
  );
});

test('no length means the whole route - the planner templates must be unchanged', async () => {
  const { tripFromTemplate } = await import('@/lib/trip/generate');
  const dest = bySlug.get('rome')!;
  assert.equal(tripFromTemplate(dest).days.length, dest.itinerary.length);
});
