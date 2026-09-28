/**
 * Resolve every seeded Israeli place to a real coordinate from OpenStreetMap.
 *
 * Why this exists rather than typing the numbers: `coordPrecision.test.ts` fails any
 * new point-shaped place whose coordinate has two decimals or fewer, and its failure
 * message says to fix the data rather than the test. Two decimals is ~1.1km. A
 * coordinate recalled from memory is a two-decimal coordinate wearing more digits, so
 * the only honest source is a lookup.
 *
 * Every result is checked against Israel's bounding box before it is accepted. A
 * geocoder asked for "Magdala" will happily return one in Spain, and a wrong hit that
 * still LOOKS like a precise coordinate is worse than no hit at all - it is undetectable
 * downstream. Anything that fails the box, or that no provider resolves, is reported at
 * the end and left for a human rather than guessed.
 *
 * Nominatim's usage policy is one request per second, serial - honoured here.
 */
import { writeFileSync } from 'node:fs';
import { DESTINATIONS } from './israel-seed.mjs';
import { DESTINATIONS_NORTH } from './israel-seed-north.mjs';

const ALL = [...DESTINATIONS, ...DESTINATIONS_NORTH];

// Israel, generously bounded: Rosh HaNikra to Eilat, coast to the Golan.
const BOX = { minLat: 29.4, maxLat: 33.35, minLng: 34.2, maxLng: 35.95 };
const inBox = (lat, lng) =>
  lat >= BOX.minLat && lat <= BOX.maxLat && lng >= BOX.minLng && lng <= BOX.maxLng;

const UA = 'tiyul-plus-catalog/1.0 (natikyan153@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(q) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=il&q=' +
    encodeURIComponent(q);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const rows = await res.json();
  for (const r of rows) {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (inBox(lat, lng)) return { lat, lng, via: 'nominatim', label: r.display_name };
  }
  return null;
}

async function photon(q) {
  const url = 'https://photon.komoot.io/api/?limit=5&q=' + encodeURIComponent(q);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const body = await res.json();
  for (const f of body.features ?? []) {
    const [lng, lat] = f.geometry?.coordinates ?? [];
    if (typeof lat === 'number' && inBox(lat, lng)) {
      return { lat, lng, via: 'photon', label: f.properties?.name ?? '' };
    }
  }
  return null;
}

const out = {};
const failed = [];
let n = 0;
const total = ALL.reduce((s, d) => s + d.places.length, 0);

for (const dest of ALL) {
  for (const p of dest.places) {
    n += 1;
    let hit = await nominatim(p.q);
    await sleep(1100); // Nominatim policy: 1 req/sec, serial.
    if (!hit) {
      hit = await photon(p.q);
      await sleep(400);
    }
    if (hit) {
      // 6 decimals is ~0.1m - far more than needed, but truncating is the caller's job,
      // not the collector's. Stored as returned.
      out[p.id] = { lat: hit.lat, lng: hit.lng, via: hit.via, q: p.q, label: hit.label };
      console.log(`[${n}/${total}] ${p.id.padEnd(26)} ${hit.lat.toFixed(5)},${hit.lng.toFixed(5)}  (${hit.via})`);
    } else {
      failed.push({ id: p.id, q: p.q, dest: dest.slug });
      console.log(`[${n}/${total}] ${p.id.padEnd(26)} NOT FOUND  "${p.q}"`);
    }
  }
}

writeFileSync('scripts/israel-coords.json', JSON.stringify(out, null, 2), 'utf8');
console.log(`\nresolved ${Object.keys(out).length}/${total}`);
if (failed.length) {
  console.log(`\nUNRESOLVED - these need a human, not a guess:`);
  for (const f of failed) console.log(`  ${f.dest}/${f.id}  "${f.q}"`);
}
