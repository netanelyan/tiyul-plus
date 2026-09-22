/**
 * Puts rows back from a dump written by `backup-supabase.mjs`.
 *
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/restore-supabase.mjs backups/tiyul-backup-....json [--only user_trips] [--confirm]
 *
 * ## A backup nobody has restored is not a backup
 *
 * That is the whole reason this file exists rather than a paragraph saying
 * "the JSON is there, write something when you need it". The moment you need
 * it is the worst possible moment to be writing an upsert loop against a
 * schema you are re-learning under pressure.
 *
 * ## Three properties, and each one is a refusal
 *
 * 1. **A dry run by default.** Without `--confirm` nothing is written at all;
 *    it prints what it would send, per table. The dangerous direction here is
 *    a mistyped command, not a missing feature.
 * 2. **Upsert only. There is no delete in this file.** A restore can therefore
 *    only ever put rows back or overwrite them with the backed-up version - it
 *    can never make the database emptier than it found it. That rules out the
 *    worst outcome by construction: a restore run against the wrong (healthy)
 *    project cannot destroy it.
 * 3. **It reads the manifest first** and refuses a file it does not
 *    understand, or a table not in the backup list.
 *
 * The cost of (2), stated plainly: a restore does **not** remove rows created
 * after the backup, so it repairs and merges rather than rewinding. Rewinding
 * is what Supabase's own point-in-time restore is for.
 */
import { readFileSync, existsSync } from 'node:fs';
import { findTable } from '../src/lib/server/backupTables.ts';

const BATCH = 500;

function loadEnv() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = line.slice(i + 1).trim();
  }
}
loadEnv();

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const confirm = args.includes('--confirm');
const onlyIdx = args.indexOf('--only');
const ONLY =
  onlyIdx >= 0 && args[onlyIdx + 1]
    ? args[onlyIdx + 1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

if (!file) {
  console.error('usage: restore-supabase.mjs <dump.json> [--only table1,table2] [--confirm]');
  process.exit(1);
}

const URL_BASE = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const dump = JSON.parse(readFileSync(file, 'utf8'));
if (dump?.manifest?.format !== 1) {
  console.error('not a tiyul+ backup, or a newer format than this script understands.');
  process.exit(1);
}

console.log(`dump taken ${dump.manifest.takenAt} from ${dump.manifest.source}`);
if (dump.manifest.source !== URL_BASE) {
  // Not fatal - restoring into a staging project is a legitimate thing to do,
  // and it is exactly how a restore gets rehearsed. But it must be said out
  // loud, because the other reason it happens is a wrong environment.
  console.warn(`WARNING: restoring into a DIFFERENT project than the dump came from.`);
  console.warn(`  dump: ${dump.manifest.source}`);
  console.warn(`  here: ${URL_BASE}`);
}
if (dump.manifest.partial) console.warn('WARNING: this dump is marked partial.');
if (!confirm) console.log('\n--- DRY RUN. Nothing will be written. Add --confirm to apply. ---\n');

const headers = (extra = {}) => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

let wrote = 0;
let failed = 0;

for (const [table, rows] of Object.entries(dump.tables ?? {})) {
  if (ONLY.length && !ONLY.includes(table)) continue;
  const spec = findTable(table);
  if (!spec) {
    console.error(`${table}: not in the backup list - skipped rather than guessed at.`);
    failed += 1;
    continue;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`${table.padEnd(26)} nothing to restore`);
    continue;
  }

  if (!confirm) {
    console.log(`${table.padEnd(26)} would upsert ${String(rows.length).padStart(7)} rows on (${spec.pk.join(', ')})`);
    continue;
  }

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?on_conflict=${spec.pk.join(',')}`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error(`${table}: batch at ${i} failed HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      failed += 1;
      break;
    }
    done += batch.length;
  }
  wrote += done;
  console.log(`${table.padEnd(26)} upserted ${String(done).padStart(7)} of ${rows.length}`);
}

if (dump.identities?.length) {
  console.log(`\n${dump.identities.length} account(s) are in this dump for reference only.`);
  console.log(dump.manifest.identityNote);
}

if (!confirm) {
  console.log('\nDry run finished. Nothing was written.');
} else {
  console.log(`\nupserted ${wrote} rows; ${failed} table(s) failed.`);
}
if (failed > 0) process.exit(2);
