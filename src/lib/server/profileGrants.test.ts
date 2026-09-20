/**
 * Every column of `profiles` is either writable by its owner or deliberately not.
 *
 * ## The failure this exists to stop, which already happened once
 *
 * `profiles` does not rely on RLS alone. `supabase-premium.sql` and
 * `supabase-admin.sql` both REVOKE table-level insert/update from
 * `authenticated` and then grant them **column by column**, so that nobody can
 * write `role`, `plan` or `stripe_customer_id` to themselves.
 *
 * Postgres does not extend a column-level grant to a column added later. So a
 * migration that adds a user-facing column and forgets the grant produces a
 * column that is writable by nobody - and the symptom is silence, not an error:
 * `supabase-consent.sql` added `terms_accepted_at`, the migration ran cleanly,
 * the column appeared, and consent was still never recorded, because
 * `recordTermsAcceptance` returns false on the permission error and its caller
 * ignores the result on purpose so that an unmigrated database can never block
 * a login.
 *
 * Reading the SQL is the only place this is visible, so that is what is checked.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SQL_DIR = 'sql';

/**
 * Columns a signed-in user must NOT be able to write, each with the reason.
 * Everything else added to `profiles` has to be granted, or it is dead.
 */
const NOT_USER_WRITABLE: Record<string, string> = {
  role: 'privilege escalation - only the service role may set it',
  plan: 'billing state - written by the verified PayPal webhook',
  plan_until: 'billing state - the expiry of a grant',
  plan_source: 'billing state - how the plan was obtained',
  stripe_customer_id: 'billing identity',
  paypal_subscription_id: 'billing identity, kept for support',
};

function sqlFiles(): string[] {
  return readdirSync(SQL_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(SQL_DIR, f), 'utf8'));
}

/** Strip line comments so a column named inside prose is never counted. */
const code = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');

function columnsAddedToProfiles(): Set<string> {
  const out = new Set<string>();
  for (const raw of sqlFiles()) {
    const sql = code(raw);
    // Each `alter table public.profiles ... ;` statement, which may add several.
    for (const stmt of sql.matchAll(/alter\s+table\s+public\.profiles\b([\s\S]*?);/gi)) {
      for (const col of stmt[1].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_]+)/gi)) {
        out.add(col[1].toLowerCase());
      }
    }
  }
  return out;
}

function columnsGrantedOnProfiles(kind: 'insert' | 'update'): Set<string> {
  const out = new Set<string>();
  for (const raw of sqlFiles()) {
    const sql = code(raw);
    const re = new RegExp(`grant\\s+${kind}\\s*\\(([^)]*)\\)[\\s\\S]*?on\\s+table\\s+public\\.profiles`, 'gi');
    for (const m of sql.matchAll(re)) {
      for (const c of m[1].split(',')) out.add(c.trim().toLowerCase());
    }
  }
  return out;
}

test('the fixture finds something - otherwise this test proves nothing', () => {
  const added = columnsAddedToProfiles();
  assert.ok(added.size >= 6, `only ${added.size} added columns parsed out of the SQL`);
  assert.ok(columnsGrantedOnProfiles('update').size >= 5, 'no update grants parsed');
});

test('every column added to profiles is granted, or explicitly not user-writable', () => {
  const added = columnsAddedToProfiles();
  const canUpdate = columnsGrantedOnProfiles('update');
  const missing = [...added].filter((c) => !canUpdate.has(c) && !(c in NOT_USER_WRITABLE));
  assert.deepEqual(
    missing,
    [],
    `added to profiles but writable by nobody: ${missing.join(', ')} - either grant them ` +
      `(grant insert/update (col) on table public.profiles to authenticated) or add them to ` +
      `NOT_USER_WRITABLE with the reason`,
  );
});

test('a column granted for update is granted for insert too', () => {
  /*
    The write path is an upsert. If a column can be updated but not inserted, the
    very first write for an account fails while every later one succeeds - which
    is worse than failing consistently, because it only shows up for new users.
  */
  const canInsert = columnsGrantedOnProfiles('insert');
  const canUpdate = columnsGrantedOnProfiles('update');
  const updateOnly = [...canUpdate].filter((c) => !canInsert.has(c));
  assert.deepEqual(updateOnly, [], `updatable but not insertable: ${updateOnly.join(', ')}`);
});

test('the privilege columns are never granted to a signed-in user', () => {
  // The other direction, and the more serious one: a grant added by accident
  // here is privilege escalation, not a dead column.
  const canUpdate = columnsGrantedOnProfiles('update');
  const canInsert = columnsGrantedOnProfiles('insert');
  for (const col of Object.keys(NOT_USER_WRITABLE)) {
    assert.ok(!canUpdate.has(col), `${col} is update-grantable to authenticated - ${NOT_USER_WRITABLE[col]}`);
    assert.ok(!canInsert.has(col), `${col} is insert-grantable to authenticated - ${NOT_USER_WRITABLE[col]}`);
  }
});

test('consent specifically is writable - the bug that prompted all of this', () => {
  const canUpdate = columnsGrantedOnProfiles('update');
  const canInsert = columnsGrantedOnProfiles('insert');
  for (const col of ['terms_accepted_at', 'terms_version']) {
    assert.ok(canUpdate.has(col), `${col} cannot be updated by its owner`);
    assert.ok(canInsert.has(col), `${col} cannot be inserted by its owner`);
  }
});
