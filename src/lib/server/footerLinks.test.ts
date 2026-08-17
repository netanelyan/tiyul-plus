/**
 * Tests for the footer links and the coverage numbers.
 *
 * The only thing really tested here: **that everything is derived from the
 * data**. A destination list in the footer and a place count are exactly the
 * kind of things someone will "just hardcode for a moment" in the future to
 * solve something, and they will go stale silently - the data session adds
 * destinations every night.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import {
  catalogCounts,
  coverageCountsLine,
  footerCountries,
  footerDestinations,
} from './footerLinks.ts';

test('המספרים תואמים לדאטה, ספירה מלאה ולא מדגם', () => {
  assert.equal(catalogCounts.destinations, destinations.length);
  assert.equal(
    catalogCounts.places,
    destinations.reduce((n, d) => n + d.places.length, 0),
  );
  // Only countries that actually have a destination - a country with no destinations is not "coverage"
  const withDests = countries.filter((c) => destinations.some((d) => d.countrySlug === c.slug));
  assert.equal(catalogCounts.countries, withDests.length);
  assert.ok(catalogCounts.countries <= countries.length);
});

test('שורת הכיסוי מכילה את שלושת המספרים האמיתיים', () => {
  const line = coverageCountsLine();
  assert.ok(line.includes(String(catalogCounts.destinations)));
  assert.ok(line.includes(String(catalogCounts.countries)));
  // Places are displayed with a thousands separator, so we compare against the formatted form
  assert.ok(line.includes(catalogCounts.places.toLocaleString('he-IL')));
});

test('אף מספר בקוד אינו כתוב ביד', () => {
  const src = readFileSync('src/lib/server/footerLinks.ts', 'utf8')
    // Comments are removed before the scan: an example in the docs (the
    // "1,814 places · 166 destinations" line) is exactly what helps the next
    // reader, and it is not a figure displayed to the user
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '');
  // Only the numbers that are **display caps** are allowed, not data
  const allowed = new Set(['12', '10', '6', '2', '0', '1']);
  const numbers = (src.match(/(?<![\w-])\d+(?![\w-])/g) ?? []).filter((n) => !allowed.has(n));
  assert.deepEqual(numbers, [], `מספר קשיח בקוד הפוטר: ${numbers.join(', ')}`);
});

test('כל קישור יעד מצביע על עמוד קיים בדאטה', () => {
  const slugs = new Set(destinations.map((d) => d.slug));
  assert.ok(footerDestinations.length > 0);
  for (const l of footerDestinations) {
    const slug = l.href.replace('/destinations/', '');
    assert.ok(slugs.has(slug), `יעד לא קיים: ${l.href}`);
    assert.equal(l.label, destinations.find((d) => d.slug === slug)!.name);
  }
});

test('כל קישור מדינה מצביע על עמוד קיים בדאטה', () => {
  const slugs = new Set(countries.map((c) => c.slug));
  assert.ok(footerCountries.length > 0);
  for (const l of footerCountries) {
    assert.ok(slugs.has(l.href.replace('/countries/', '')), `מדינה לא קיימת: ${l.href}`);
  }
});

test('הרשימה לא ארוכה מדי, ולא מתמלאת ממדינה אחת', () => {
  assert.ok(footerDestinations.length <= 10, 'יותר מדי יעדים - השורה הופכת לעמודה');
  assert.ok(footerCountries.length <= 6);
  const perCountry = new Map<string, number>();
  for (const l of footerDestinations) {
    const d = destinations.find((x) => x.slug === l.href.replace('/destinations/', ''))!;
    perCountry.set(d.countrySlug, (perCountry.get(d.countrySlug) ?? 0) + 1);
  }
  for (const [country, n] of perCountry) {
    assert.ok(n <= 2, `${country}: ${n} יעדים בפוטר - הפיזור נשבר`);
  }
});

test('אין כפילויות ואין קישור ריק', () => {
  const all = [...footerDestinations, ...footerCountries];
  assert.equal(new Set(all.map((l) => l.href)).size, all.length);
  for (const l of all) {
    assert.ok(l.href.startsWith('/'), l.href);
    assert.ok(l.label.trim().length > 0);
  }
});
