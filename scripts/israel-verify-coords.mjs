/**
 * Check every resolved coordinate against the centre of the destination it belongs to.
 *
 * The bounding-box check in `israel-geocode.mjs` was not enough, and the run proved it:
 * "Nahal Mearot Nature Reserve" resolved to 31.75,35.06 - inside Israel, so the box
 * passed it, but that is beside Jerusalem and the reserve is on the Carmel coast.
 * A wrong coordinate that carries five decimals is invisible downstream; it looks
 * exactly like a good one, and it puts a pin in the sea or in the wrong city on a map
 * the traveller is trusting.
 *
 * So the real test is not "is it in the country" but "is it anywhere near the place it
 * claims to be". Radii are per destination because the destinations are not the same
 * size: Tel Aviv is a city, the Dead Sea is 60km of road, and Acre-to-Caesarea is a
 * coastline.
 */
import { readFileSync } from 'node:fs';
import { DESTINATIONS } from './israel-seed.mjs';
import { DESTINATIONS_NORTH } from './israel-seed-north.mjs';

const ALL = [...DESTINATIONS, ...DESTINATIONS_NORTH];
const coords = JSON.parse(readFileSync('scripts/israel-coords.json', 'utf8'));

/** How far a place may legitimately sit from its destination centre, in km. */
const RADIUS_KM = {
  jerusalem: 15,
  'tel-aviv': 15,
  'dead-sea': 60,
  eilat: 60,
  'mitzpe-ramon': 70,
  'galilee-kinneret': 45,
  golan: 45,
  'haifa-carmel': 35,
  'akko-caesarea': 75,
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

const bad = [];
const missing = [];
const seen = new Map();
const dupes = [];

for (const dest of ALL) {
  const limit = RADIUS_KM[dest.slug];
  for (const p of dest.places) {
    const c = coords[p.id];
    if (!c) {
      missing.push(`${dest.slug}/${p.id}  "${p.q}"`);
      continue;
    }
    const d = km(dest.center, c);
    if (d > limit) {
      bad.push(
        `${dest.slug}/${p.id}  ${d.toFixed(1)}km from centre (max ${limit})  ` +
          `got ${c.lat.toFixed(4)},${c.lng.toFixed(4)} via ${c.via}\n      q="${c.q}"  matched="${(c.label ?? '').slice(0, 70)}"`,
      );
    }
    // Two places sharing a coordinate means one of them matched the other's record.
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    if (seen.has(key)) dupes.push(`${seen.get(key)} and ${dest.slug}/${p.id} share ${key}`);
    else seen.set(key, `${dest.slug}/${p.id}`);
  }
}

console.log(`checked ${Object.keys(coords).length} coordinates`);
console.log(`\nOUT OF RANGE (${bad.length}):`);
bad.forEach((b) => console.log('  ' + b));
console.log(`\nSHARED COORDINATE (${dupes.length}):`);
dupes.forEach((d) => console.log('  ' + d));
console.log(`\nMISSING (${missing.length}):`);
missing.forEach((m) => console.log('  ' + m));
