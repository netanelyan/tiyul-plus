// Puts researched places into the curated route they geographically belong to.
//
// ## The problem this fixes
//
// A place can be in a destination and in no itinerary day. It still shows on
// the destination page and the agent can still reach it, but `placeIds` is what
// `tripFromTemplate` copies, what draws the map pins and what a built trip
// actually contains - so a place outside every day is invisible to anyone who
// takes the ready-made route. Measured 2026-09-19: **1,706 of 3,309 places**,
// and 63 destinations where 60% or more of the research never appeared in the
// route. Nicosia held eighteen places behind a one-day itinerary.
//
// Most of that is not an editorial decision. It is the arithmetic of six
// deepening passes that added places without extending days - a gap this log
// already recorded once for Bratislava and Athens, now at scale.
//
// ## Why assignment rather than new days
//
// **No prose is written here.** A new day needs a title and a `notes` line of
// real travel advice, and inventing that for 63 destinations is exactly the
// fabrication hard rule 2 forbids. Assigning a place to the day whose stops it
// already sits among invents nothing: the day exists, the place exists, and the
// only new information is the distance between them, which is computed.
//
// ## The rules
//
// - A day's reach is **derived from the destination's own scale**, not fixed: a
//   city day is walkable and a Serengeti day is a drive. It is 60% of the
//   spread between the destination's existing day clusters, clamped to 25-120km.
//   Same principle as the catalog's distance guard.
// - At most `MAX_PER_DAY` stops. A day is a day.
// - **And a length limit on the day itself**, which the per-place reach alone
//   does not give you: five stops each within 120km of the last can add up to a
//   724km "day", and the first version of this script produced exactly that for
//   the Grand Canyon, taking days over 300km from three to eight. An assignment
//   is now refused if it would push the day's own path past `MAX_DAY_KM` - or
//   past whatever the day already was, so the three long days a curator chose
//   deliberately are preserved rather than "corrected".
// - The day's **first stop is left where the curator put it**, and the rest are
//   re-ordered nearest-neighbour from it, so adding a stop does not turn the
//   day into a zig-zag.
// - A place too far from every day is left alone rather than forced into one.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs \
//        scripts/assign-orphan-places.mjs [--apply] [maxPerDay]
import { readFileSync, writeFileSync } from 'node:fs';
import { destinations } from '../src/data/destinations.ts';

const FILE = 'src/data/destinations.ts';
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const MAX_PER_DAY = Number(argv.find((a) => /^\d+$/.test(a)) ?? 5);

/** A day nobody could actually do. Longer existing days are respected - see above. */
const MAX_DAY_KM = 300;

const R = 6371;
const rad = (x) => (x * Math.PI) / 180;
function km(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A day's driving/walking path, end to end, in the order it is visited. */
function pathKm(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += km(points[i - 1], points[i]);
  return n;
}

/** Nearest-neighbour from the first stop - the curator's opening choice stays. */
function orderPath(points) {
  if (points.length < 3) return points;
  const rest = points.slice(1);
  const out = [points[0]];
  while (rest.length) {
    const last = out[out.length - 1];
    let bi = 0;
    let bd = Infinity;
    rest.forEach((p, i) => {
      const d = km(last, p);
      if (d < bd) { bd = d; bi = i; }
    });
    out.push(rest.splice(bi, 1)[0]);
  }
  return out;
}

const edits = [];
let assigned = 0;
let leftAlone = 0;

for (const d of destinations) {
  const byId = new Map(d.places.map((p) => [p.id, p]));
  const days = (d.itinerary ?? []).map((x) => ({
    day: x.day,
    ids: [...x.placeIds],
    pts: x.placeIds.map((id) => byId.get(id)).filter(Boolean),
  }));
  if (!days.length) continue;

  const used = new Set(days.flatMap((x) => x.ids));
  const orphans = d.places.filter((p) => !used.has(p.id));
  if (!orphans.length) continue;

  const centres = days
    .filter((x) => x.pts.length)
    .map((x) => ({
      lat: x.pts.reduce((n, p) => n + p.lat, 0) / x.pts.length,
      lng: x.pts.reduce((n, p) => n + p.lng, 0) / x.pts.length,
    }));
  const spread =
    centres.length > 1
      ? Math.max(...centres.flatMap((a, i) => centres.slice(i + 1).map((b) => km(a, b))))
      : 40;
  const reach = Math.max(25, Math.min(120, spread * 0.6));

  // The day's own budget: whatever it already was, or MAX_DAY_KM, whichever is
  // larger - so a long day the curator chose is never shortened, and a short
  // one is never quietly turned into a road trip.
  for (const day of days) day.budget = Math.max(MAX_DAY_KM, pathKm(orderPath(day.pts)));

  const touched = new Set();
  for (const p of orphans) {
    let best = null;
    let bestD = Infinity;
    for (const day of days) {
      if (!day.pts.length || day.ids.length >= MAX_PER_DAY) continue;
      const dist = Math.min(...day.pts.map((q) => km(p, q)));
      if (dist >= bestD) continue;
      // Would adding it make the day too long to actually do?
      if (pathKm(orderPath([...day.pts, p])) > day.budget) continue;
      bestD = dist;
      best = day;
    }
    if (best && bestD <= reach) {
      best.ids.push(p.id);
      best.pts.push(p);
      touched.add(best.day);
      assigned++;
    } else leftAlone++;
  }

  for (const day of days) {
    if (!touched.has(day.day)) continue;
    const ordered = orderPath(day.pts).map((p) => p.id);
    edits.push({ dest: d.slug, day: day.day, before: d.itinerary.find((x) => x.day === day.day).placeIds, after: ordered });
  }
}

console.log(`assigned ${assigned} places into existing days (cap ${MAX_PER_DAY}/day)`);
console.log(`left alone (too far, or every nearby day full): ${leftAlone}`);
console.log(`days rewritten: ${edits.length} across ${new Set(edits.map((e) => e.dest)).size} destinations`);

if (!APPLY) {
  console.log('\n(dry run - pass --apply to write)');
  for (const e of edits.slice(0, 5))
    console.log(`  ${e.dest} day ${e.day}: ${e.before.length} -> ${e.after.length}`);
  process.exit(0);
}

let src = readFileSync(FILE, 'utf8');
let written = 0;
for (const e of edits) {
  // Match the exact existing array, single-line or wrapped, and replace it.
  const before = e.before.map((id) => `'${id}'`).join(', ');
  const single = `placeIds: [${before}],`;
  const next = `placeIds: [${e.after.map((id) => `'${id}'`).join(', ')}],`;
  if (src.includes(single)) {
    src = src.replace(single, next);
    written++;
    continue;
  }
  // Wrapped form: placeIds: [\n 'a',\n 'b',\n ],
  const wrapped = new RegExp(
    `placeIds: \\[\\s*${e.before.map((id) => `'${id}',?`).join('\\s*')}\\s*\\],`,
    '',
  );
  if (wrapped.test(src)) {
    src = src.replace(wrapped, next);
    written++;
  } else {
    console.log(`  SKIPPED ${e.dest} day ${e.day} - could not match its existing placeIds`);
  }
}
writeFileSync(FILE, src);
console.log(`\nwrote ${written} of ${edits.length} day edits`);
