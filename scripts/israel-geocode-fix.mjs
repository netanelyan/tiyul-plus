/**
 * Second pass: the twelve places the first run got wrong or missed.
 *
 * What the first run taught, and why this one is shaped differently:
 *
 * 1. **A country-wide search is too loose.** Photon answered "Nahal Mearot Nature
 *    Reserve" AND "Nahal Amud Nature Reserve" with the same hit - Nahal Sorek, beside
 *    Jerusalem - because it falls back to fuzzy matching and "nature reserve" is the
 *    part it matched. Nominatim answered "Makhtesh Ramon" with a STREET named Makhtesh
 *    Ramon in Ofakim. Both returned confident five-decimal coordinates.
 *    So every search here is bounded to a viewbox around the destination.
 *
 * 2. **Hebrew is the better query for Israeli reserves**, which is where the
 *    authoritative OSM name usually sits; the English is often only an alt_name.
 *
 * 3. **The radius is checked before a result is accepted**, not afterwards in a
 *    separate script. A candidate that fails it is discarded and the next one tried,
 *    rather than written out for a human to catch later.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'tiyul-plus-catalog/1.0 (natikyan153@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// id -> { queries (tried in order), near (expected centre), maxKm }
const TARGETS = {
  'jlm-mount-olives': { queries: ['הר הזיתים תצפית', 'הר הזיתים ירושלים', 'Mount of Olives Jerusalem'], near: { lat: 31.778, lng: 35.245 }, maxKm: 6 },
  'eil-hai-bar': { queries: ['שמורת חי בר יטבתה', 'חי בר יטבתה', 'Hai Bar Yotvata'], near: { lat: 29.88, lng: 35.06 }, maxKm: 30 },
  'eil-red-canyon': { queries: ['הקניון האדום', 'Red Canyon Israel'], near: { lat: 29.66, lng: 34.87 }, maxKm: 30 },
  'eil-birding': { queries: ['פארק הציפורים אילת', 'מרכז צפרות אילת', 'Eilat Bird Sanctuary'], near: { lat: 29.56, lng: 34.95 }, maxKm: 15 },
  'ram-ardon': { queries: ['הר ארדון', 'Mount Ardon'], near: { lat: 30.62, lng: 34.95 }, maxKm: 35 },
  'ram-crater': { queries: ['מכתש רמון', 'Makhtesh Ramon crater'], near: { lat: 30.6, lng: 34.87 }, maxKm: 40 },
  'gal-arbel': { queries: ['הר ארבל', 'שמורת הר ארבל', 'Arbel National Park'], near: { lat: 32.82, lng: 35.5 }, maxKm: 20 },
  'gal-nahal-amud': { queries: ['נחל עמוד', 'שמורת נחל עמוד'], near: { lat: 32.88, lng: 35.47 }, maxKm: 25 },
  'gol-meshushim': { queries: ['בריכת המשושים', 'Meshushim Pool Golan'], near: { lat: 32.93, lng: 35.68 }, maxKm: 25 },
  'gol-banias': { queries: ['שמורת בניאס', 'בניאס', 'Banias'], near: { lat: 33.25, lng: 35.69 }, maxKm: 25 },
  'gol-yehudiya': { queries: ['שמורת יהודיה', 'יהודיה'], near: { lat: 32.94, lng: 35.7 }, maxKm: 25 },
  'hfa-nahal-mearot': { queries: ['שמורת נחל מערות', 'נחל מערות', 'Nahal Mearot'], near: { lat: 32.67, lng: 34.97 }, maxKm: 20 },
};

function km(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Bounded to a box around the expected point, so a far-away namesake cannot win. */
async function search(q, near, maxKm) {
  const dLat = maxKm / 111;
  const dLng = maxKm / (111 * Math.cos((near.lat * Math.PI) / 180));
  const viewbox = [near.lng - dLng, near.lat + dLat, near.lng + dLng, near.lat - dLat].join(',');
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=10&countrycodes=il` +
    `&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const rows = await res.json();
  const ok = rows
    .map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name, type: r.type, cls: r.class }))
    .filter((r) => km(r, near) <= maxKm)
    // Prefer an actual feature over a road or a residential street of the same name.
    .sort((a, b) => (a.cls === 'highway' ? 1 : 0) - (b.cls === 'highway' ? 1 : 0));
  return ok[0] ?? null;
}

const coords = JSON.parse(readFileSync('scripts/israel-coords.json', 'utf8'));
const stillBad = [];

for (const [id, t] of Object.entries(TARGETS)) {
  let hit = null;
  let used = '';
  for (const q of t.queries) {
    hit = await search(q, t.near, t.maxKm);
    await sleep(1100);
    if (hit) {
      used = q;
      break;
    }
  }
  if (hit) {
    coords[id] = { lat: hit.lat, lng: hit.lng, via: 'nominatim-bounded', q: used, label: hit.label };
    console.log(`${id.padEnd(22)} ${hit.lat.toFixed(5)},${hit.lng.toFixed(5)}  ${km(hit, t.near).toFixed(1)}km off  "${used}"`);
    console.log(`${' '.repeat(22)} matched: ${String(hit.label).slice(0, 80)}`);
  } else {
    stillBad.push(id);
    console.log(`${id.padEnd(22)} STILL UNRESOLVED`);
  }
}

writeFileSync('scripts/israel-coords.json', JSON.stringify(coords, null, 2), 'utf8');
console.log(`\ntotal coordinates: ${Object.keys(coords).length}`);
if (stillBad.length) console.log(`still unresolved: ${stillBad.join(', ')}`);
