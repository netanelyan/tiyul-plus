// Offline validator for the curated catalog (src/data/*).
//
// Why this exists: the catalog is the product's moat and it is edited by hand,
// so the failure mode is not a crash but a page that renders happily with a
// pin in the wrong country, a photo the project has no licence to hotlink, or
// an itinerary that references a place id that no longer exists. tsc cannot
// see any of that. This script can, and it needs no network, which matters
// because the authoring sandbox has no outbound egress.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs
// Exit code is 1 if any ERROR is reported. WARN never fails the run.
//
// Deliberately NOT checked, because these are conventions and not defects:
//   * externalUrl using ?q=Name+Of+Place instead of ?q=lat,lng - both work,
//     and the name form often lands on a nicer Google Maps card.
//   * places that no day of the itinerary references - the places list is
//     meant to be broader than the suggested route.

import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// Wikimedia only serves these thumbnail widths for us, and only /commons/
// files are freely licensed. /wikipedia/en/ files are local uploads that are
// usually non-free, so hotlinking them is a licensing problem, not a style one.
const ALLOWED_WIDTHS = [250, 330, 500, 960];
const PHOTO_HOSTS = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/',
  'https://images.unsplash.com/',
];

const countrySlugs = new Set(countries.map((c) => c.slug));
const seenDestSlug = new Set();
const placeOwner = new Map();

for (const d of destinations) {
  if (seenDestSlug.has(d.slug)) err(`duplicate destination slug: ${d.slug}`);
  seenDestSlug.add(d.slug);

  if (!countrySlugs.has(d.countrySlug))
    err(`${d.slug}: countrySlug "${d.countrySlug}" has no matching country`);

  if (d.editorialRating) {
    const s = d.editorialRating.score;
    if (!(s >= 1 && s <= 5))
      err(`${d.slug}: editorialRating.score ${s} is outside 1-5 (the UI renders it as "/5")`);
  }

  // The destination-level hero and the iconic-landmark card are hotlinked the
  // same way place photos are, so they carry the same licensing and width
  // constraints. They were unchecked until every photoless destination got one.
  for (const [what, url] of [
    ['photo', d.photo],
    ['iconicLandmark.photo', d.iconicLandmark?.photo],
  ]) {
    if (!url) continue;
    if (!PHOTO_HOSTS.some((h) => url.startsWith(h)))
      err(`${d.slug}: ${what} is not a freely licensed source -> ${url}`);
    const w = url.match(/\/(\d+)px-/);
    if (w && !ALLOWED_WIDTHS.includes(+w[1]))
      err(`${d.slug}: ${what} width ${w[1]} is not one of ${ALLOWED_WIDTHS.join('/')}`);
  }

  const ids = new Set();
  for (const p of d.places) {
    const where = `${d.slug}/${p.id}`;

    if (ids.has(p.id)) err(`${where}: duplicate place id inside the destination`);
    ids.add(p.id);
    if (placeOwner.has(p.id) && placeOwner.get(p.id) !== d.slug)
      err(`place id ${p.id} is used by both ${placeOwner.get(p.id)} and ${d.slug}`);
    placeOwner.set(p.id, d.slug);

    if (!(Math.abs(p.lat) <= 90) || !(Math.abs(p.lng) <= 180))
      err(`${where}: coordinates out of range (${p.lat}, ${p.lng})`);

    // A coordinate that is whole degrees on both axes was never a real
    // published value - it is a rounded placeholder, and one degree is
    // roughly 111km. The project rule is to drop the place rather than ship
    // a pin that confident and that wrong.
    if (Number.isInteger(p.lat) && Number.isInteger(p.lng))
      err(`${where}: whole-degree coordinates (${p.lat}, ${p.lng}) - placeholder, not a real fix`);

    // A place more than ~3 degrees from its destination centre is either
    // mis-typed or belongs to a different destination. Wide regional
    // destinations legitimately trip this, hence WARN and not ERROR.
    if (Math.abs(p.lat - d.center.lat) > 3 || Math.abs(p.lng - d.center.lng) > 3)
      warn(
        `${where}: ${p.lat},${p.lng} is far from the destination centre ${d.center.lat},${d.center.lng}`,
      );

    if (p.externalUrl) {
      const m = p.externalUrl.match(/[?&]q=(-?[\d.]+),(-?[\d.]+)(?:&|$)/);
      if (m && (Math.abs(+m[1] - p.lat) > 0.0005 || Math.abs(+m[2] - p.lng) > 0.0005))
        err(`${where}: externalUrl points at ${m[1]},${m[2]} but the place is at ${p.lat},${p.lng}`);
    }

    if (p.photo) {
      if (!PHOTO_HOSTS.some((h) => p.photo.startsWith(h)))
        err(`${where}: photo is not a freely licensed source -> ${p.photo}`);
      const w = p.photo.match(/\/(\d+)px-/);
      if (w && !ALLOWED_WIDTHS.includes(+w[1]))
        err(`${where}: photo width ${w[1]} is not one of ${ALLOWED_WIDTHS.join('/')}`);
    }

    if (p.rating !== undefined && !(p.rating >= 0 && p.rating <= 5))
      err(`${where}: rating ${p.rating} is outside 0-5`);
  }

  const days = d.itinerary.map((x) => x.day);
  if (days.some((v, i) => v !== i + 1))
    err(`${d.slug}: itinerary days are ${days.join(',')} - expected 1..${days.length}`);

  for (const day of d.itinerary)
    for (const pid of day.placeIds)
      if (!ids.has(pid)) err(`${d.slug} day ${day.day}: references missing place id "${pid}"`);
}

const places = destinations.reduce((n, d) => n + d.places.length, 0);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(
  `\n${destinations.length} destinations, ${countries.length} countries, ${places} places` +
    ` - ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
