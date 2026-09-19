/**
 * Rewrites the `itinerary` of the destinations named in `itinerary-plan.json`.
 *
 * ## Why this is a script and not eleven hand edits
 *
 * Each replacement is a ~40-line block in a 44,000-line data file, and the ids
 * are typed by hand. A typo produces a day that references a place that does not
 * exist, which the catalog validator would catch - but only after the edit, and
 * only if it is run. This validates every id against the real data BEFORE
 * writing anything, and refuses the whole run on a single bad one.
 *
 * It also emits the file's existing shape exactly (single quotes, the long-note
 * form on its own line) so the diff is only the content, and re-running prettier
 * is unnecessary - which matters, because prettier has no config here and its
 * defaults rewrite every string in the file to double quotes.
 *
 * Usage:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/apply-itineraries.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { destinations } from '../src/data/destinations.ts';

const DRY = process.argv.includes('--dry');
const SRC = 'src/data/destinations.ts';
const PLAN = 'scripts/itinerary-plan.json';
const WIDTH = 100;

const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const problems = [];

/* ---------- validate the whole plan first ---------- */
for (const [slug, days] of Object.entries(plan)) {
  if (slug.startsWith('_')) continue;
  const dest = destinations.find((d) => d.slug === slug);
  if (!dest) {
    problems.push(`${slug}: no such destination`);
    continue;
  }
  const ids = new Set(dest.places.map((p) => p.id));
  for (const [i, day] of days.entries()) {
    if (!day.title?.trim()) problems.push(`${slug} day ${i + 1}: empty title`);
    if (!day.placeIds?.length) problems.push(`${slug} day ${i + 1}: no stops`);
    for (const pid of day.placeIds ?? []) {
      if (!ids.has(pid)) problems.push(`${slug} day ${i + 1}: unknown place id "${pid}"`);
    }
  }
  // A place used twice across days is legitimate (a park visited on two days),
  // but a place used twice in ONE day is a typo.
  for (const [i, day] of days.entries()) {
    const seen = new Set();
    for (const pid of day.placeIds ?? []) {
      if (seen.has(pid)) problems.push(`${slug} day ${i + 1}: "${pid}" twice in one day`);
      seen.add(pid);
    }
  }
}

if (problems.length) {
  console.error(`REFUSING TO WRITE - ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exitCode = 1;
} else {
  /* ---------- emit ---------- */
  const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

  function renderDay(day, n) {
    const lines = ['      {', `        day: ${n},`, `        title: ${q(day.title)},`];
    const inlineIds = `        placeIds: [${day.placeIds.map(q).join(', ')}],`;
    if (inlineIds.length <= WIDTH) {
      lines.push(inlineIds);
    } else {
      lines.push('        placeIds: [');
      for (const pid of day.placeIds) lines.push(`          ${q(pid)},`);
      lines.push('        ],');
    }
    if (day.notes) {
      const inlineNotes = `        notes: ${q(day.notes)},`;
      if (inlineNotes.length <= WIDTH) lines.push(inlineNotes);
      else lines.push('        notes:', `          ${q(day.notes)},`);
    }
    lines.push('      },');
    return lines.join('\n');
  }

  let src = readFileSync(SRC, 'utf8');
  let changed = 0;

  for (const [slug, days] of Object.entries(plan)) {
    if (slug.startsWith('_')) continue;
    const anchor = src.indexOf(`slug: '${slug}'`);
    if (anchor < 0) throw new Error(`${slug}: anchor not found in source`);
    const at = src.indexOf('itinerary:', anchor);
    if (at < 0) throw new Error(`${slug}: itinerary key not found`);
    // Balanced-bracket scan, so a nested array inside a day cannot end it early.
    const open = src.indexOf('[', at);
    let depth = 0;
    let end = open;
    for (; end < src.length; end++) {
      if (src[end] === '[') depth++;
      else if (src[end] === ']') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) throw new Error(`${slug}: unbalanced itinerary array`);

    const body = days.map((day, i) => renderDay(day, i + 1)).join('\n');
    src = `${src.slice(0, open)}[\n${body}\n    ]${src.slice(end + 1)}`;
    changed++;
    const before = destinations.find((d) => d.slug === slug).itinerary.length;
    console.log(`${slug.padEnd(22)} ${before} -> ${days.length} days`);
  }

  if (DRY) {
    console.log(`\n--dry: ${changed} destination(s) would change, nothing written`);
  } else {
    writeFileSync(SRC, src, 'utf8');
    console.log(`\nwrote ${SRC} (${changed} destinations)`);
  }
}
