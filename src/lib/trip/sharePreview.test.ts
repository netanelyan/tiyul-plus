/**
 * The link preview for a shared trip, and the attribution that rides with it.
 *
 * The property this file exists for is the first test: **the owner's trip name
 * must not appear in the preview.** A shared link is handed to people the owner
 * chose, but its WhatsApp card travels onward into groups they did not, and the
 * name is free text - a surname, a family's private shorthand, an inside joke.
 * Every other assertion here is about the preview reading well; that one is
 * about it not saying something it was never given permission to say.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import type { SharedTrip } from './share.ts';
import { sharePreview } from './sharePreview.ts';
import { daysHe } from '@/lib/duration';

/** A catalog city with enough places to build a believable trip out of. */
const cityWith = (minPlaces: number) =>
  destinations.find((d) => d.places.length >= minPlaces)!;

const tripOf = (slugs: string[], perDay = 2, name = 'הטיול של משפחת לוי'): SharedTrip => ({
  name,
  days: slugs.map((slug) => ({
    citySlug: slug,
    placeIds: destinations.find((d) => d.slug === slug)!.places.slice(0, perDay).map((p) => p.id),
  })),
});

test('the preview never carries the trip name', () => {
  const city = cityWith(3);
  const secret = 'הטיול הסודי של משפחת כהן';
  const p = sharePreview(tripOf([city.slug], 3, secret));
  assert.ok(!p.title.includes(secret), 'the og:title quoted the owner trip name');
  assert.ok(!p.description.includes(secret), 'the og:description quoted the owner trip name');
  assert.ok(!p.title.includes('כהן'), 'a surname from the trip name reached the title');
});

test('the title is "<days> in <city> - a ready route with a map"', () => {
  const city = cityWith(3);
  const p = sharePreview(tripOf([city.slug, city.slug, city.slug]));
  assert.ok(p.title.startsWith(daysHe(3)), `title did not lead with the day count: ${p.title}`);
  assert.ok(p.title.includes(city.name), `title did not name the city: ${p.title}`);
  assert.ok(p.title.endsWith('מסלול מוכן עם מפה'), `title tail changed: ${p.title}`);
  assert.equal(p.dayCount, 3);
});

test('one day and two days read as Hebrew, not as "1 ימים"', () => {
  const city = cityWith(3);
  assert.ok(sharePreview(tripOf([city.slug])).title.startsWith('יום אחד'));
  assert.ok(sharePreview(tripOf([city.slug, city.slug])).title.startsWith('יומיים'));
});

test('the city label: one named, the rest counted', () => {
  const [a, b, c] = destinations.filter((d) => d.places.length >= 2).slice(0, 3);
  assert.equal(sharePreview(tripOf([a.slug])).cityLabel, a.name);
  assert.equal(sharePreview(tripOf([a.slug, b.slug])).cityLabel, `${a.name} ועוד עיר אחת`);
  assert.equal(sharePreview(tripOf([a.slug, b.slug, c.slug])).cityLabel, `${a.name} ועוד 2 ערים`);
});

test('a second vav-initial city is never spelled with a run of vavs', () => {
  /*
    The regression this pins. The label was first built as "<a> and <b>", and
    the conjunction is a one-letter prefix: run it through hePrefix and Venice
    comes out with three consecutive vavs, glue it on by hand and the repo-wide
    prefix guard rejects the line. The label counts instead of conjoining, so
    neither can happen - asserted here on the real catalog rather than trusted.
  */
  const plain = destinations.find((d) => !d.name.startsWith('ו') && d.places.length >= 2)!;
  const vav = destinations.find((d) => d.name.startsWith('ו') && !d.name.startsWith('וו') && d.places.length >= 2);
  assert.ok(vav, 'no vav-initial city in the catalog - this test stopped testing anything');
  const p = sharePreview(tripOf([plain.slug, vav.slug]));
  assert.ok(!/ווו/.test(p.cityLabel), `a run of three vavs reached the label: ${p.cityLabel}`);
  assert.ok(!/ווו/.test(p.title), `a run of three vavs reached the title: ${p.title}`);
});

test('a city opening with vav doubles it after the prefix', () => {
  /*
    The bug `hePrefix` exists for, asserted here because the title is now one of
    the places that builds the construction. Vienna is a flagship city, so this
    is the common path, not a corner.
  */
  const vav = destinations.find((d) => d.name.startsWith('ו') && !d.name.startsWith('וו') && d.places.length >= 2);
  // Asserted rather than skipped: the catalog holds five of these (Vienna,
  // Venice, Warsaw, Vilnius...). A `return` here would turn the day somebody
  // removes the last one into a test that passes without checking anything.
  assert.ok(vav, 'no vav-initial city in the catalog - this test stopped testing anything');
  const p = sharePreview(tripOf([vav.slug]));
  assert.ok(p.title.includes(`בו${vav.name}`), `expected the vav to double: ${p.title}`);
});

test('the description counts the stops and names real places', () => {
  const city = cityWith(4);
  const p = sharePreview(tripOf([city.slug], 4));
  assert.equal(p.stopCount, 4);
  assert.ok(p.description.includes('4 עצירות'), p.description);
  assert.ok(p.topPlaces.length > 0 && p.topPlaces.length <= 3, 'between one and three places');
  for (const name of p.topPlaces) {
    assert.ok(
      city.places.some((pl) => pl.name === name),
      `"${name}" is not a place in ${city.name} - the preview invented it`,
    );
  }
});

test('mustSee places are named before the rest', () => {
  // A city whose first place is not mustSee but which has one later on.
  const city = destinations.find(
    (d) => d.places.length >= 4 && !d.places[0].mustSee && d.places.slice(1, 4).some((p) => p.mustSee),
  );
  // Twelve cities have this shape today; same reasoning as the vav test above.
  assert.ok(city, 'no city with a later must-see - this test stopped testing anything');
  const p = sharePreview(tripOf([city.slug], 4));
  const firstMust = city.places.slice(0, 4).find((pl) => pl.mustSee)!;
  assert.equal(p.topPlaces[0], firstMust.name, 'the must-see stop was not promoted');
});

test('a trip with no stops still produces a usable preview, not a broken sentence', () => {
  const city = cityWith(1);
  const p = sharePreview({ name: 'ריק', days: [{ citySlug: city.slug, placeIds: [] }] });
  assert.equal(p.stopCount, 0);
  assert.deepEqual(p.topPlaces, []);
  assert.ok(p.title.includes(city.name));
  assert.ok(!p.description.includes('0 עצירות'), 'said "0 stops" instead of saying less');
});

test('an unknown city slug is dropped rather than printed as a slug', () => {
  const p = sharePreview({ name: 'x', days: [{ citySlug: 'no-such-city-slug', placeIds: ['nope'] }] });
  assert.equal(p.cityLabel, '');
  assert.ok(!p.title.includes('no-such-city-slug'), p.title);
  assert.deepEqual(p.topPlaces, []);
});
