/**
 * The counts `serializeTripForModel` hands the model about the traveller's own
 * trip.
 *
 * ## Why this exists
 *
 * Asked "how many stops are there in total?" about a real 14-stop trip, the agent
 * answered **"15 stops: 4 in day 1, 4 in day 2, 3 in day 3 and 4 in day 4"** -
 * internally consistent, stated without hedging, and wrong. Measured live on the
 * strong model, not the cheap one, which matters: the session log had recorded this
 * failure once before and concluded "questions stay on the strong model". Routing
 * was never the fix.
 *
 * The cause was that CURRENT TRIP carried a `places` array per day and no counts at
 * all, so the model had to count arrays. The fix is the one this codebase has now
 * reached three times - `pinDistances` for distances, the grounding index's
 * `coverage` for catalog size, and this for trip size: **hand over the computed
 * number instead of asking the model not to get it wrong.**
 *
 * A wrong number about the traveller's OWN trip is the worst class of all, because
 * it is the one fact they can check in two seconds by looking at the screen beside
 * the conversation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeTripForModel } from './agent.ts';
import type { Trip } from './types.ts';

/** A trip whose days deliberately have UNEQUAL stop counts (4/4/3/4 = 15). */
function trip(dayStops: number[]): Trip {
  return {
    id: 't1',
    name: 'וינה - 4 ימים',
    citySlugs: ['vienna'],
    createdAt: 0,
    updatedAt: 0,
    days: dayStops.map((n, i) => ({
      id: `d${i}`,
      citySlug: 'vienna',
      // Real ids are not needed - the count is what is under test, and
      // placeName() degrades to the id for an unknown one.
      placeIds: Array.from({ length: n }, (_, k) => `vie-p${i}-${k}`),
    })),
  } as unknown as Trip;
}

const parsed = (t: Trip | null) => JSON.parse(serializeTripForModel(t));

test('the total is handed over, not left to be derived', () => {
  const out = parsed(trip([4, 4, 3, 4]));
  assert.equal(out.totalStops, 15);
  assert.equal(out.totalDays, 4);
});

test('every day carries its own stop count', () => {
  /*
    The total alone would not have been enough: the wrong answer came WITH a
    per-day breakdown, so a model handed only a sum still has to split it.
  */
  const out = parsed(trip([4, 4, 3, 4]));
  assert.deepEqual(
    out.days.map((d: { stops: number }) => d.stops),
    [4, 4, 3, 4],
  );
});

test('the per-day counts always sum to the total', () => {
  /*
    The property that actually matters. Two numbers that can disagree are worse
    than one number, because the model would then have a choice of which to trust
    and no way to tell which is right.
  */
  for (const shape of [[4, 4, 3, 4], [1], [], [0, 0], [9, 1, 7, 2, 6, 3]]) {
    const out = parsed(trip(shape));
    const sum = out.days.reduce((n: number, d: { stops: number }) => n + d.stops, 0);
    assert.equal(sum, out.totalStops, `shape ${JSON.stringify(shape)}`);
    assert.equal(out.days.length, out.totalDays);
  }
});

test('an empty day reports zero rather than being omitted', () => {
  /*
    A day with no stops is a real state the product creates (add_day before
    set_day_places), and omitting its count would make the days array and the
    day numbering disagree - which is how a model ends up describing day 3 as
    day 2.
  */
  const out = parsed(trip([2, 0, 1]));
  assert.deepEqual(
    out.days.map((d: { stops: number }) => d.stops),
    [2, 0, 1],
  );
  assert.equal(out.totalStops, 3);
});

test('the counts describe the stops, not the unique places', () => {
  /*
    Deliberate: if the same place somehow appears twice, the honest answer to
    "how many stops" is what the itinerary shows, which is what the traveller
    counts on screen. Asserted so a future "dedupe for tidiness" is a decision
    rather than a silent change of meaning.
  */
  const t = trip([0]);
  t.days[0].placeIds = ['vie-a', 'vie-a', 'vie-b'];
  const out = parsed(t);
  assert.equal(out.totalStops, 3);
  assert.equal(out.days[0].stops, 3);
});

test('no trip at all still returns the honest sentinel, not a zeroed object', () => {
  const s = serializeTripForModel(null);
  assert.match(s, /אין טיול פעיל/);
  assert.doesNotMatch(s, /totalStops/, 'there is no trip to count - do not imply one exists');
});
