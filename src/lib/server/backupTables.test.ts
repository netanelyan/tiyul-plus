/**
 * The failure this guards against is silent by construction: somebody adds a
 * table in a migration, nobody adds it here, and it is simply **not in any
 * backup** - which is discovered on the day the backup is needed.
 *
 * So the rule is not "back everything up", it is "every table is a decision".
 * A new table fails this test until a human writes down which it is and why.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BACKUP_TABLES, backedUp, findTable } from './backupTables';

const SQL_DIR = join(process.cwd(), 'sql');
const sqlFiles = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql'));
const allSql = sqlFiles.map((f) => readFileSync(join(SQL_DIR, f), 'utf8')).join('\n');

/** Every table the migrations create, in the order they appear. */
function declaredTables(): string[] {
  const found = new Set<string>();
  for (const m of allSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
    found.add(m[1].toLowerCase());
  }
  return [...found].sort();
}

test('כל טבלה שנוצרת ב-SQL מופיעה ברשימת הגיבוי', () => {
  const missing = declaredTables().filter((t) => !findTable(t));
  assert.deepEqual(
    missing,
    [],
    'A table exists in sql/ and nobody decided whether it is backed up.\n' +
      'Add it to BACKUP_TABLES with a keep reason - "skip" is a fine answer, an absent one is not:\n' +
      missing.join('\n'),
  );
});

test('אין ברשימה טבלה שכבר לא קיימת', () => {
  // The other direction: a stale entry means the dump asks PostgREST for a
  // table that is gone, which reads as a broken backup rather than a cleanup
  // nobody finished.
  const declared = new Set(declaredTables());
  const stale = BACKUP_TABLES.map((t) => t.table).filter((t) => !declared.has(t));
  assert.deepEqual(stale, [], `listed for backup but not created anywhere:\n${stale.join('\n')}`);
});

test('לכל טבלה מגובה יש מפתח ראשי, והעמודות שלו באמת קיימות', () => {
  /*
    A restore upserts on these columns. A typo here does not fail loudly - it
    produces an upsert on the wrong key, which either duplicates rows or
    overwrites the wrong ones. Checking the names against the migration is the
    cheapest way to know they are real.
  */
  const problems: string[] = [];
  for (const t of backedUp()) {
    if (t.pk.length === 0) {
      problems.push(`${t.table}: no primary key listed`);
      continue;
    }
    // The create statement for this table, up to the closing paren of its column list
    const start = allSql.search(
      new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${t.table}\\b`, 'i'),
    );
    if (start < 0) {
      problems.push(`${t.table}: no create statement found`);
      continue;
    }
    const body = allSql.slice(start, start + 2500);
    for (const col of t.pk) {
      if (!new RegExp(`\\b${col}\\b`).test(body)) {
        problems.push(`${t.table}: primary key column "${col}" does not appear in its create statement`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('לכל טבלה יש נימוק כתוב - גם ל"לא מגבים"', () => {
  // "skip" is the answer that needs the reasoning most: it is the one that
  // loses data, and the person reading it is mid-incident.
  const thin = BACKUP_TABLES.filter((t) => t.why.trim().length < 40).map((t) => t.table);
  assert.deepEqual(thin, [], `no real reason written for:\n${thin.join('\n')}`);
});

test('הטבלאות שנושאות תוכן של אנשים מגובות', () => {
  /*
    The specific rows whose loss is permanent, pinned by name. A future edit
    that quietly moves one of these to "skip" - to make a dump smaller, say -
    fails here and has to argue with this list instead.
  */
  for (const table of [
    'user_trips',
    'profiles',
    'purchases',
    'shared_trips',
    'admin_audit',
    'promo_redemptions',
    'newsletter_signups',
  ]) {
    assert.equal(findTable(table)?.keep, 'content', `${table} must be backed up as content`);
  }
});
