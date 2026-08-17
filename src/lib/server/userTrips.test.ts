/**
 * `findOwnTrip` is the primitive every money-touching route (`checks/create-order`,
 * `checks/status`, building the pre-departure report) relies on to answer "is this
 * really this user's trip". The test here exists so that cannot regress quietly: not
 * just "whether the answer matches" - but **what is actually sent to Supabase**, because
 * RLS no longer protects this path (adminSelect uses the service role, which bypasses
 * RLS entirely - the isolation between users has to come from the filter the code itself
 * sends).
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

let calls: { url: string }[] = [];
let respond: () => Response = () => new Response('[]', { status: 200 });

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  calls = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push({ url: String(input) });
    return respond();
  }) as typeof fetch;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

const load = () => import('./userTrips.ts?' + Math.random().toString(36).slice(2));

const TRIP = {
  id: 'trip-1',
  name: 'הטיול שלי',
  citySlugs: ['vienna'],
  days: [{ placeIds: ['vie-stephansdom'] }],
};

test('הבקשה ל-Supabase מסננת גם לפי user_id וגם לפי trip id - לא רק trip id', async () => {
  const { findOwnTrip } = await load();
  respond = () => new Response(JSON.stringify([{ data: TRIP }]), { status: 200 });
  await findOwnTrip('user-a', 'trip-1');

  const q = decodeURIComponent(calls[0].url);
  // This is the central claim: the query itself, not just the function, must require
  // both conditions. A query filtering only by trip id would have returned this trip to
  // anyone who guessed or saw its id, regardless of who asked.
  assert.match(q, /user_id=eq\.user-a/);
  assert.match(q, /id=eq\.trip-1/);
});

test('טיול שקיים אבל שייך למשתמש אחר - השורה שחוזרת מ-Supabase (המסוננת כבר) לא נסמכת על user_id שהתקבל', async () => {
  /*
    Given that RLS does not apply here (service role), the only isolation is the filter.
    The previous test verifies that the filter is sent correctly; this one verifies that
    the function does not "fix" an empty answer into a result by itself - i.e. that there
    is no path returning a trip that the filtered query did not actually return.
  */
  const { findOwnTrip } = await load();
  respond = () => new Response('[]', { status: 200 }); // this is how Supabase answers when user_id does not match
  const trip = await findOwnTrip('user-a', 'trip-owned-by-user-b');
  assert.equal(trip, null);
});

test('שורה עם data שלא נראה כמו Trip (למשל תמונת-מצב של מחיקה) לא מוחזרת בטעות', async () => {
  const { findOwnTrip } = await load();
  respond = () => new Response(JSON.stringify([{ data: { id: 'trip-1', deletedAt: 123 } }]), { status: 200 });
  const trip = await findOwnTrip('user-a', 'trip-1');
  assert.equal(trip, null);
});

test('כשל תקשורת/DB לא הופך בשקט לגישה - מחזיר null ולא זורק', async () => {
  const { findOwnTrip } = await load();
  respond = () => new Response('boom', { status: 500 });
  const trip = await findOwnTrip('user-a', 'trip-1');
  assert.equal(trip, null);
});
