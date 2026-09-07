/**
 * Structured data has to keep describing the page.
 *
 * The failure mode worth guarding is not invalid JSON - a build would still
 * emit that happily and a crawler would simply ignore it. It is markup that is
 * *valid and wrong*: a rating we are not entitled to, an FAQ answer no reader
 * can see, a breadcrumb with a gap in it. All three are silent.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { SEO_DESTINATION_SLUGS } from './selection';
import {
  breadcrumbLd,
  collectionLd,
  countryLd,
  faqLd,
  faqPairs,
  touristDestinationLd,
} from './jsonLd';

const pairs = SEO_DESTINATION_SLUGS.map((slug) => {
  const dest = destinations.find((d) => d.slug === slug)!;
  const country = countries.find((c) => c.slug === dest.countrySlug)!;
  return { dest, country };
});

describe('breadcrumbLd', () => {
  it('numbers positions from 1 with no gaps', () => {
    const ld = breadcrumbLd([
      { name: 'א', path: '/' },
      { name: 'ב', path: '/countries' },
      { name: 'ג', path: '/countries/austria' },
    ]) as { itemListElement: { position: number; item: string }[] };
    assert.deepEqual(
      ld.itemListElement.map((i) => i.position),
      [1, 2, 3],
    );
  });

  it('emits absolute urls, since a relative item is invalid', () => {
    const ld = breadcrumbLd([{ name: 'א', path: '/' }]) as {
      itemListElement: { item: string }[];
    };
    assert.ok(ld.itemListElement[0].item.startsWith('https://'), ld.itemListElement[0].item);
  });
});

describe('touristDestinationLd', () => {
  it('never carries aggregateRating', () => {
    // The catalog's editorialRating is a team score, and the page says so in as
    // many words. Marking it up as an aggregate rating would contradict the
    // disclaimer printed beside it, in a form only machines read.
    for (const { dest, country } of pairs) {
      const ld = touristDestinationLd(dest, country);
      assert.ok(!('aggregateRating' in ld), `${dest.slug}: aggregateRating present`);
      assert.ok(!('review' in ld), `${dest.slug}: review present`);
    }
  });

  it('carries the real coordinates, not a placeholder', () => {
    for (const { dest, country } of pairs) {
      const ld = touristDestinationLd(dest, country) as {
        geo: { latitude: number; longitude: number };
      };
      assert.equal(ld.geo.latitude, dest.center.lat);
      assert.equal(ld.geo.longitude, dest.center.lng);
      assert.ok(Number.isFinite(ld.geo.latitude) && ld.geo.latitude !== 0, dest.slug);
    }
  });

  it('caps attractions and puts mustSee first', () => {
    for (const { dest, country } of pairs) {
      const ld = touristDestinationLd(dest, country, { maxAttractions: 5 }) as {
        includesAttraction: { name: string }[];
      };
      assert.ok(ld.includesAttraction.length <= 5, dest.slug);
      const names = new Set(ld.includesAttraction.map((a) => a.name));
      const mustSee = dest.places.filter((p) => p.mustSee).slice(0, 5);
      for (const p of mustSee) assert.ok(names.has(p.name), `${dest.slug}: dropped ${p.name}`);
    }
  });

  it('every attraction has a name, a description and coordinates', () => {
    for (const { dest, country } of pairs) {
      const ld = touristDestinationLd(dest, country) as {
        includesAttraction: { name: string; description: string; geo: Record<string, number> }[];
      };
      for (const a of ld.includesAttraction) {
        assert.ok(a.name?.trim(), `${dest.slug}: attraction with no name`);
        assert.ok(a.description?.trim(), `${dest.slug}: ${a.name} has no description`);
        assert.ok(Number.isFinite(a.geo.latitude), `${dest.slug}: ${a.name} has no latitude`);
      }
    }
  });
});

describe('faqPairs', () => {
  it('gives every promoted destination at least two real pairs', () => {
    for (const { dest, country } of pairs) {
      const qa = faqPairs(dest, country);
      assert.ok(qa.length >= 2, `${dest.slug}: only ${qa.length} pairs`);
    }
  });

  it('every answer is real prose, never an empty string', () => {
    /*
      The floor is deliberately low. A first pass set it at 25 characters and
      failed on Barcelona, whose whole `bestSeason` is a 24-character month
      range - and the shortest in the promoted set is Berlin's at 10. Those are
      complete answers to "when should I travel", not thin ones, so the
      threshold was wrong and the data was right. What this guards is an empty
      or one-word field, which is what would actually make the markup a lie.
    */
    for (const { dest, country } of pairs) {
      for (const qa of faqPairs(dest, country)) {
        assert.ok(qa.question.endsWith('?'), `${dest.slug}: "${qa.question}" is not a question`);
        assert.ok(qa.answer.trim().length > 8, `${dest.slug}: empty answer to "${qa.question}"`);
      }
    }
  });

  it('every answer comes from a field the guide renders', () => {
    // The binding constraint on FAQ markup is that the answer is visible. Each
    // pair is checked against the catalog field its section shows, so a pair
    // invented from nothing cannot slip in.
    for (const { dest, country } of pairs) {
      for (const qa of faqPairs(dest, country)) {
        const fromCatalog =
          qa.answer === dest.bestSeason ||
          qa.answer === dest.practical.kosherOverview ||
          qa.answer === dest.practical.flights ||
          qa.answer === country.practical.visa ||
          // The two composed answers are built from real numbers; assert they
          // actually contain them rather than accepting any string.
          (qa.answer.includes(String(dest.itinerary.length)) && qa.question.includes('ימים')) ||
          (Boolean(dest.dailyCost) && qa.answer.includes(dest.dailyCost!.currency));
        assert.ok(fromCatalog, `${dest.slug}: answer not traceable to a rendered field:\n${qa.answer.slice(0, 80)}`);
      }
    }
  });

  it('does not ask about cost where there is no sourced figure', () => {
    for (const { dest, country } of pairs) {
      if (dest.dailyCost) continue;
      const asks = faqPairs(dest, country).some((q) => q.question.includes('כמה עולה'));
      assert.ok(!asks, `${dest.slug}: asks about cost with no dailyCost record`);
    }
  });

  it('doubles a word-initial vav in the questions', () => {
    const vienna = destinations.find((d) => d.slug === 'vienna')!;
    const austria = countries.find((c) => c.slug === vienna.countrySlug)!;
    const text = faqPairs(vienna, austria)
      .map((q) => q.question)
      .join(' ');
    assert.ok(text.includes('בווינה') || text.includes('לווינה'), 'vav not doubled');
    assert.ok(!/[בל]וינה/.test(text), 'wrong spelling present');
  });
});

describe('faqLd', () => {
  it('returns null below two pairs, because one question is not an FAQ', () => {
    assert.equal(faqLd([]), null);
    assert.equal(faqLd([{ question: 'א?', answer: 'ב' }]), null);
  });

  it('maps each pair to a Question with an acceptedAnswer', () => {
    const ld = faqLd([
      { question: 'א?', answer: 'תשובה א' },
      { question: 'ב?', answer: 'תשובה ב' },
    ]) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.equal(ld.mainEntity.length, 2);
    assert.equal(ld.mainEntity[0].acceptedAnswer.text, 'תשובה א');
  });
});

describe('collectionLd and countryLd', () => {
  it('numbers list items from 1 and links to real destination urls', () => {
    const ld = collectionLd('אוסף', '/collections/kosher', [
      { name: 'וינה', slug: 'vienna' },
      { name: 'רומא', slug: 'rome' },
    ]) as { numberOfItems: number; itemListElement: { position: number; url: string }[] };
    assert.equal(ld.numberOfItems, 2);
    assert.deepEqual(ld.itemListElement.map((i) => i.position), [1, 2]);
    assert.ok(ld.itemListElement[0].url.endsWith('/destinations/vienna'));
  });

  it('describes a country from its curated summary', () => {
    const austria = countries.find((c) => c.slug === 'austria')!;
    const ld = countryLd(austria, 3) as { name: string; description: string };
    assert.equal(ld.name, austria.name);
    assert.equal(ld.description, austria.summary);
  });
});
