/**
 * Tests for the reverse guard: a traveller who set "kosher" is not handed a non-kosher eating place.
 *
 * The background, and this is not a bug born with this feature. Until now all the food
 * in the catalog was in `kosher-*` categories, so `filterKosherUnlessOptedIn` could get
 * away with half the job: filter kashrut out for those who did not ask, and
 * `return { ids }` immediately once the preference was set. But even then the catalog
 * held four non-kosher food records in the `cafe` category - and a traveller who ticked
 * "kosher" could get them into their day with no barrier at all. Adding non-kosher
 * restaurants only widened that gap.
 *
 * Hence the rule here: **'unknown' is blocked exactly like 'not-kosher'.** "We do not
 * know" is not "probably fine". That is the only decision available when somebody is
 * trusting us on kashrut.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { isEating, kosherStatusOf } from '@/lib/categories';
import { executeAgentTool } from './agent.ts';
import { tripFromTemplate } from './generate.ts';
import type { Trip } from './types';

const vienna = destinations.find((d) => d.slug === 'vienna')!;

/** Real non-kosher eating places from the catalog, not a fixture. */
const nonKosherEating = vienna.places
  .filter((p) => isEating(p.category) && kosherStatusOf(p) !== 'kosher')
  .map((p) => p.id);
const kosherEating = vienna.places
  .filter((p) => p.category === 'kosher-food')
  .map((p) => p.id);

test('the fixture is real: Vienna genuinely has both kinds of eating place', () => {
  assert.ok(nonKosherEating.length >= 3, `expected non-kosher eating places, got ${nonKosherEating.length}`);
  assert.ok(kosherEating.length >= 1, `expected kosher eating places, got ${kosherEating.length}`);
});

test('every eating place in the whole catalog states its kashrut - none is blank', () => {
  const blank: string[] = [];
  for (const d of destinations)
    for (const p of d.places)
      if (isEating(p.category) && !p.category.startsWith('kosher') && !p.kosherStatus)
        blank.push(`${d.slug}/${p.id}`);
  assert.deepEqual(blank, [], `these eating places carry no kosherStatus: ${blank.join(', ')}`);
});

const kosherTrip = (): Trip => ({
  id: 't1',
  name: 'וינה',
  citySlugs: ['vienna'],
  days: [],
  createdAt: 0,
  preferences: { kosher: true },
});

test('create_trip_full: a kosher traveller does not receive a non-kosher restaurant', () => {
  const res = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    {
      name: 'וינה',
      dayPlans: [{ citySlug: 'vienna', placeIds: [...nonKosherEating, 'vie-stephansdom'] }],
    },
  );
  assert.equal(res.ok, true);
  const placed = res.trip!.days.flatMap((d) => d.placeIds);
  for (const id of nonKosherEating) assert.ok(!placed.includes(id), `${id} reached a kosher trip`);
  // Anything that is not food stays - the filter is on eating, not on the city
  assert.ok(placed.includes('vie-stephansdom'));
  // And the model gets an explanation, otherwise it will try to schedule them again next turn
  assert.match(res.message, /שומר כשרות/);
});

test('create_trip_full: kosher places DO reach a kosher traveller', () => {
  const res = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    { name: 'וינה', dayPlans: [{ citySlug: 'vienna', placeIds: kosherEating }] },
  );
  assert.equal(res.ok, true);
  assert.deepEqual(res.trip!.days[0].placeIds, kosherEating);
});

test('the old direction still holds: no preference means no kosher places pushed', () => {
  const res = executeAgentTool(
    null,
    'create_trip_full',
    { name: 'וינה', dayPlans: [{ citySlug: 'vienna', placeIds: [...kosherEating, 'vie-stephansdom'] }] },
  );
  assert.equal(res.ok, true);
  const placed = res.trip!.days.flatMap((d) => d.placeIds);
  for (const id of kosherEating) assert.ok(!placed.includes(id));
  assert.match(res.message, /העדפת כשרות לא נבחרה/);
});

test('the two explanations are not interchangeable', () => {
  const optedIn = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    { name: 'x', dayPlans: [{ citySlug: 'vienna', placeIds: nonKosherEating }] },
  );
  const notOptedIn = executeAgentTool(
    null,
    'create_trip_full',
    { name: 'x', dayPlans: [{ citySlug: 'vienna', placeIds: kosherEating }] },
  );
  // This is about the opening sentence, not any occurrence of the phrase: the
  // "kashrut was not selected" message ends with a clause about the user saying
  // explicitly that they keep kosher, so a naive search for that phrase finds it -
  // and that is exactly what this test caught in its first version.
  assert.ok(optedIn.message.includes('הורדו מקומות אכילה שאינם כשרים'));
  assert.ok(!optedIn.message.includes('לא שובצו מקומות כשרים'));
  assert.ok(notOptedIn.message.includes('לא שובצו מקומות כשרים'));
  assert.ok(!notOptedIn.message.includes('הורדו מקומות אכילה שאינם כשרים'));
});

test('tripFromTemplate: the curated itinerary loses only its non-kosher eating stops', () => {
  const trip = tripFromTemplate(vienna, { kosher: true });
  const placed = trip.days.flatMap((d) => d.placeIds);
  for (const id of nonKosherEating) assert.ok(!placed.includes(id), `${id} survived into a kosher template`);
  // And we did not make the pattern empty - that was the bad "fix"
  assert.ok(placed.length > 5, `template collapsed to ${placed.length} stops`);
});

test('add_place stays exempt: naming a place is itself an explicit request', () => {
  const base = executeAgentTool(
    kosherTrip(),
    'create_trip_full',
    { name: 'וינה', dayPlans: [{ citySlug: 'vienna', placeIds: ['vie-stephansdom'] }] },
  );
  const res = executeAgentTool(base.trip, 'add_place', { dayNumber: 1, placeId: nonKosherEating[0] });
  assert.equal(res.ok, true);
  assert.ok(res.trip!.days[0].placeIds.includes(nonKosherEating[0]));
});
