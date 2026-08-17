/**
 * Share links - **five claims, all about what must not happen.**
 *
 * The bug this file was born from: a policy named
 * "anyone can read a share link by code" with the condition `using (true)`.
 * The name described an intent, the condition said "every row", and no test
 * saw the gap.
 *
 * 1. A code that is not code-shaped never goes to the network at all.
 * 2. The read is an RPC by code - **not** a `select` on the table.
 * 3. Creating a link without the service role returns null and does not fall back to anon.
 * 4. Creation carries the server key, not the public key.
 * 5. A class guard over the SQL: no unconditional anon policy outside the catalog.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

/** Every request that went out, so we can also make claims about what was NOT sent */
let calls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  calls = [];
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify('PAYLOAD'), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

/** Reloaded in every test because the module reads env through functions, not at module level */
const load = () => import('./shareStore.ts?' + Math.random().toString(36).slice(2));

function configure(opts: { service?: boolean; anon?: boolean }) {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  if (opts.anon) process.env.SUPABASE_ANON_KEY = 'eyJanon';
  else delete process.env.SUPABASE_ANON_KEY;
  if (opts.service) process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/* ---------- 1. A malformed code never goes to the network ---------- */

test('**קוד שאינו בצורת קוד נעצר לפני הרשת**', async () => {
  configure({ anon: true });
  const { getSharedPayload } = await load();
  // Exactly the shapes someone would try in order to get a list instead of a row
  for (const bad of ['', '*', '%', 'a', 'a'.repeat(13), 'abc*defg', '../../x', 'abcdefg,h']) {
    assert.equal(await getSharedPayload(bad), null, `לא נחסם: ${JSON.stringify(bad)}`);
  }
  assert.deepEqual(calls, [], 'אף בקשה לא הייתה אמורה לצאת');
});

/* ---------- 2. An RPC, not a select on the table ---------- */

test('הקריאה היא פונקציה לפי קוד ולא שאילתה על הטבלה', async () => {
  configure({ anon: true });
  const { getSharedPayload } = await load();
  assert.equal(await getSharedPayload('Gua5eKq9'), 'PAYLOAD');

  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.ok(url.endsWith('/rest/v1/rpc/get_shared_trip'), url);
  assert.ok(!url.includes('shared_trips'), 'הטבלה לא אמורה להופיע בכתובת');
  assert.ok(!url.includes('select='), 'אין select - זו בדיוק הצורה שמחזירה רשימה');
  assert.equal(init.method, 'POST');
  assert.deepEqual(JSON.parse(String(init.body)), { p_code: 'Gua5eKq9' });
});

test('תשובה שאינה מחרוזת אינה נחשבת payload', async () => {
  configure({ anon: true });
  const { getSharedPayload } = await load();
  // The function returns a scalar; an array would betray that someone brought back the old shape
  for (const body of ['null', '[]', '[{"payload":"x"}]', '""', '{}']) {
    calls = [];
    globalThis.fetch = (async () =>
      new Response(body, { headers: { 'content-type': 'application/json' } })) as typeof fetch;
    assert.equal(await getSharedPayload('Gua5eKq9'), null, `התקבל payload מ-${body}`);
  }
});

/* ---------- 3+4. Writing: service role only ---------- */

test('**בלי service role אין יצירה, ואין נפילה חזרה ל-anon**', async () => {
  configure({ anon: true });
  const { createShareCode, shareCreateEnabled, shareReadEnabled } = await load();
  assert.equal(shareCreateEnabled(), false);
  assert.equal(shareReadEnabled(), true, 'קישורים קיימים חייבים להמשיך להיפתח');
  assert.equal(await createShareCode('payload'), null);
  assert.deepEqual(calls, [], 'ניסיון כתיבה עם מפתח anon הוא בדיוק הבאג');
});

test('היצירה נושאת את מפתח השרת, ולא את הציבורי', async () => {
  configure({ anon: true, service: true });
  const { createShareCode } = await load();
  const code = await createShareCode('payload');

  assert.ok(code && /^[a-zA-Z0-9]{8}$/.test(code), `קוד לא תקין: ${code}`);
  assert.equal(calls.length, 1);
  const h = calls[0].init.headers as Record<string, string>;
  assert.equal(h.apikey, 'sb_secret_service');
  assert.ok(!Object.values(h).some((v) => v.includes('anon')), 'מפתח anon דלף לבקשה');
  // A non-JWT key is not sent as Bearer - PostgREST rejects that
  assert.equal(h.Authorization, undefined);
  assert.equal(JSON.parse(String(calls[0].init.body)).payload, 'payload');
});

/* ---------- 5. The class guard over the SQL ---------- */

/**
 * The tables for which unconditional public reading is their **intent**: the
 * catalog content the site serves to every visitor. An explicit list, not a
 * heuristic, so that adding a new table is a decision and not an accident.
 */
const PUBLIC_BY_DESIGN = new Set([
  'public.catalog_countries',
  'public.catalog_destinations',
  'public.catalog_places',
]);

test('אין מדיניות anon ללא תנאי מחוץ לטבלאות הקטלוג', () => {
  const root = join(import.meta.dirname, '../../..');
  const offenders: string[] = [];

  for (const file of readdirSync(root).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(join(root, file), 'utf8')
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--')) // Comments describe old bugs
      .join('\n');

    /*
      create policy <name> on <table> for <cmd> to <roles> using/with check (true)
      The `\s+` is what lets the match cross lines, so the `s` flag is not
      needed (it is also unavailable in the project's TS target) - there is no
      `.` here at all.
    */
    const re =
      /create\s+policy\s+(?:"[^"]+"|\S+)\s+on\s+(\S+)\s+for\s+(\w+)\s+to\s+([\w\s,]+?)\s+(using|with\s+check)\s*\(\s*true\s*\)/gi;
    for (const m of sql.matchAll(re)) {
      const [, table, cmd, roles] = m;
      const anon = /\banon\b|\bpublic\b/i.test(roles);
      if (!anon) continue;
      if (cmd.toLowerCase() === 'select' && PUBLIC_BY_DESIGN.has(table.toLowerCase())) continue;
      offenders.push(`${file}: ${cmd.toUpperCase()} on ${table} to ${roles.trim()} → (true)`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'מדיניות ללא תנאי היא "כל השורות", ולא משנה איך היא נקראת:\n' + offenders.join('\n'),
  );
});

test('קובץ ההקמה לא מחזיר את המדיניות שהוסרה', () => {
  const root = join(import.meta.dirname, '../../..');
  const setup = readFileSync(join(root, 'supabase-setup.sql'), 'utf8');
  // The function is the only way to read, so it must be there
  assert.match(setup, /create or replace function public\.get_shared_trip/);
  assert.match(setup, /revoke all on public\.shared_trips from anon, authenticated/);
  // Postgres's default gives execute to public; without the revoke the explicit
  // grant adds nothing and the function is open to every future role
  assert.ok(
    setup.indexOf('revoke all on function public.get_shared_trip') <
      setup.indexOf('grant execute on function public.get_shared_trip'),
    'ה-revoke חייב לקדום ל-grant',
  );
});
