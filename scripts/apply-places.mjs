// Appends verified places (the output of research-places.mjs) to their
// destinations in src/data/destinations.ts, in the file's exact house style,
// so no formatter pass is needed afterwards (running prettier on this file
// without --single-quote rewrites 13,000 lines - see the 2026-07-26 (d) note).
//
// Refuses to write when: the destination block or its `places: [` cannot be
// found unambiguously, the id already exists anywhere in the file, or the
// candidate lacks any of the required fields. All-or-nothing per run.
//
// Run: node scripts/apply-places.mjs out.verified.json
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/data/destinations.ts';
const [, , inFile] = process.argv;
if (!inFile) {
  console.error('usage: apply-places.mjs verified.json');
  process.exit(2);
}
const places = JSON.parse(readFileSync(inFile, 'utf8'));
let src = readFileSync(FILE, 'utf8');
// The file is checked out with CRLF on Windows; match and write whatever it uses.
const EOL = src.includes('\r\n') ? '\r\n' : '\n';

const REQUIRED = [
  'dest',
  'id',
  'name',
  'nameLocal',
  'category',
  'lat',
  'lng',
  'description',
  'tags',
  'priceLevel',
  'durationMin',
];

/** House style: single quotes unless the string holds one and no double quote. */
function q(s) {
  const str = String(s);
  if (str.includes("'") && !str.includes('"')) return `"${str}"`;
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function entry(p) {
  const lines = [];
  lines.push(`      {`);
  lines.push(`        id: ${q(p.id)},`);
  if (p.photo) {
    lines.push(`        photo:`);
    lines.push(`          ${q(p.photo)},`);
  }
  lines.push(`        tags: [${p.tags.map(q).join(', ')}],`);
  lines.push(`        priceLevel: ${p.priceLevel},`);
  if (p.mustSee) lines.push(`        mustSee: true,`);
  lines.push(`        name: ${q(p.name)},`);
  lines.push(`        nameLocal: ${q(p.nameLocal)},`);
  lines.push(`        category: ${q(p.category)},`);
  lines.push(`        lat: ${p.lat},`);
  lines.push(`        lng: ${p.lng},`);
  lines.push(`        description:`);
  lines.push(`          ${q(p.description)},`);
  if (p.rating !== undefined) lines.push(`        rating: ${p.rating},`);
  lines.push(`        durationMin: ${p.durationMin},`);
  // Coordinates, never a name: the name form resolved "Cartagena" to Spain.
  lines.push(`        externalUrl: ${q(`https://maps.google.com/?q=${p.lat},${p.lng}`)},`);
  lines.push(`      },`);
  return lines.join(EOL);
}

// Group by destination, validate first, write second.
const byDest = new Map();
for (const p of places) {
  for (const k of REQUIRED)
    if (p[k] === undefined || p[k] === null || p[k] === '')
      throw new Error(`${p.dest}/${p.id}: missing ${k}`);
  if (src.includes(`id: '${p.id}'`)) throw new Error(`${p.id}: id already in the file`);
  if (!byDest.has(p.dest)) byDest.set(p.dest, []);
  byDest.get(p.dest).push(p);
}

let added = 0;
for (const [dest, list] of byDest) {
  const slugLine = `    slug: '${dest}',${EOL}`;
  const start = src.indexOf(slugLine);
  if (start < 0) throw new Error(`${dest}: destination block not found`);
  if (src.indexOf(slugLine, start + 1) >= 0) throw new Error(`${dest}: slug line is not unique`);
  // The destination's `places: [` is the first one after its slug line.
  const placesIdx = src.indexOf(`${EOL}    places: [${EOL}`, start);
  if (placesIdx < 0) throw new Error(`${dest}: places array not found`);
  // The array closes at the first "]," at 4-space indentation after it.
  const closeIdx = src.indexOf(`${EOL}    ],${EOL}`, placesIdx);
  if (closeIdx < 0) throw new Error(`${dest}: places array close not found`);
  // Guard: the close we found must belong to this destination, i.e. come
  // before the next destination's slug line.
  const nextSlug = src.indexOf(`${EOL}    slug: `, placesIdx);
  if (nextSlug >= 0 && nextSlug < closeIdx)
    throw new Error(`${dest}: places close is past the next destination`);
  const block = list.map(entry).join(EOL);
  src = src.slice(0, closeIdx + EOL.length) + block + EOL + src.slice(closeIdx + EOL.length);
  added += list.length;
  console.log(`${dest}: +${list.length}`);
}
writeFileSync(FILE, src);
console.log(`added ${added} places`);
