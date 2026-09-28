/**
 * The home country is the first entry in this catalog that is not abroad, and almost
 * every assumption about a destination was written when they all were. These tests pin
 * the ones that were found, and one class guard for the ones that have not been.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HOME_COUNTRY_SLUG, isDomestic, seasonFactTitle, travelFactTitle } from './domestic.ts';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { timezoneFor } from './countryTimezones.ts';

test('the home country is in the catalog, with destinations pointing at it', () => {
  const home = countries.find((c) => c.slug === HOME_COUNTRY_SLUG);
  assert.ok(home, 'israel is missing from countries.ts');
  const domestic = destinations.filter((d) => d.countrySlug === HOME_COUNTRY_SLUG);
  assert.ok(domestic.length >= 5, `only ${domestic.length} domestic destinations`);
});

test('a domestic destination never gets a flight label', () => {
  /*
    The bug this whole module exists for. A "flights from Tel Aviv" heading on the
    Jerusalem page is not a rounding error in the copy - there is no such flight, and
    offering one reads as a site that does not know the country it sells.
  */
  const jlm = destinations.find((d) => d.slug === 'jerusalem');
  assert.ok(jlm, 'jerusalem missing');
  assert.equal(travelFactTitle(jlm, 'טיסות מתל אביב'), 'איך מגיעים');
  assert.equal(seasonFactTitle(jlm, 'מתי כדאי לטוס', 'מתי כדאי לנסוע'), 'מתי כדאי לנסוע');
});

test('a foreign destination is untouched - the fix must not cost the other 166', () => {
  const rome = destinations.find((d) => d.slug === 'rome');
  assert.ok(rome, 'rome missing');
  assert.equal(travelFactTitle(rome, 'טיסות מתל אביב'), 'טיסות מתל אביב');
  assert.equal(seasonFactTitle(rome, 'מתי כדאי לטוס', 'מתי כדאי לנסוע'), 'מתי כדאי לטוס');
});

test('isDomestic does not throw on the shapes it will really be handed', () => {
  // Called from components during render; a null destination must not take the page down.
  assert.equal(isDomestic(null), false);
  assert.equal(isDomestic(undefined), false);
  assert.equal(isDomestic({}), false);
});

test('every domestic destination has a real Shabbat clock', () => {
  /*
    Adding destinations without a time zone silently removes candle-lighting times, and
    for the home country those are the times users know by heart. Asserted per
    destination rather than trusting the country map, because the map splits some
    countries by longitude.
  */
  for (const d of destinations.filter((x) => x.countrySlug === HOME_COUNTRY_SLUG)) {
    assert.equal(timezoneFor(d.countrySlug, d.center.lng), 'Asia/Jerusalem', d.slug);
  }
});

test("a domestic destination's practical text does not promise a flight", () => {
  /*
    The label is fixed in the UI, but the TEXT is data and nothing stops the next author
    writing "direct flights from TLV" into a domestic entry. The word for flights is
    banned in that field for the home country; "train" and "car" are what belongs there.
  */
  for (const d of destinations.filter((x) => x.countrySlug === HOME_COUNTRY_SLUG)) {
    const text = d.practical.flights;
    for (const banned of ['טיסה ישירה', 'טיסות ישירות', 'נתב״ג לטיסה']) {
      assert.ok(!text.includes(banned), `${d.slug} promises a flight: "${banned}"`);
    }
  }
});

test('**class guard**: no new component hardcodes a flight label beside practical.flights', () => {
  /*
    Three components rendered `practical.flights` and all three hardcoded "from Tel
    Aviv" next to it. That is a pattern, not a coincidence - the field is named
    `flights`, so the label writes itself. A fourth will be added eventually; this makes
    it fail loudly instead of shipping a nonsense fact card for the home country.
  */
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.tsx?$/.test(e.name) || /\.test\./.test(e.name)) continue;
      const src = readFileSync(p, 'utf8');
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (!line.includes('practical.flights')) return;
        // Prose, not code. A comment naming the field is how this rule is documented.
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
        /*
          A window, not the line. JSX splits an element across lines, so the title and
          the value are usually neighbours rather than roommates - checking only the
          matched line flagged the very component that had just been fixed. Four lines
          either side covers a <Fact /> without reaching the next element.
        */
        const near = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
        if (/travelFactTitle|isDomestic/.test(near)) return;
        offenders.push(`${p.replace(/\\/g, '/')}:${i + 1}  ${t.slice(0, 110)}`);
      });
    }
  };
  walk('src');
  assert.deepEqual(
    offenders,
    [],
    'practical.flights is rendered without travelFactTitle, so the home country gets a ' +
      'flight label:\n' + offenders.join('\n'),
  );
});
