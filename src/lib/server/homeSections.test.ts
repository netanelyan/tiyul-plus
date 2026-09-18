/**
 * The homepage's numbers, checked against the catalog they claim to describe.
 *
 * The homepage says "33 places" on the Vienna tile and "81 places" on the
 * Italy tile. Both are counted, never typed - and this is what keeps it that
 * way: if a future edit replaces a count with a string, or a flagship slug is
 * renamed in the data and its tile quietly vanishes, the assertion here names
 * it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import {
  FLAGSHIP_SLUGS,
  HOME_COUNTRY_TILES,
  collectionTiles,
  flagshipCards,
  popularCountries,
} from './homeSections';
import { HUBS } from '@/lib/seo/hubs';

test('every flagship slug exists in the catalog, so no tile silently drops out', () => {
  const cards = flagshipCards();
  assert.equal(cards.length, FLAGSHIP_SLUGS.length);
  for (const slug of FLAGSHIP_SLUGS) {
    assert.ok(
      destinations.some((d) => d.slug === slug),
      `flagship "${slug}" is not in the catalog - renamed? The homepage tile would vanish`,
    );
  }
});

test('flagship counts are the catalog counts, and every flagship has a photo and a ready route', () => {
  for (const c of flagshipCards()) {
    const d = destinations.find((x) => x.slug === c.slug)!;
    assert.equal(c.places, d.places.length, `${c.slug}: places`);
    assert.equal(c.days, d.itinerary.length, `${c.slug}: days`);
    assert.equal(
      c.kosher,
      d.places.filter((p) => p.category.startsWith('kosher')).length,
      `${c.slug}: kosher`,
    );
    // A flagship tile without a photo is a purple rectangle on the most
    // visible band of the site; a flagship without a route is an empty promise.
    assert.ok(c.photo, `${c.slug} has no photo - it cannot be a flagship`);
    assert.ok(c.days >= 3, `${c.slug} has a ${c.days}-day route - too short to lead the page`);
    assert.ok(c.places >= 15, `${c.slug} has ${c.places} places - too thin to lead the page`);
  }
});

test('popular countries are ranked by what we actually have, and the counts add up', () => {
  const tiles = popularCountries();
  assert.equal(tiles.length, HOME_COUNTRY_TILES);
  for (let i = 1; i < tiles.length; i++) {
    assert.ok(tiles[i - 1].places >= tiles[i].places, 'not sorted by places desc');
  }
  for (const t of tiles) {
    const ds = destinations.filter((d) => d.countrySlug === t.slug);
    assert.equal(t.destinations, ds.length, `${t.slug}: destinations`);
    assert.equal(
      t.places,
      ds.reduce((n, d) => n + d.places.length, 0),
      `${t.slug}: places`,
    );
    assert.ok(t.flag, `${t.slug} has no flag`);
  }
});

test('collection tiles mirror the hubs and never show an empty collection', () => {
  const tiles = collectionTiles();
  assert.ok(tiles.length > 0);
  assert.ok(tiles.length <= HUBS.length);
  for (const t of tiles) {
    assert.ok(t.count > 0, `${t.slug} would render "0 destinations"`);
    assert.ok(HUBS.some((h) => h.slug === t.slug), `${t.slug} is not a hub`);
  }
});
