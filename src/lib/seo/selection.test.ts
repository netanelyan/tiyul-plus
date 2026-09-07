/**
 * The promoted destinations must stay worth promoting.
 *
 * `SEO_DESTINATION_SLUGS` is a pinned list, chosen once by a data-completeness
 * score. The catalog underneath it is edited constantly by data sessions. So the
 * risk this guards is not "someone picked a bad city" - it is that a city picked
 * when it was rich is later restructured, and a page we are actively asking
 * Google to index quietly becomes thin. Nothing else would catch that: the page
 * would still build and still render.
 *
 * The floors below are the ones recorded in SEO_PLAN.md as the criteria for
 * inclusion. They are asserted against the real catalog, not a fixture, because
 * what is being tested is the data.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { SEO_DESTINATION_SLUGS, isSeoDestination, seoCountrySlugs } from './selection';
import { metaDescription } from './site';

const MIN_PLACES = 13;
const MIN_ITINERARY_DAYS = 3;

describe('SEO destination selection', () => {
  it('every promoted slug exists in the catalog', () => {
    const known = new Set(destinations.map((d) => d.slug));
    const missing = SEO_DESTINATION_SLUGS.filter((s) => !known.has(s));
    assert.deepEqual(missing, [], `promoted slugs not in the catalog: ${missing.join(', ')}`);
  });

  it('has no duplicates', () => {
    assert.equal(new Set(SEO_DESTINATION_SLUGS).size, SEO_DESTINATION_SLUGS.length);
  });

  it('every promoted destination clears the depth floors', () => {
    for (const slug of SEO_DESTINATION_SLUGS) {
      const d = destinations.find((x) => x.slug === slug);
      assert.ok(d, `${slug}: missing`);
      assert.ok(
        d.places.length >= MIN_PLACES,
        `${slug}: ${d.places.length} places, floor is ${MIN_PLACES}`,
      );
      assert.ok(
        d.itinerary.length >= MIN_ITINERARY_DAYS,
        `${slug}: ${d.itinerary.length} itinerary days, floor is ${MIN_ITINERARY_DAYS}`,
      );
    }
  });

  it('every promoted destination has the fields its page sections read', () => {
    for (const slug of SEO_DESTINATION_SLUGS) {
      const d = destinations.find((x) => x.slug === slug)!;
      // A section whose source is empty does not render, so an empty field here
      // means a page section silently disappearing rather than a crash.
      assert.ok(d.summary?.trim(), `${slug}: no summary`);
      assert.ok(d.tagline?.trim(), `${slug}: no tagline`);
      assert.ok(d.bestSeason?.trim(), `${slug}: no bestSeason - "when to go" would not render`);
      assert.ok(d.practical?.flights?.trim(), `${slug}: no practical.flights`);
      assert.ok(d.practical?.gettingAround?.trim(), `${slug}: no practical.gettingAround`);
      assert.ok(
        d.practical?.kosherOverview?.trim(),
        `${slug}: no practical.kosherOverview - the kosher section would not render`,
      );
      assert.ok(d.editorialRating?.verdict?.trim(), `${slug}: no editorialRating verdict`);
      assert.ok(d.iconicLandmark?.name?.trim(), `${slug}: no iconicLandmark`);
    }
  });

  it('every place on a promoted page has the description the page renders', () => {
    for (const slug of SEO_DESTINATION_SLUGS) {
      const d = destinations.find((x) => x.slug === slug)!;
      const blank = d.places.filter((p) => !p.description?.trim()).map((p) => p.id);
      assert.deepEqual(blank, [], `${slug}: places with no description: ${blank.join(', ')}`);
    }
  });

  it('resolves the promoted countries, and all of them exist', () => {
    const slugs = seoCountrySlugs(destinations);
    const known = new Set(countries.map((c) => c.slug));
    const missing = slugs.filter((s) => !known.has(s));
    assert.deepEqual(missing, [], `country slugs not in the catalog: ${missing.join(', ')}`);
    // A promoted set spread across many countries is deliberate - see
    // SEO_PLAN.md. If this collapses toward one country the set has become a
    // list of one country's cities, which reads very differently to a crawler.
    assert.ok(slugs.length >= 15, `only ${slugs.length} countries represented`);
  });

  it('isSeoDestination promotes exactly the pinned set', () => {
    assert.ok(isSeoDestination('vienna'));
    assert.ok(!isSeoDestination('amsterdam'));
    // A slug that does not exist at all must not be promoted.
    assert.ok(!isSeoDestination('atlantis'));
  });
});

describe('metaDescription', () => {
  it('separates the parts so a fragment does not run into the next sentence', () => {
    assert.equal(metaDescription('אחת', undefined, '  שתיים\n שלוש '), 'אחת · שתיים שלוש');
  });

  it('does not add a separator after a part that already ends in punctuation', () => {
    assert.equal(metaDescription('משפט שלם.', 'ההמשך'), 'משפט שלם. ההמשך');
  });

  it('skips empty and missing parts rather than leaving a leading separator', () => {
    assert.equal(metaDescription('', null, 'טקסט'), 'טקסט');
  });

  it('leaves a short description untouched, with no ellipsis', () => {
    const short = 'תיאור קצר של יעד';
    assert.equal(metaDescription(short), short);
  });

  it('truncates a long one on a word boundary', () => {
    const long = 'מילה '.repeat(80);
    const out = metaDescription(long);
    assert.ok(out.length <= 159, `too long: ${out.length}`);
    assert.ok(out.endsWith('...'));
    // The point of the word boundary is that the last word is whole.
    assert.ok(!out.includes('מיל...'), 'cut mid-word');
  });

  it('does not leave a dangling comma before the ellipsis', () => {
    const text = `${'א'.repeat(150)}, ${'ב'.repeat(50)}`;
    assert.ok(!metaDescription(text).includes(',...'));
  });

  it('produces a real, non-empty description for every promoted destination', () => {
    for (const slug of SEO_DESTINATION_SLUGS) {
      const d = destinations.find((x) => x.slug === slug)!;
      const out = metaDescription(d.tagline, d.summary);
      assert.ok(out.length >= 60, `${slug}: description only ${out.length} chars`);
      assert.ok(out.length <= 159, `${slug}: description ${out.length} chars`);
    }
  });

  it('gives every catalog destination a description distinct from every other', () => {
    // The defect being fixed was 166 identical descriptions. Uniqueness is the
    // property that actually matters, so it is asserted directly.
    const seen = new Map<string, string>();
    for (const d of destinations) {
      const out = metaDescription(d.tagline, d.summary);
      const clash = seen.get(out);
      assert.equal(clash, undefined, `${d.slug} and ${clash} share a meta description`);
      seen.set(out, d.slug);
    }
  });
});
