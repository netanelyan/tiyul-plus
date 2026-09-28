/**
 * The homepage sample trips.
 *
 * These render on the one screen every visitor loads, and the whole point is that a
 * tap produces a real itinerary rather than a mock-up - so the tests run against the
 * real catalog and assert that every sample actually builds something a person would
 * be pleased to see.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { SAMPLE_TRIPS, buildSampleTrip } from './sampleTrips.ts';
import { isKosher } from '@/lib/categories';

const citiesFor = (slugs: readonly string[]) =>
  slugs.map((s) => destinations.find((d) => d.slug === s)).filter((d) => Boolean(d)) as NonNullable<
    ReturnType<typeof destinations.find>
  >[];

test('every sample names cities that exist in the catalog', () => {
  /*
    The rule that changed what shipped: "Athens + Naxos" was asked for and Naxos is not
    curated, so the sample is Athens + Santorini instead. This is the test that would
    have caught it if it had shipped anyway.
  */
  for (const s of SAMPLE_TRIPS) {
    for (const slug of s.citySlugs) {
      assert.ok(
        destinations.some((d) => d.slug === slug),
        `sample "${s.key}" references ${slug}, which is not in the catalog`,
      );
    }
  }
});

test('every sample builds a real trip - right length, no empty day', () => {
  for (const s of SAMPLE_TRIPS) {
    const trip = buildSampleTrip(s, citiesFor(s.citySlugs));
    assert.ok(trip, `sample "${s.key}" built nothing`);
    assert.equal(trip.days.length, s.days, `"${s.key}" built ${trip.days.length} of ${s.days} days`);
    for (const [i, d] of trip.days.entries()) {
      assert.ok(
        d.placeIds.length > 0,
        `"${s.key}" day ${i + 1} is empty - an empty day on the hero demo reads as a broken product`,
      );
    }
  }
});

test('no sample has a thin day - the per-day floor, not the average', () => {
  /*
    The first version of this asserted an average of three stops a day and caught the
    multi-city sample at 2.9 - which was the right alarm for the wrong reason. The
    actual defect was one day with a SINGLE stop ([3,1,4,3,3,3,3] at a relaxed pace),
    and an average hides exactly that: a 7-stop day pays for a 1-stop day and the mean
    looks fine.

    So the floor is per day. Three stops is where a day looks like a plan on the map
    rather than a dot.
  */
  for (const s of SAMPLE_TRIPS) {
    const trip = buildSampleTrip(s, citiesFor(s.citySlugs))!;
    const perDay = trip.days.map((d) => d.placeIds.length);
    const thin = perDay.filter((n) => n < 3).length;
    assert.equal(
      thin,
      0,
      `"${s.key}" has ${thin} day(s) with fewer than 3 stops: ${JSON.stringify(perDay)}`,
    );
  }
});

test('the multi-city sample really spans more than one city', () => {
  /*
    Its entire purpose is showing that this product plans more than one city. A sample
    that silently collapsed to one would still look fine and prove nothing.
  */
  const multi = SAMPLE_TRIPS.find((s) => s.citySlugs.length > 1);
  assert.ok(multi, 'there is no multi-city sample');
  const trip = buildSampleTrip(multi, citiesFor(multi.citySlugs))!;
  const used = new Set(trip.days.map((d) => d.citySlug));
  assert.equal(
    used.size,
    multi.citySlugs.length,
    `the multi-city sample used ${used.size} of ${multi.citySlugs.length} cities`,
  );
});

test('**no sample opts a visitor into kashrut, and none contains a kosher stop**', () => {
  /*
    Hard rule: kashrut is a preference, never an assumption. A hero demo that arrived
    with kosher restaurants would be making a statement about the visitor that nobody
    asked for - and it is the most visible place on the site to make it.
  */
  for (const s of SAMPLE_TRIPS) {
    assert.notEqual(s.preferences?.kosher, true, `"${s.key}" presets kosher`);
    const trip = buildSampleTrip(s, citiesFor(s.citySlugs))!;
    const cities = citiesFor(s.citySlugs);
    for (const d of trip.days) {
      for (const id of d.placeIds) {
        const place = cities.flatMap((c) => c.places).find((p) => p.id === id);
        assert.ok(place, `${id} is not a real place`);
        assert.ok(!isKosher(place.category), `"${s.key}" contains kosher stop ${id}`);
      }
    }
  }
});

test('a sample whose city is missing returns null rather than a partial trip', () => {
  const s = SAMPLE_TRIPS.find((x) => x.citySlugs.length > 1)!;
  // Only the first city available - the builder must refuse, not build half of it.
  assert.equal(buildSampleTrip(s, citiesFor([s.citySlugs[0]])), null);
  assert.equal(buildSampleTrip(s, []), null);
});

test('the sample names carry the length, which is what the button promises', () => {
  for (const s of SAMPLE_TRIPS) {
    const trip = buildSampleTrip(s, citiesFor(s.citySlugs))!;
    assert.equal(trip.name, s.name, `"${s.key}" was renamed by the builder`);
    assert.match(
      s.name,
      new RegExp(String(s.days)),
      `"${s.key}" name does not state its length: ${s.name}`,
    );
  }
});

test('there are exactly three, and their keys are unique', () => {
  /*
    Three is a deliberate number - it is what fits one row on a phone without
    truncating a label, and the hero is not a catalog.
  */
  assert.equal(SAMPLE_TRIPS.length, 3);
  assert.equal(new Set(SAMPLE_TRIPS.map((s) => s.key)).size, 3);
});
