/**
 * The guide's data rules, asserted against the real catalog.
 *
 * What these are actually protecting: a page that claims something the catalog
 * does not support. Every guard here corresponds to a section that would
 * otherwise render a heading with nothing useful under it, or - worse - a
 * heading that promises a category of information we do not have.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { SEO_DESTINATION_SLUGS } from './selection';
import {
  GUIDE_CATEGORY_ORDER,
  MIN_FAMILY_PLACES,
  calendarForDestination,
  familyPlaces,
  guideGroups,
  itineraryDays,
  kosherPlaces,
  plannerHref,
  plannerQuery,
} from './guide';

const promoted = SEO_DESTINATION_SLUGS.map(
  (slug) => destinations.find((d) => d.slug === slug)!,
);

describe('guideGroups', () => {
  it('never puts a kosher place in the general "what to do" list', () => {
    // Kosher places have their own section. Leaking one into the sights list
    // would present it as an ordinary recommendation, stripped of the
    // supervision badge that must always travel with it.
    for (const d of promoted) {
      const leaked = guideGroups(d)
        .flatMap((g) => g.places)
        .filter((p) => p.category.startsWith('kosher'));
      assert.deepEqual(leaked, [], `${d.slug}: kosher place in the sights list`);
    }
  });

  it('drops empty categories rather than rendering an empty heading', () => {
    for (const d of promoted) {
      for (const g of guideGroups(d)) {
        assert.ok(g.places.length > 0, `${d.slug}: empty group ${g.category}`);
      }
    }
  });

  it('floats mustSee places to the top of their group', () => {
    for (const d of promoted) {
      for (const g of guideGroups(d)) {
        const flags = g.places.map((p) => Number(Boolean(p.mustSee)));
        const sorted = [...flags].sort((a, b) => b - a);
        assert.deepEqual(flags, sorted, `${d.slug}/${g.category}: mustSee not first`);
      }
    }
  });

  it('accounts for every non-kosher place in the catalog entry', () => {
    // If a category were missing from GUIDE_CATEGORY_ORDER its places would
    // vanish from the page silently - the page would still build and still look
    // fine. This is the check that catches a new PlaceCategory being added.
    for (const d of promoted) {
      const shown = guideGroups(d).reduce((n, g) => n + g.places.length, 0);
      const expected = d.places.filter((p) => !p.category.startsWith('kosher')).length;
      assert.equal(shown, expected, `${d.slug}: ${expected - shown} places not rendered`);
    }
  });

  it('has no duplicate category in the order', () => {
    assert.equal(new Set(GUIDE_CATEGORY_ORDER).size, GUIDE_CATEGORY_ORDER.length);
  });
});

describe('itineraryDays', () => {
  it('resolves every itinerary id to a real place on the promoted pages', () => {
    for (const d of promoted) {
      const declared = d.itinerary.reduce((n, day) => n + day.placeIds.length, 0);
      const resolved = itineraryDays(d).reduce((n, day) => n + day.places.length, 0);
      assert.equal(resolved, declared, `${d.slug}: ${declared - resolved} dangling place ids`);
    }
  });

  it('keeps the days in order', () => {
    for (const d of promoted) {
      const nums = itineraryDays(d).map((x) => x.day);
      assert.deepEqual(nums, [...nums].sort((a, b) => a - b), `${d.slug}: days out of order`);
    }
  });
});

describe('familyPlaces', () => {
  it('returns only places actually tagged for families', () => {
    for (const d of promoted) {
      for (const p of familyPlaces(d)) {
        assert.ok(p.tags?.includes('families'), `${d.slug}/${p.id}: not tagged families`);
      }
    }
  });

  it('leaves the section off where the catalog has too little to say', () => {
    // 9 of the 30 have 0-2 tagged places. The correct outcome is no heading at
    // all - a "family trip to X" section backed by one place is worse than
    // silence. This asserts the threshold is real rather than aspirational.
    const thin = promoted.filter((d) => familyPlaces(d).length < MIN_FAMILY_PLACES);
    assert.ok(thin.length > 0, 'expected some destinations below the family threshold');
    for (const d of thin) {
      assert.ok(familyPlaces(d).length < MIN_FAMILY_PLACES, `${d.slug}`);
    }
  });
});

describe('calendarForDestination', () => {
  it('only returns entries for this destination or its whole country', () => {
    for (const d of promoted) {
      for (const e of calendarForDestination(d)) {
        assert.equal(e.countrySlug, d.countrySlug, `${d.slug}: entry from another country`);
        if (e.destinationSlugs?.length) {
          assert.ok(
            e.destinationSlugs.includes(d.slug),
            `${d.slug}: entry scoped to other cities (${e.id})`,
          );
        }
      }
    }
  });

  it('puts confirmed-date entries before word-only windows', () => {
    for (const d of promoted) {
      const flags = calendarForDestination(d).map((e) => Number(e.datesConfirmed));
      assert.deepEqual(flags, [...flags].sort((a, b) => b - a), `${d.slug}`);
    }
  });

  it('an unconfirmed entry carries a window in words and no dates', () => {
    // The page prints `window` verbatim for these. If an unconfirmed entry ever
    // arrives carrying dates, the page would be showing a date nobody published.
    for (const d of promoted) {
      for (const e of calendarForDestination(d)) {
        if (!e.datesConfirmed) {
          assert.ok(e.window?.trim(), `${e.id}: unconfirmed with no window to print`);
          assert.ok(!e.dates?.length, `${e.id}: unconfirmed but carries dates`);
        }
      }
    }
  });

  it('respects the cap', () => {
    for (const d of promoted) {
      assert.ok(calendarForDestination(d, 3).length <= 3, `${d.slug}`);
    }
  });
});

describe('kosherPlaces', () => {
  it('returns only kosher-category places', () => {
    for (const d of promoted) {
      for (const p of kosherPlaces(d)) {
        assert.ok(p.category.startsWith('kosher'), `${d.slug}/${p.id}`);
      }
    }
  });
});

describe('plannerQuery', () => {
  it('doubles a word-initial vav after the prefix', () => {
    // The documented Hebrew trap: a one-letter prefix before a word-initial vav
    // doubles it. Vienna, Venice and Warsaw are all in the promoted set, and
    // naive concatenation would render the wrong spelling on their pages.
    const vienna = destinations.find((d) => d.slug === 'vienna')!;
    assert.ok(plannerQuery(vienna).includes('בווינה'), 'vav not doubled');
    assert.ok(!plannerQuery(vienna).includes('בוינה'), 'wrong spelling present');
  });

  it('leaves a name that does not start with vav alone', () => {
    const rome = destinations.find((d) => d.slug === 'rome')!;
    assert.ok(plannerQuery(rome).includes('ברומא'));
  });

  it('always states a day count, because the agent refuses to build without one', () => {
    for (const d of promoted) {
      const q = plannerQuery(d);
      assert.ok(/\d+/.test(q), `${d.slug}: no day count in "${q}"`);
      assert.ok(q.includes(d.name), `${d.slug}: query does not name the destination`);
    }
  });

  it('produces an encoded /chat link', () => {
    for (const d of promoted) {
      const href = plannerHref(d);
      assert.ok(href.startsWith('/chat?q='), `${d.slug}: ${href}`);
      // A raw space or Hebrew character in an href is a broken link in some
      // clients; the whole query must survive a round trip.
      assert.ok(!/[ ֐-׿]/.test(href), `${d.slug}: unencoded href`);
      assert.equal(decodeURIComponent(href.slice('/chat?q='.length)), plannerQuery(d));
    }
  });
});
