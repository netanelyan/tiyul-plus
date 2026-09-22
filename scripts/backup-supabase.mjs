/**
 * A backup you hold, of the rows that cannot be recomputed.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/backup-supabase.mjs [--out backups] [--only user_trips,profiles]
 *
 * or, with the values already in `.env.local`:  npm run backup
 *
 * ## What this is and is not
 *
 * It is not a replacement for Supabase's own backups - those restore the whole
 * database including `auth.users`, the functions and the RLS policies, and
 * they are the right answer to "the project is gone". Read
 * `IDENTITY_EXPORT_NOTE` in `backupTables.ts` before assuming otherwise.
 *
 * It is the answer to the much more likely incident: one table wrong, one
 * migration that did more than it meant to, one row deleted in the dashboard.
 * For that, rolling the entire project back to last night is a cure worse than
 * the disease, and a readable JSON file you can diff is exactly right.
 *
 * ## Properties worth knowing
 *
 * - **Read-only.** There is no write path in this file at all.
 * - **Paged**, so a table larger than PostgREST's row ceiling is not silently
 *   truncated - the single most dangerous way for a backup to be wrong.
 * - **Verified by count.** After paging, the row total is compared against the
 *   server's own `Content-Range` count. A mismatch fails the run rather than
 *   writing a file that looks complete.
 * - **A manifest** goes in the dump, so a restore can refuse a file it does
 *   not understand rather than guessing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { backedUp, findTable, IDENTITY_EXPORT_NOTE } from '../src/lib/server/backupTables.ts';

const PAGE = 1000;

/** Load .env.local so the usual local run needs no exported variables. */
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
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const URL_BASE = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_DIR = flag('out', 'backups');
const ONLY = flag('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!URL_BASE || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

/*
  The service role is not always a JWT - an `sb_secret_` key is not - and this
  file's sibling `supabaseAdmin.ts` carries the scar from sending `Bearer`
  unconditionally: every write was rejected and the counters read zero while
  calls were really being made. Both headers, as it does.
*/
const headers = (extra = {}) => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  ...extra,
});

async function fetchPage(table, offset, order) {
  const params = new URLSearchParams({ select: '*' });
  if (order) params.set('order', order);
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?${params}`, {
    headers: headers({
      Range: `${offset}-${offset + PAGE - 1}`,
      'Range-Unit': 'items',
      Prefer: 'count=exact',
    }),
  });
  if (!res.ok) {
    throw new Error(`${table}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  // "0-999/12345" - the part after the slash is the server's own total.
  const range = res.headers.get('content-range') ?? '';
  const total = Number(range.split('/')[1]);
  return { rows: await res.json(), total: Number.isFinite(total) ? total : null };
}

async function dumpTable(spec) {
  const rows = [];
  let total = null;
  for (let offset = 0; ; offset += PAGE) {
    const page = await fetchPage(spec.table, offset, spec.order);
    if (total === null) total = page.total;
    rows.push(...page.rows);
    if (page.rows.length < PAGE) break;
    /*
      A table that keeps returning full pages past its own reported total means
      the ordering is unstable and rows are being repeated or skipped. Stopping
      is better than writing a dump nobody can trust.
    */
    if (total !== null && rows.length > total + PAGE) {
      throw new Error(`${spec.table}: paging overran the reported total (${total})`);
    }
  }
  if (total !== null && rows.length !== total) {
    throw new Error(
      `${spec.table}: read ${rows.length} rows but the server reports ${total}. ` +
        'Refusing to write an incomplete dump.',
    );
  }
  return rows;
}

/**
 * Accounts, for reference only. See IDENTITY_EXPORT_NOTE - this cannot restore
 * them, and the dump says so in its own manifest so nobody discovers it during
 * an incident.
 */
async function dumpIdentities() {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: headers(),
    });
    if (!res.ok) return { rows: out, error: `HTTP ${res.status}` };
    const data = await res.json();
    const users = Array.isArray(data) ? data : (data.users ?? []);
    if (users.length === 0) break;
    // Deliberately three fields. A backup is not a place to accumulate more
    // personal data than the thing it is protecting.
    out.push(...users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })));
    if (users.length < 200) break;
  }
  return { rows: out };
}

const specs = backedUp().filter((t) => ONLY.length === 0 || ONLY.includes(t.table));
const unknown = ONLY.filter((t) => !findTable(t));
if (unknown.length) {
  console.error(`unknown table(s): ${unknown.join(', ')}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const tables = {};
const counts = {};
let failed = 0;

for (const spec of specs) {
  try {
    const rows = await dumpTable(spec);
    tables[spec.table] = rows;
    counts[spec.table] = rows.length;
    console.log(`${spec.table.padEnd(26)} ${String(rows.length).padStart(7)} rows`);
  } catch (err) {
    failed += 1;
    console.error(`${spec.table.padEnd(26)} FAILED: ${err.message}`);
  }
}

const identities = await dumpIdentities();
console.log(`${'auth.users (reference)'.padEnd(26)} ${String(identities.rows.length).padStart(7)} rows`);

mkdirSync(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, `tiyul-backup-${stamp}.json`);
writeFileSync(
  file,
  JSON.stringify(
    {
      manifest: {
        format: 1,
        takenAt: new Date().toISOString(),
        source: URL_BASE,
        counts,
        identityCount: identities.rows.length,
        identityNote: IDENTITY_EXPORT_NOTE,
        partial: failed > 0 || ONLY.length > 0,
      },
      tables,
      identities: identities.rows,
    },
    null,
    1,
  ),
);

console.log(`\nwrote ${file}`);
if (failed > 0) {
  // A partial backup is worth keeping and must not look like a clean one.
  console.error(`${failed} table(s) failed - this dump is INCOMPLETE.`);
  process.exit(2);
}
