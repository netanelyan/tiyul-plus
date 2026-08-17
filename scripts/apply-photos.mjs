// Writing the photos from photo-report.json into src/data/destinations.ts.
// This script deliberately touches no network: all verification was already
// done in fetch-photos.mjs, and this separation is what allows running the
// lookup on a machine with network access and the editing in the
// environment where the repo lives.
//
//   node scripts/apply-photos.mjs                  only status=ok entries
//   node scripts/apply-photos.mjs --include-review also what was flagged for review
//   node scripts/apply-photos.mjs --dry-run        without writing
//
// After the run: npx prettier --write src/data/destinations.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { parsePlaces, DESTINATIONS_FILE } from './lib/parse-places.mjs';

const argv = process.argv.slice(2);
const includeReview = argv.includes('--include-review');
const dryRun = argv.includes('--dry-run');
const REPORT = 'photo-report.json';

const report = JSON.parse(readFileSync(REPORT, 'utf8'));
const wanted = new Set(includeReview ? ['ok', 'review'] : ['ok']);
const entries = (report.results ?? []).filter((r) => wanted.has(r.status) && r.photo);

const { places, lines } = parsePlaces();
const byId = new Map(places.map((p) => [p.id, p]));

const applied = [];
const skipped = [];

for (const entry of entries) {
  const place = byId.get(entry.id);
  if (!place) {
    skipped.push(`${entry.id}: no such place in ${DESTINATIONS_FILE}`);
    continue;
  }
  // Never overwrite an existing photo - a repeat run must be safe
  if (place.hasPhoto) {
    skipped.push(`${entry.id}: already has a photo`);
    continue;
  }
  if (!entry.photo.startsWith('https://upload.wikimedia.org/')) {
    skipped.push(`${entry.id}: photo is not a Wikimedia URL`);
    continue;
  }
  if (entry.photo.includes("'")) {
    skipped.push(`${entry.id}: URL contains a quote`);
    continue;
  }
  applied.push({ entry, place });
}

// Insert bottom-up so the line numbers recorded during parsing stay correct
applied.sort((a, b) => b.place.idLine - a.place.idLine);

for (const { entry, place } of applied) {
  // The same format that already exists in the file: photo: on its own
  // line with the URL beneath it, because Wikimedia URLs are always longer
  // than prettier's printWidth.
  lines.splice(place.idLine + 1, 0, `${place.indent}photo:`, `${place.indent}  '${entry.photo}',`);
}

if (!dryRun && applied.length) {
  writeFileSync(DESTINATIONS_FILE, lines.join('\n'), 'utf8');
}

console.log(`${entries.length} entries in ${REPORT} (${[...wanted].join(' + ')})`);
console.log(`${applied.length} photos ${dryRun ? 'would be' : ''} written`);
if (skipped.length) {
  console.log(`${skipped.length} skipped:`);
  for (const s of skipped.slice(0, 40)) console.log(`  ${s}`);
  if (skipped.length > 40) console.log(`  ...and ${skipped.length - 40} more`);
}
// Deliberately no prettier run here: the repo has no config file, and
// prettier's default is double quotes - running it on the file replaces 22
// thousand lines of single quotes and produces a huge diff that has nothing
// to do with photos. The format written here is already identical to the
// format existing in the file.
