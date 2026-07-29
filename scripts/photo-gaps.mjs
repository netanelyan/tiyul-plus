// The photo worklist. Run this the moment the Chrome extension is connected.
//
// Why this file exists: "which places have no photo" has been re-derived by
// hand in four separate sessions, each time with a throwaway /tmp script, and
// each time the answer was shaped slightly differently. The absence of a
// `photo` field IS the mark - nothing needs to be written into the data - but
// the WORKLIST does need to be stable, ordered and honest about which gaps are
// actually fillable. That is this script.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/photo-gaps.mjs
//      ... --json          machine-readable, for driving a batch lookup
//      ... --tier A        only one tier
//      ... --dest <slug>   only one destination
//
// It needs NO network. It reads the catalog and the committed probe manifest.

import { readFileSync, existsSync } from 'node:fs';
import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyTier = args.includes('--tier') ? args[args.indexOf('--tier') + 1] : null;
const onlyDest = args.includes('--dest') ? args[args.indexOf('--dest') + 1] : null;

const MANIFEST = 'scripts/photo-verified.json';
let manifest = {};
if (existsSync(MANIFEST)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) ?? {};
  } catch {
    manifest = {};
  }
}
/** 'ok' = probed and served 200. 'dead' = probed and did NOT. 'unprobed' = no evidence either way. */
const probeState = (url) => {
  const v = manifest[url];
  if (v === undefined) return 'unprobed';
  if (typeof v === 'number') return 'ok';
  return v && v.ok ? 'ok' : 'dead';
};

// Tiers are about WHERE A PHOTO CAN COME FROM, not about how much we want one.
// This distinction is the whole point of the file: a flat list of 312 gaps
// reads as 312 units of work, and it is not - roughly a sixth of it is
// permanently unfillable and should never be attempted again.
//
// A - public places that almost always have a Wikipedia/Commons article:
//     landmarks, museums, parks, viewpoints, and named markets.
// B - businesses. The famous ones genuinely do have Commons photographs
//     (Harry's Bar, Café Tortoni, Confeitaria Colombo, Pfunds Molkerei),
//     the neighbourhood ones never will. Worth trying, expect a low hit rate.
// C - kosher venues. Four sessions have now confirmed these have no freely
//     licensed photograph anywhere: a Chabad house or a kosher grocery is not
//     a subject Commons contributors photograph. The UI already falls back to
//     a category tile, which is the correct end state. DO NOT WORK THIS TIER.
const TIER = {
  attraction: 'A',
  museum: 'A',
  nature: 'A',
  viewpoint: 'A',
  market: 'A',
  shopping: 'A',
  food: 'B',
  cafe: 'B',
  'kosher-food': 'C',
  'kosher-market': 'C',
};
const TIER_NOTE = {
  A: 'public place - usually has a Commons article; highest hit rate',
  B: 'business - only the famous ones have a free photograph; expect misses',
  C: 'kosher venue - confirmed unfillable across four sessions; DO NOT WORK',
};

const gaps = { A: [], B: [], C: [] };
const reprobe = []; // has a URL, but the manifest says dead or says nothing

for (const d of destinations) {
  if (onlyDest && d.slug !== onlyDest) continue;
  for (const p of d.places) {
    if (!p.photo) {
      const tier = TIER[p.category] ?? 'B';
      gaps[tier].push({
        tier,
        dest: d.slug,
        id: p.id,
        category: p.category,
        name: p.name,
        nameLocal: p.nameLocal,
        lat: p.lat,
        lng: p.lng,
        // The single most useful field for a lookup: a coordinate to check any
        // candidate article against. The wrong-subject trap (a Toronto
        // restaurant for a Florence gelateria) is caught by distance, not by name.
        source: p.source?.url ?? null,
      });
      continue;
    }
    const state = probeState(p.photo);
    if (state !== 'ok') reprobe.push({ dest: d.slug, id: p.id, state, url: p.photo });
  }
  if (d.photo && probeState(d.photo) !== 'ok')
    reprobe.push({ dest: d.slug, id: `${d.slug} (destination hero)`, state: probeState(d.photo), url: d.photo });
  if (d.iconicLandmark?.photo && probeState(d.iconicLandmark.photo) !== 'ok')
    reprobe.push({
      dest: d.slug,
      id: `${d.slug} (iconicLandmark)`,
      state: probeState(d.iconicLandmark.photo),
      url: d.iconicLandmark.photo,
    });
}
for (const c of countries) {
  if (c.photo && probeState(c.photo) !== 'ok')
    reprobe.push({ dest: c.slug, id: `${c.slug} (country card)`, state: probeState(c.photo), url: c.photo });
}

// NOTE: no `process.exit()` here, deliberately. When stdout is a PIPE it is
// asynchronous, and exiting immediately after a large console.log truncates the
// write mid-string - this printed 62KB of a 90KB document and produced invalid
// JSON that looked like a data bug. Falling off the end of the module lets Node
// flush. Caught by piping --json into a parser; a terminal would have hidden it.
if (asJson) {
  const tiers = onlyTier ? { [onlyTier]: gaps[onlyTier] ?? [] } : gaps;
  console.log(JSON.stringify({ gaps: tiers, reprobe }, null, 1));
} else {

const totalPlaces = destinations.reduce((n, d) => n + d.places.length, 0);
console.log(`PHOTO WORKLIST - ${totalPlaces} places in the catalog\n`);

for (const tier of ['A', 'B', 'C']) {
  if (onlyTier && tier !== onlyTier) continue;
  const list = gaps[tier];
  console.log(`── TIER ${tier}: ${list.length} places - ${TIER_NOTE[tier]}`);
  if (tier === 'C') {
    console.log('   (listed for completeness only; filling these is not work, it is a wild goose chase)\n');
    continue;
  }
  const byDest = new Map();
  for (const g of list) {
    if (!byDest.has(g.dest)) byDest.set(g.dest, []);
    byDest.get(g.dest).push(g);
  }
  for (const [dest, items] of [...byDest].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${dest} (${items.length})`);
    for (const g of items)
      console.log(`      ${g.id.padEnd(26)} ${g.category.padEnd(11)} ${g.lat},${g.lng}  ${g.nameLocal}`);
  }
  console.log('');
}

console.log(`── RE-PROBE: ${reprobe.length} URLs already in the data with no passing HTTP evidence`);
const dead = reprobe.filter((r) => r.state === 'dead');
const unprobed = reprobe.filter((r) => r.state === 'unprobed');
console.log(`   ${dead.length} recorded DEAD (need a human to choose a replacement - see session log (s))`);
for (const r of dead) console.log(`      ${r.dest}/${r.id}`);
console.log(`   ${unprobed.length} never probed at all (just run verify-photos.mjs with a network)`);
for (const r of unprobed) console.log(`      ${r.dest}/${r.id}`);

console.log(`\nTOTAL fillable (A+B): ${gaps.A.length + gaps.B.length}   unfillable (C): ${gaps.C.length}   re-probe: ${reprobe.length}`);
console.log(`
When Chrome is connected, the order that works:
  1. node scripts/verify-photos.mjs --force   - settles the ${reprobe.length} re-probe rows first,
     because some of them are alive and just have no evidence recorded.
  2. Tier A, by destination, largest first. Confirm every candidate article's own
     coordinates against the lat/lng above - the wrong-subject trap is caught by
     distance, never by name matching.
  3. Tier B only if A is exhausted.
  4. Never Tier C.`);
}
