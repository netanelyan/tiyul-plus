import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The group trip's logic against a Supabase mock - joining, expiry, voting on a real stop only, and
 * the vote tally.
 */

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

const OWNER = 'c80e1062-403d-4bde-87d1-095cf40a6462';
const MEMBER = 'a11e1062-403d-4bde-87d1-095cf40a6462';

let invites: { code: string; owner_id: string; trip_id: string; expires_at: string; created_at: string }[];
let members: { owner_id: string; trip_id: string; member_id: string }[];
let votes: { owner_id: string; trip_id: string; member_id: string; place_id: string; vote: number }[];
let ownerTrip: unknown;

function tableOf(url: string): string | null {
  const m = url.match(/\/rest\/v1\/(\w+)/);
  return m ? m[1] : null;
}

beforeEach(() => {
  for (const k of ENV) saved[k] = process.env[k];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_service';
  invites = [];
  members = [];
  votes = [];
  ownerTrip = {
    id: 'trip-1',
    name: 'טיול משותף',
    citySlugs: ['vienna'],
    createdAt: 1,
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-schonbrunn'] }],
  };

  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const table = tableOf(url);
    const method = init.method ?? 'GET';
    if (table === 'user_trips') {
      return new Response(JSON.stringify(ownerTrip ? [{ data: ownerTrip }] : []), { status: 200 });
    }
    if (table === 'trip_group_invites') {
      if (method === 'POST') {
        const row = JSON.parse(String(init.body));
        invites.push(row);
        return new Response(JSON.stringify([row]), { status: 200 });
      }
      if (method === 'DELETE') {
        invites = [];
        return new Response('[]', { status: 200 });
      }
      const codeMatch = url.match(/code=eq\.([^&]+)/);
      const hit = invites.filter((i) => !codeMatch || i.code === codeMatch[1]);
      return new Response(JSON.stringify(hit), { status: 200 });
    }
    if (table === 'trip_group_members') {
      if (method === 'POST') {
        const row = JSON.parse(String(init.body));
        if (!members.some((m) => m.member_id === row.member_id)) members.push(row);
        return new Response(JSON.stringify([row]), { status: 200 });
      }
      const mm = url.match(/member_id=eq\.([^&]+)/);
      return new Response(
        JSON.stringify(members.filter((m) => !mm || m.member_id === mm[1])),
        { status: 200 },
      );
    }
    if (table === 'trip_group_votes') {
      if (method === 'POST') {
        const row = JSON.parse(String(init.body));
        votes = votes.filter(
          (v) => !(v.member_id === row.member_id && v.place_id === row.place_id),
        );
        votes.push(row);
        return new Response(JSON.stringify([row]), { status: 200 });
      }
      if (method === 'PATCH') {
        const pm = url.match(/place_id=eq\.([^&]+)/);
        const mm = url.match(/member_id=eq\.([^&]+)/);
        const hit = votes.filter((v) => v.place_id === pm?.[1] && v.member_id === mm?.[1]);
        for (const v of hit) Object.assign(v, JSON.parse(String(init.body)));
        return new Response(JSON.stringify(hit), { status: 200 });
      }
      if (method === 'DELETE') {
        const pm = url.match(/place_id=eq\.([^&]+)/);
        const mm = url.match(/member_id=eq\.([^&]+)/);
        votes = votes.filter((v) => !(v.place_id === pm?.[1] && v.member_id === mm?.[1]));
        return new Response('[]', { status: 200 });
      }
      return new Response(JSON.stringify(votes), { status: 200 });
    }
    return new Response('{}', { status: 500 });
  }) as typeof fetch;
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  globalThis.fetch = realFetch;
});

const load = () => import('./groupTrips.ts?' + Math.random().toString(36).slice(2));

test('הזמנה → הצטרפות → צפייה: החבר רואה snapshot אמיתי מהקטלוג', async () => {
  const g = await load();
  const invite = await g.createInvite(OWNER, 'trip-1');
  assert.ok(invite);
  assert.match(invite.code, /^gr[a-z2-9]{8,12}$/);

  assert.equal(await g.joinGroup(invite.code, MEMBER), 'joined');
  assert.equal(await g.joinGroup(invite.code, MEMBER), 'already');

  const asMember = await g.isMember(invite.code, MEMBER);
  assert.ok(asMember);
  const snap = await g.groupTripSnapshot(asMember);
  assert.ok(snap);
  assert.equal(snap.days[0].cityName, 'וינה');
  assert.equal(snap.days[0].stops[0].id, 'vie-schonbrunn');
});

test('קוד שפג - expired; מי שלא הצטרף אינו member', async () => {
  const g = await load();
  const invite = await g.createInvite(OWNER, 'trip-1');
  assert.ok(invite);
  invites[0].expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal(await g.joinGroup(invite.code, MEMBER), 'expired');
  assert.equal(await g.isMember(invite.code, MEMBER), null);
});

test('הצבעה רק על עצירה שקיימת בטיול; סיכום נכון; לחיצה חוזרת מסירה', async () => {
  const g = await load();
  const invite = (await g.createInvite(OWNER, 'trip-1'))!;
  await g.joinGroup(invite.code, MEMBER);
  const asMember = (await g.isMember(invite.code, MEMBER))!;

  assert.equal(await g.castVote(asMember, MEMBER, 'not-in-trip', 1), false);
  assert.equal(await g.castVote(asMember, MEMBER, 'vie-schonbrunn', 1), true);

  let tallies = await g.voteTallies(OWNER, 'trip-1', MEMBER);
  assert.equal(tallies.length, 1);
  assert.equal(tallies[0].up, 1);
  assert.equal(tallies[0].mine, 1);

  assert.equal(await g.castVote(asMember, MEMBER, 'vie-schonbrunn', 0), true);
  tallies = await g.voteTallies(OWNER, 'trip-1', MEMBER);
  assert.equal(tallies.length, 0);
});

test('המארגן עצמו רשאי תמיד (isMember) בלי להצטרף', async () => {
  const g = await load();
  const invite = (await g.createInvite(OWNER, 'trip-1'))!;
  assert.ok(await g.isMember(invite.code, OWNER));
  assert.equal(await g.joinGroup(invite.code, OWNER), 'already');
});
