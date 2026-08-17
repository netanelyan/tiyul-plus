/**
 * Outbound links - **five claims, all about what must never happen.**
 *
 * 1. A place link is built from coordinates, even when the data holds a name.
 * 2. Without valid coordinates - `null`, never a name-based guess.
 * 3. A real external provider's URL is not overridden by a map.
 * 4. `sponsored` appears only when there is a real affiliation.
 * 5. No component renders `externalUrl` on its own and bypasses the module.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mapsPointUrl, outboundAttrs, outboundTarget, placeMapUrl } from './outbound.ts';
import { destinations } from '../data/destinations.ts';

/* ---------- 1. Coordinates beat a name ---------- */

test('**כתובת מבוססת-שם נדרסת ע"י הקואורדינטות**', () => {
  const url = placeMapUrl({
    lat: 48.2085,
    lng: 16.3721,
    externalUrl: 'https://maps.google.com/?q=St+Stephens+Cathedral+Vienna',
  });
  assert.equal(url, mapsPointUrl(48.2085, 16.3721));
  assert.ok(!url!.includes('Stephens'), 'השם לא שורד לתוך הכתובת');
});

test('גם הצורה הישנה של כתובת-קואורדינטות מנורמלת לצורה המתועדת', () => {
  const url = placeMapUrl({ lat: 38.4794, lng: 22.4936, externalUrl: 'https://maps.google.com/?q=38.4794,22.4936' });
  assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=38.479400,22.493600');
});

/*
 * The previous version fell back here to the stored (name-based) URL
 * "because half a link is better than nothing". That is exactly the behavior
 * that was decided against: a link that lands someone on the wrong street is
 * worse than no link, because it is experienced as certainty. Now every one
 * of these cases returns `null`, with no exception.
 */
test('בלי קואורדינטות תקינות - null, לא כתובת-שם ישנה', () => {
  const namedGuess = 'https://maps.google.com/?q=Somewhere';
  assert.equal(placeMapUrl({ externalUrl: namedGuess }), null, 'אין קואורדינטות בכלל');
  assert.equal(placeMapUrl({ lat: NaN, lng: 3, externalUrl: namedGuess }), null, 'lat הוא NaN');
  assert.equal(placeMapUrl({ lat: 48.2, lng: NaN, externalUrl: namedGuess }), null, 'lng הוא NaN');
  assert.equal(placeMapUrl({ lat: 200, lng: 16, externalUrl: namedGuess }), null, 'lat מחוץ לטווח כדור הארץ');
  assert.equal(placeMapUrl({ lat: 48.2, lng: -400, externalUrl: namedGuess }), null, 'lng מחוץ לטווח כדור הארץ');
  assert.equal(placeMapUrl({}), null, 'לא נשלח כלום');
});

/* ---------- 2. A provider's real page is not overridden ---------- */

test('כתובת שאינה של גוגל שורדת, והתווית יודעת מה היא', () => {
  const wiki = 'https://he.wikipedia.org/wiki/%D7%9C%D7%99%D7%A1%D7%91%D7%95%D7%9F';
  assert.equal(placeMapUrl({ lat: 38.7, lng: -9.1, externalUrl: wiki }), wiki);
  assert.equal(outboundTarget(wiki), 'wikipedia');
  assert.equal(outboundTarget(mapsPointUrl(1, 2)), 'maps');
  assert.equal(outboundTarget(null), 'other');
});

/* ---------- 3. sponsored only when it is the truth ---------- */

test('`sponsored` רק על קישור משויך באמת', () => {
  assert.ok(!outboundAttrs().rel.includes('sponsored'));
  assert.ok(outboundAttrs({ affiliate: true }).rel.includes('sponsored'));
  // And always the basic protections
  for (const a of [outboundAttrs(), outboundAttrs({ affiliate: true })]) {
    assert.equal(a.target, '_blank');
    assert.ok(a.rel.includes('noopener'));
    assert.ok(a.rel.includes('nofollow'));
  }
});

/* ---------- 4. The class guard ---------- */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * The bug this module was born for is three components that rendered
 * `externalUrl` directly, and therefore inherited the 725 name-based links.
 * The test makes sure nobody goes back there: an `href` receiving
 * `externalUrl` without going through `placeMapUrl` is exactly the bug's
 * return.
 */
test('אף רכיב לא מרנדר externalUrl ישירות אל href', () => {
  const bad: string[] = [];
  for (const file of walk('src')) {
    if (!/\.tsx$/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    for (const line of src.split('\n')) {
      if (/href=\{[^}]*externalUrl/.test(line) && !line.includes('placeMapUrl')) {
        bad.push(`${file}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(bad, [], `יש לעבור דרך placeMapUrl:\n${bad.join('\n')}`);
});

/* ---------- The real catalog ---------- */

const COORD_QUERY = /[?&]query=-?\d+\.\d+,-?\d+\.\d+$/;

/**
 * **The test this task asked for explicitly: fails if any place produces a
 * name-based link.** This is a standing architectural claim, not a snapshot
 * of today's data - `placeMapUrl` must never return
 * `maps.google.com/?q=<name>` under any circumstance, even if tomorrow
 * somebody adds a place with such a stored URL and no coordinates.
 */
test('אף מקום בקטלוג לא מפיק קישור מבוסס-שם', () => {
  const byName: string[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      const url = placeMapUrl(p);
      if (url && isGoogleMapsHref(url) && !COORD_QUERY.test(url)) byName.push(`${d.slug}/${p.id} → ${url}`);
    }
  }
  assert.deepEqual(byName, [], `${byName.length} מקומות עדיין מפיקים קישור מבוסס-שם:\n${byName.join('\n')}`);
});

function isGoogleMapsHref(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'maps.google.com' || h === 'google.com' || h === 'www.google.com' || h.endsWith('.google.com');
  } catch {
    return false;
  }
}

/**
 * Today's data state: **every** place in the catalog gets a point-based
 * link - none falls to `null` for lack of a location. Unlike the previous
 * test, this IS a snapshot of the data: if it fails, it means a new place
 * was added without valid coordinates, and that is worth a manual check -
 * not necessarily a code bug.
 */
test('כל מקום בקטלוג מקבל קישור מבוסס-קואורדינטות (אף null)', () => {
  let total = 0;
  const missing: string[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      total++;
      const url = placeMapUrl(p);
      if (!url || !COORD_QUERY.test(url)) missing.push(`${d.slug}/${p.id} → ${url}`);
    }
  }
  assert.ok(total > 1500, `נבדקו ${total} מקומות`);
  assert.deepEqual(missing.slice(0, 5), [], `${missing.length} מקומות בלי קישור מבוסס-קואורדינטות`);
});
