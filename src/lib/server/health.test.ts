/**
 * The claim: **only a real outage returns a failing status code.**
 *
 * That is the whole contract with an uptime monitor. If a missing optional key
 * reads as "down", the monitor pages somebody for a configuration choice and
 * gets muted within a week; if a dead database reads as "ok", the monitor is
 * decorative. Both directions are asserted here.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { probeDb, statusFrom, runHealth, resetHealthCacheForTest, HEALTH_CACHE_MS } from './health';

const SAVED = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ai: process.env.ANTHROPIC_API_KEY,
  mail: process.env.RESEND_API_KEY,
  hook: process.env.AI_BUDGET_ALERT_WEBHOOK,
};

beforeEach(() => {
  resetHealthCacheForTest();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.ANTHROPIC_API_KEY = 'ai-key';
  process.env.RESEND_API_KEY = 'mail-key';
  process.env.AI_BUDGET_ALERT_WEBHOOK = 'https://hook.example';
});

afterEach(() => {
  for (const [env, value] of [
    ['SUPABASE_URL', SAVED.url],
    ['SUPABASE_SERVICE_ROLE_KEY', SAVED.key],
    ['ANTHROPIC_API_KEY', SAVED.ai],
    ['RESEND_API_KEY', SAVED.mail],
    ['AI_BUDGET_ALERT_WEBHOOK', SAVED.hook],
  ] as const) {
    if (value === undefined) delete process.env[env];
    else process.env[env] = value;
  }
  resetHealthCacheForTest();
});

const respond = (status: number) => (async () => new Response('', { status })) as unknown as typeof fetch;

test('בסיס נתונים שעונה - ok', async () => {
  const r = await probeDb(respond(200));
  assert.equal(r.state, 'ok');
  assert.ok(typeof r.ms === 'number');
});

test('מפתח שגוי הוא לא תקלה - השירות עונה', async () => {
  /*
    A 401 proves PostgREST is alive and answering; it is a configuration
    problem, not an outage. Calling it "down" would wake somebody at three in
    the morning for a wrong key, which is a daytime problem.
  */
  const r = await probeDb(respond(401));
  assert.equal(r.state, 'ok');
});

test('חמש-מאות הוא כן תקלה', async () => {
  assert.equal((await probeDb(respond(503))).state, 'down');
});

test('fetch שנופל הוא תקלה', async () => {
  const boom = (async () => {
    throw new Error('ENOTFOUND');
  }) as unknown as typeof fetch;
  assert.equal((await probeDb(boom)).state, 'down');
});

test('בלי מפתח בכלל - off, לא down', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await probeDb(respond(200));
  assert.equal(r.state, 'off');
});

test('רק בסיס נתונים מת מחזיר down', () => {
  assert.equal(statusFrom({ db: 'down', ai: 'ok', mail: 'ok', alerts: 'ok' }), 'down');
  // Everything optional missing, database fine: degraded, and a monitor gets 200.
  assert.equal(statusFrom({ db: 'ok', ai: 'off', mail: 'off', alerts: 'off' }), 'degraded');
  assert.equal(statusFrom({ db: 'ok', ai: 'ok', mail: 'ok', alerts: 'ok' }), 'ok');
});

test('התוצאה נשמרת במטמון - ניטור כל 30 שניות לא מציף את הבסיס', async () => {
  let calls = 0;
  const counting = (async () => {
    calls += 1;
    return new Response('', { status: 200 });
  }) as unknown as typeof fetch;

  const base = 1_700_000_000_000;
  await runHealth(base, counting);
  await runHealth(base + 1000, counting);
  await runHealth(base + HEALTH_CACHE_MS - 1, counting);
  assert.equal(calls, 1, 'three polls inside the window cost one probe');

  await runHealth(base + HEALTH_CACHE_MS + 1, counting);
  assert.equal(calls, 2, 'and it does refresh once the window passes');
});

test('אין ניסיון לקרוא למודל - בדיקת בריאות לא עולה כסף', async () => {
  /*
    A monitor polling every minute is 43,200 calls a month. At the measured
    $0.06-$0.45 a call that is a four-figure bill for proving a key exists, so
    the AI check reads the environment and never leaves the process.
  */
  const urls: string[] = [];
  const recording = (async (url: string) => {
    urls.push(String(url));
    return new Response('', { status: 200 });
  }) as unknown as typeof fetch;
  await runHealth(1_700_000_000_000, recording);
  assert.equal(urls.length, 1);
  assert.ok(!urls[0].includes('anthropic'), 'the model is never called from here');
});
