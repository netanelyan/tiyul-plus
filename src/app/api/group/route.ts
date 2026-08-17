import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import {
  castVote,
  createInvite,
  groupTripSnapshot,
  isMember,
  joinGroup,
  memberCount,
  voteTallies,
} from '@/lib/server/groupTrips';

/**
 * Shared trip. **The organizer is premium; joining and voting are free** (for signed-in members).
 *
 * - POST action='invite' (organizer, premium): an invite link for the trip.
 * - POST action='join'   (any signed-in user, with code): joining.
 * - GET  ?code=          (member/organizer): the live trip + the votes.
 * - GET  ?tripId=        (organizer): member count + vote summary for the trip screen.
 * - POST action='vote'   (member, with code): a vote of 1 / -1 / 0 (removal).
 */

export async function GET(request: Request) {
  const caller = await resolveCaller(request);
  if (!caller.userId) return NextResponse.json({ error: 'auth-required' }, { status: 401 });
  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.slice(0, 20);
  const tripId = url.searchParams.get('tripId')?.slice(0, 100);

  if (code) {
    const invite = await isMember(code, caller.userId);
    if (!invite) return NextResponse.json({ error: 'not-member' }, { status: 404 });
    const snapshot = await groupTripSnapshot(invite);
    if (!snapshot) return NextResponse.json({ error: 'trip-gone' }, { status: 404 });
    const votes = await voteTallies(invite.owner_id, invite.trip_id, caller.userId);
    return NextResponse.json({ trip: snapshot, votes });
  }

  if (tripId) {
    // Organizer side: their own trip - no code needed, only identity
    const votes = await voteTallies(caller.userId, tripId);
    const members = await memberCount(caller.userId, tripId);
    return NextResponse.json({ members, votes });
  }

  return NextResponse.json({ error: 'bad-request' }, { status: 400 });
}

export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('group-write', caller.id, 60, 10 * 60_000);
  if (!burst.ok) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ error: 'auth-required' }, { status: 401 });

  let body: { action?: unknown; tripId?: unknown; code?: unknown; placeId?: unknown; vote?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'invite') {
    if (caller.plan !== 'premium') {
      return NextResponse.json({ error: 'premium-required' }, { status: 403 });
    }
    const tripId = typeof body.tripId === 'string' ? body.tripId.trim().slice(0, 100) : '';
    if (!tripId) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    const invite = await createInvite(caller.userId, tripId);
    if (!invite) return NextResponse.json({ error: 'trip-not-found' }, { status: 404 });
    return NextResponse.json({ code: invite.code, expiresAt: invite.expires_at });
  }

  const code = typeof body.code === 'string' ? body.code.slice(0, 20) : '';

  if (action === 'join') {
    if (!code) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    const result = await joinGroup(code, caller.userId);
    if (result === 'joined' || result === 'already') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: result }, { status: result === 'not-found' ? 404 : 409 });
  }

  if (action === 'vote') {
    const placeId = typeof body.placeId === 'string' ? body.placeId.slice(0, 80) : '';
    const rawVote = Number(body.vote);
    if (!code || !placeId || ![1, -1, 0].includes(rawVote)) {
      return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }
    const invite = await isMember(code, caller.userId);
    if (!invite) return NextResponse.json({ error: 'not-member' }, { status: 404 });
    const ok = await castVote(invite, caller.userId, placeId, rawVote as 1 | -1 | 0);
    if (!ok) return NextResponse.json({ error: 'vote-rejected' }, { status: 400 });
    const votes = await voteTallies(invite.owner_id, invite.trip_id, caller.userId);
    return NextResponse.json({ ok: true, votes });
  }

  return NextResponse.json({ error: 'bad-action' }, { status: 400 });
}
