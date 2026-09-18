// Appends itinerary days to destinations in src/data/destinations.ts, in the
// file's house style. Input: JSON array of { dest, title, placeIds, notes }.
// Day numbers are assigned from the existing count, and every placeId must
// exist in that destination - a day that references a place the destination
// does not hold is exactly what validate-catalog exists to catch, and it is
// cheaper to refuse here.
//
// Run: node scripts/apply-days.mjs days.json
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/data/destinations.ts';
const [, , inFile] = process.argv;
if (!inFile) {
  console.error('usage: apply-days.mjs days.json');
  process.exit(2);
}
const days = JSON.parse(readFileSync(inFile, 'utf8'));
let src = readFileSync(FILE, 'utf8');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';

function q(s) {
  const str = String(s);
  if (str.includes("'") && !str.includes('"')) return `"${str}"`;
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const byDest = new Map();
for (const d of days) {
  if (!d.dest || !d.title || !Array.isArray(d.placeIds) || !d.placeIds.length || !d.notes)
    throw new Error(`${d.dest}: day is missing a field`);
  if (!byDest.has(d.dest)) byDest.set(d.dest, []);
  byDest.get(d.dest).push(d);
}

let added = 0;
for (const [dest, list] of byDest) {
  const slugLine = `    slug: '${dest}',${EOL}`;
  const start = src.indexOf(slugLine);
  if (start < 0) throw new Error(`${dest}: destination not found`);
  const nextSlug = src.indexOf(`${EOL}    slug: '`, start + slugLine.length);
  const blockEnd = nextSlug < 0 ? src.length : nextSlug;
  const block = src.slice(start, blockEnd);

  // Every placeId must be a place of THIS destination.
  const ids = new Set([...block.matchAll(/^        id: '([^']+)',/gm)].map((m) => m[1]));
  for (const d of list)
    for (const id of d.placeIds)
      if (!ids.has(id)) throw new Error(`${dest}: placeId ${id} is not a place of this destination`);

  const itinIdx = src.indexOf(`${EOL}    itinerary: [${EOL}`, start);
  if (itinIdx < 0 || itinIdx > blockEnd) throw new Error(`${dest}: itinerary not found`);
  const closeIdx = src.indexOf(`${EOL}    ],${EOL}`, itinIdx);
  if (closeIdx < 0 || closeIdx > blockEnd) throw new Error(`${dest}: itinerary close not found`);
  const existing = (src.slice(itinIdx, closeIdx).match(/^        day: \d+,/gm) ?? []).length;

  const entries = list.map((d, i) =>
    [
      `      {`,
      `        day: ${existing + i + 1},`,
      `        title: ${q(d.title)},`,
      `        placeIds: [${d.placeIds.map(q).join(', ')}],`,
      `        notes:`,
      `          ${q(d.notes)},`,
      `      },`,
    ].join(EOL),
  );
  src = src.slice(0, closeIdx + EOL.length) + entries.join(EOL) + EOL + src.slice(closeIdx + EOL.length);
  added += list.length;
  console.log(`${dest}: days ${existing + 1}..${existing + list.length}`);
}
writeFileSync(FILE, src);
console.log(`added ${added} days`);
