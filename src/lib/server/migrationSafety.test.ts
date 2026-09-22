/**
 * **What makes "roll back the deploy" a real answer.**
 *
 * Vercel keeps every previous build and can promote one in about thirty
 * seconds. That is only a recovery if the older code still fits the database
 * it finds - and the database does not roll back with it. So the property that
 * has to hold is not about Vercel at all:
 *
 *   **every migration is additive.**
 *
 * Add a table, add a column, add an index, replace a function: yesterday's
 * build never looked at the new thing and carries on. Drop a column or change
 * its type and yesterday's build starts selecting something that is no longer
 * there - so the rollback, the one move you make while the site is broken,
 * breaks it a second way.
 *
 * This is the kind of rule that is followed by habit until the week somebody
 * is tidying up. So it is a test.
 *
 * `drop policy` / `drop function` / `drop index` are fine and are deliberately
 * not caught: all three are the idempotent "drop then recreate" that every
 * file here uses to stay re-runnable, and none of them removes data or a
 * column that code reads.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL_DIR = join(process.cwd(), 'sql');

/**
 * The one file allowed to be destructive, and why.
 *
 * Retiring the trip-story feature had to drop its table eventually, and that
 * file is deliberately NOT part of any setup path: nothing runs it, it is not
 * in `supabase-check.sql`, and its own header says it is Netanel's choice to
 * run. It is a decision written down, not a migration.
 */
const ALLOWED_DESTRUCTIVE = new Set(['supabase-retire-stories.sql']);

/** Comment lines and block comments are not statements. */
function stripSqlComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');
}

const files = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql'));

test('אף מיגרציה לא מוחקת טבלה או עמודה - זה מה שהופך rollback לבטוח', () => {
  const hits: string[] = [];
  for (const file of files) {
    if (ALLOWED_DESTRUCTIVE.has(file)) continue;
    const src = stripSqlComments(readFileSync(join(SQL_DIR, file), 'utf8'));
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      const l = line.toLowerCase();
      /*
        A constraint drop is allowed and is done twice in this repo, both times
        to WIDEN a check (adding 'pro' to the plan sources, adding a purchase
        source). Widening a check never invalidates existing rows and never
        removes a column, so the older build is unaffected.
      */
      if (/\bdrop\s+constraint\b/.test(l)) return;
      if (/\bdrop\s+(table|column|schema|database)\b/.test(l)) {
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
      }
      if (/\balter\s+column\b[\s\S]*\btype\b/.test(l)) {
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
      }
      if (/\brename\s+(column|to)\b/.test(l)) {
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
      }
      if (/^\s*(truncate|delete\s+from)\b/.test(l)) {
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(
    hits,
    [],
    'A migration is destructive, which means a Vercel rollback is no longer safe:\n' +
      hits.join('\n') +
      '\n\nIf the removal is genuinely wanted, put it in its own opt-in file the way ' +
      'sql/supabase-retire-stories.sql is, add that file to ALLOWED_DESTRUCTIVE, and ' +
      'ship the code that stops reading the column at least one deploy earlier.',
  );
});

test('המיגרציות ניתנות להרצה חוזרת - זו הדרך היחידה להריץ אותן בבטחה', () => {
  /*
    Every file here is run by hand, in a SQL editor, by somebody who cannot
    always remember whether they already ran it. A file that fails the second
    time trains you to skip it, and the one you skip is the one that was only
    half applied.
  */
  const problems: string[] = [];
  for (const file of files) {
    const src = stripSqlComments(readFileSync(join(SQL_DIR, file), 'utf8'));
    for (const m of src.matchAll(/create\s+table\s+(?!if\s+not\s+exists)/gi)) {
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(`${file}:${line}: create table without "if not exists"`);
    }
    for (const m of src.matchAll(/^\s*create\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists|concurrently)/gim)) {
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(`${file}:${line}: create index without "if not exists"`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('יש קובץ שבודק מה כבר רץ', () => {
  // The question "which of these have I run?" has cost a round trip before,
  // and supabase-check.sql is the answer. Its absence would be a real loss.
  assert.ok(files.includes('supabase-check.sql'));
});
