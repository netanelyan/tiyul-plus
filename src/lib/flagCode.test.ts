import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { countryCodeFromFlag, countryNameFromCode } from '@/lib/flagCode';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

/**
 * The bug this guards: a day header on the Prague page rendered
 * `alt="flag of Prague"` on the Czech flag - the template interpolated the city
 * where the country belonged, so it was wrong on every city in the catalog.
 *
 * These run against the real catalog, because what is being asserted is what
 * actually ships rather than a fixture.
 */

test('every destination flag resolves to a country code', () => {
  const unresolved = destinations
    .filter((d) => !countryCodeFromFlag(d.flag))
    .map((d) => `${d.slug} (${d.flag})`);
  assert.deepEqual(unresolved, [], 'a flag with no ISO code renders as a bare emoji');
});

test('a flag is never described as the flag of a city', () => {
  const byCountry = new Map(countries.map((c) => [c.slug, c.name]));
  const wrong: string[] = [];
  for (const d of destinations) {
    const code = countryCodeFromFlag(d.flag);
    if (!code) continue;
    const countryName = byCountry.get(d.countrySlug);
    /*
      Singapore, Malta and Mauritius are city-states: the country and the
      destination are the same word, so "flag of Singapore" is correct and
      indistinguishable from the bug by name alone. Skipping them is what
      makes the remaining comparison mean something.
    */
    if (!countryName || countryName === d.name) continue;
    if (countryNameFromCode(code) === d.name) wrong.push(d.slug);
  }
  assert.deepEqual(wrong, []);
});

test('the derived name is the destination country, not a neighbour', () => {
  // Spot-check across the catalog rather than asserting every row: worldCountries
  // and the catalog's own country list are two separate sources and their Hebrew
  // wording is allowed to differ, so this checks the ones that must agree.
  const byCountry = new Map(countries.map((c) => [c.slug, c.name]));
  const checked = ['prague', 'vienna', 'rome', 'bangkok'].filter((s) =>
    destinations.some((d) => d.slug === s),
  );
  assert.ok(checked.length >= 3, 'the spot-check sample went missing from the catalog');
  for (const slug of checked) {
    const d = destinations.find((x) => x.slug === slug)!;
    const derived = countryNameFromCode(countryCodeFromFlag(d.flag)!);
    assert.equal(derived, byCountry.get(d.countrySlug), `${slug}: flag names the wrong country`);
  }
});

test('Flag builds its alt from the code, not from the caller label', () => {
  /*
    The two tests above prove the helper returns a country. This one proves
    the component still asks it - otherwise the helper could be correct and
    unused, which is exactly the state the codebase was in before: the alt was
    interpolated straight from `label`, and every caller but two passes a city.
    Source-scanned in the same spirit as designConsistency.test.ts.
  */
  const src = readFileSync(new URL('../components/Flag.tsx', import.meta.url), 'utf8');
  assert.ok(
    /alt=\{label \? `[^`]*\$\{countryNameFromCode\(/.test(src),
    'Flag.tsx no longer derives its alt from countryNameFromCode',
  );
});
