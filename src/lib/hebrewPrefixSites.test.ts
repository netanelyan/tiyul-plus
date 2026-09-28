/**
 * Every place a Hebrew prefix letter meets an interpolated name must go through
 * `hePrefix` - guarded as a class, because guarding the instances has already
 * failed once.
 *
 * ## The rule
 *
 * A prefix letter doubles a word-initial vav in unpointed Hebrew. So a template
 * that writes the prefix directly renders Vienna with a single vav after the
 * prefix, where the correct unpointed spelling doubles it. `hePrefix` is the only
 * thing allowed to do it.
 *
 * ## Why a scan and not more unit tests
 *
 * `hePrefix` already had a test running against the real catalog, and it passed
 * throughout - because it tests the FUNCTION, and the bug is a call site that
 * never calls it. The session log records the rule being applied to 14 sites; a
 * later sweep found a 15th (`tripFromTemplate`, which names the trip) still raw,
 * so every trip built from a planner template for Vienna, Venice, Warsaw, Vilnius
 * or Valais carried a misspelled name. Nine user-facing sites were raw in total.
 *
 * Measured impact in the live catalog: **5 destinations, 1 country (Vietnam) and
 * 64 places** start with a single vav. The per-stop menu label alone covered all
 * 64.
 *
 * A wrong number fails a type check; wrong Hebrew fails nothing at all, which is
 * why it needs a scanner.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The prefix letters that attach to a following word. Only these produce the
 * doubling; a bare vav as the conjunction "and" is in the list because it is a
 * prefix letter too.
 */
const PREFIXES = ['ב', 'ל', 'כ', 'מ', 'ו', 'ש', 'ה'];

/**
 * Sites that may keep a raw prefix, each for a stated reason. An allowlist rather
 * than a narrower pattern, so adding one is a decision somebody writes down
 * instead of an accident - the same shape as the caret allowlist in
 * designConsistency.
 */
const ALLOWED = new Map<string, string>([
  /*
    Tool results and disambiguation prompts read by the MODEL, not by a traveller.
    They are instructions ("ids that do not exist in X"), never rendered, and the
    model is not spelling-sensitive. Routing them through hePrefix would be churn
    with no reader.
  */
  ['src/lib/trip/agent.ts', 'tool results addressed to the model, never rendered'],
  ['src/lib/server/placeResolve.ts', 'disambiguation instructions addressed to the model'],
  /*
    Not a name being prefixed: these interpolate a number, a month name that
    already carries its own preposition, or a category word.
  */
  ['src/lib/hebrewCalendar.ts', 'interpolates a day number into a month name, not a prefixed noun'],
  ['src/lib/trip/dayDescription.ts', 'joins two category words with the conjunction, not a place name'],
  ['src/lib/kashrut.ts', 'interpolates a date clause, no name is prefixed'],
  ['src/lib/trip/shabbatPlan.ts', 'model/warning text; the name is not user-prefixed copy'],
  ['src/components/home/Flagships.tsx', 'handles its own digit case explicitly (מסלול ל-4 vs מסלול לרומא)'],
  ['src/lib/reportClientError.ts', 'a random id, no Hebrew involved'],
]);

/** Test fixtures legitimately build the broken form to assert it is broken. */
const isTestFile = (p: string) => /\.test\.tsx?$/.test(p);

function scan(dir: string, out: string[]) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) {
      scan(f, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    const rel = f.replace(/\\/g, '/');
    if (rel.endsWith('src/lib/hebrew.ts')) continue; // the implementation itself
    if (isTestFile(rel)) continue;
    if (ALLOWED.has(rel)) continue;

    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const pre of PREFIXES) {
          if (line.includes(`${pre}\${`)) {
            out.push(`${rel}:${i + 1}`);
            return;
          }
        }
      });
  }
}

test('no Hebrew prefix letter is glued straight onto an interpolated value', () => {
  const offenders: string[] = [];
  scan('src', offenders);
  assert.deepEqual(
    offenders,
    [],
    `${offenders.length} site(s) build a Hebrew prefix by hand instead of calling hePrefix/inHe. ` +
      `A prefix letter doubles a word-initial vav, so Vienna renders "לוינה" instead of "לווינה" ` +
      `(5 destinations, Vietnam and 64 places are affected in the live catalog). ` +
      `Use hePrefix('ל', name) / inHe(name), or add the file to ALLOWED with a reason. ` +
      `Offenders: ${offenders.join(', ')}`,
  );
});

test('the allowlist names only files that exist', () => {
  /*
    An allowlist entry for a deleted or renamed file silently stops guarding
    whatever replaced it - the exemption outlives the reason for it.
  */
  const all: string[] = [];
  const collect = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, e.name).replace(/\\/g, '/');
      if (e.isDirectory()) collect(f);
      else all.push(f);
    }
  };
  collect('src');
  const missing = [...ALLOWED.keys()].filter((p) => !all.includes(p));
  assert.deepEqual(missing, [], `allowlist entries point at files that no longer exist: ${missing.join(', ')}`);
});
