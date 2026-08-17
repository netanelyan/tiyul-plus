import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import {
  castVote,
  createInvite,
  groupTripSnapshot,
  inviteForTrip,
  isMember,
  joinGroup,
  memberCount,
  memberIds,
  tripName,
  tripPlaceIds,
  voteTallies,
  type InviteRow,
} from '@/lib/server/groupTrips';
import {
  addComment,
  addSuggestion,
  decideSuggestion,
  deleteComment,
  listComments,
  listDateVotes,
  listRsvp,
  listSuggestions,
  memberNames,
  setAvailability,
  setDateOptions,
  setRsvp,
  type RsvpStatus,
} from '@/lib/server/groupPlanning';
import { notifyOrganiser } from '@/lib/server/groupNotify';

/**
 * Shared trip. **The organizer is premium; joining, voting, commenting,
 * suggesting, answering dates and RSVP are all free** for signed-in members -
 * they are the distribution channel, and charging them would throttle it.
 *
 * - POST action='invite'   (organizer, premium): an invite link for the trip.
 * - POST action='join'     (any signed-in user, with code): joining.
 * - GET  ?code=            (member/organizer): the live trip + everything on it.
 * - GET  ?tripId=          (organizer): the same, for their own trip screen.
 * - POST action='vote'     (member): a vote of 1 / -1 / 0 (removal).
 * - POST action='comment'  (member): a comment, on a stop or the general thread.
 * - POST action='uncomment'(author): removing their OWN comment.
 * - POST action='suggest'  (member): proposing a catalog place.
 * - POST action='decide'   (organizer): accept/dismiss a suggestion.
 * - POST action='dates'    (organizer): set the candidate days.
 * - POST action='available'(member): mark one candidate day.
 * - POST action='rsvp'     (member): going / maybe / no.
 *
 * Membership is proved once per request by `isMember(code, userId)`, and the
 * resulting invite is what every planning function is given - none of them
 * re-derives permission. The two organizer-only actions ('decide', 'dates')
 * are additionally checked against invite.owner_id inside groupPlanning.
 */

/** Everything a member's view needs, in one round of queries. */
async function planningPayload(invite: InviteRow, viewerId: string) {
  const [comments, suggestions, dateVotes, rsvp, members] = await Promise.all([
    listComments(invite, viewerId),
    listSuggestions(invite),
    listDateVotes(invite),
    listRsvp(invite),
    memberIds(invite.owner_id, invite.trip_id),
  ]);
  return {
    comments,
    suggestions,
    dateOptions: invite.date_options ?? [],
    dateVotes,
    rsvp,
    memberIds: members,
  };
}

export async function GET(request: Request) {
  const caller = await resolveCaller(request);
  if (!caller.userId) return NextResponse.json({ error: 'auth-required' }, { status: 401 });
  const userId: string = caller.userId;
  const url = new URL(request.url);
  const code = url.searchParams.get('code')?.slice(0, 20);
  const tripId = url.searchParams.get('tripId')?.slice(0, 100);

  if (code) {
    const invite = await isMember(code, userId);
    if (!invite) return NextResponse.json({ error: 'not-member' }, { status: 404 });
    const snapshot = await groupTripSnapshot(invite);
    if (!snapshot) return NextResponse.json({ error: 'trip-gone' }, { status: 404 });
    const votes = await voteTallies(invite.owner_id, invite.trip_id, userId);
    const planning = await planningPayload(invite, userId);
    return NextResponse.json({
      trip: snapshot,
      votes,
      isOwner: invite.owner_id === caller.userId,
      ...planning,
    });
  }

  if (tripId) {
    // Organizer side: their own trip - no code needed, only identity
    const invite = await inviteForTrip(userId, tripId);
    const votes = await voteTallies(caller.userId, tripId);
    const members = await memberCount(caller.userId, tripId);
    if (!invite) return NextResponse.json({ members, votes });
    const planning = await planningPayload(invite, userId);
    // The code goes back so the organizer panel can show the existing link after a
    // reload instead of minting a second invite for the same trip.
    return NextResponse.json({ members, votes, code: invite.code, isOwner: true, ...planning });
  }

  return NextResponse.json({ error: 'bad-request' }, { status: 400 });
}

export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('group-write', caller.id, 60, 10 * 60_000);
  if (!burst.ok) return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ error: 'auth-required' }, { status: 401 });
  // Captured after the guard: TypeScript does not carry the narrowing into the
  // closures below, and a non-null assertion in each of them would be noise.
  const userId: string = caller.userId;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  const action = typeof body.action === 'string' ? body.action : '';
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

  if (action === 'invite') {
    if (caller.plan !== 'premium') {
      return NextResponse.json({ error: 'premium-required' }, { status: 403 });
    }
    const tripId = str(body.tripId, 100).trim();
    if (!tripId) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    const invite = await createInvite(caller.userId, tripId);
    if (!invite) return NextResponse.json({ error: 'trip-not-found' }, { status: 404 });
    return NextResponse.json({ code: invite.code, expiresAt: invite.expires_at });
  }

  const code = str(body.code, 20);

  if (action === 'join') {
    if (!code) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    const result = await joinGroup(code, caller.userId);
    if (result === 'joined' || result === 'already') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: result }, { status: result === 'not-found' ? 404 : 409 });
  }

  // Everything below needs membership. The organizer reaches it by tripId
  // instead of a code, because they never joined their own trip.
  const tripId = str(body.tripId, 100).trim();
  const invite = code
    ? await isMember(code, userId)
    : tripId
      ? await inviteForTrip(userId, tripId)
      : null;
  if (!invite) return NextResponse.json({ error: 'not-member' }, { status: 404 });

  const done = async (extra: Record<string, unknown> = {}) =>
    NextResponse.json({
      ok: true,
      votes: await voteTallies(invite.owner_id, invite.trip_id, userId),
      ...(await planningPayload(invite, userId)),
      ...extra,
    });

  /** Tell the organizer, unless they are the one who acted. Never blocks the write. */
  const tell = (event: Parameters<typeof notifyOrganiser>[0]) => {
    if (userId === invite.owner_id) return;
    void (async () => {
      const names = await memberNames([userId]);
      const name = names.get(userId) ?? 'מטייל';
      await notifyOrganiser(event, name, await tripName(invite));
    })();
  };

  if (action === 'vote') {
    const placeId = str(body.placeId, 80);
    const rawVote = Number(body.vote);
    if (!placeId || ![1, -1, 0].includes(rawVote)) {
      return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }
    const ok = await castVote(invite, userId, placeId, rawVote as 1 | -1 | 0);
    if (!ok) return NextResponse.json({ error: 'vote-rejected' }, { status: 400 });
    return done();
  }

  if (action === 'comment') {
    const placeId = str(body.placeId, 80) || null;
    const result = await addComment(
      invite,
      userId,
      str(body.body, 2000),
      placeId,
      await tripPlaceIds(invite),
    );
    if (result !== 'ok') return NextResponse.json({ error: result }, { status: 400 });
    tell('comment');
    return done();
  }

  if (action === 'uncomment') {
    const id = str(body.commentId, 60);
    if (!id) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    await deleteComment(invite, userId, id);
    return done();
  }

  if (action === 'suggest') {
    const result = await addSuggestion(
      invite,
      userId,
      str(body.citySlug, 60),
      str(body.placeId, 80),
      str(body.note, 2000) || null,
      await tripPlaceIds(invite),
    );
    if (result !== 'ok') return NextResponse.json({ error: result }, { status: 400 });
    tell('suggestion');
    return done();
  }

  if (action === 'decide') {
    const status = body.status === 'accepted' ? 'accepted' : 'dismissed';
    const ok = await decideSuggestion(invite, userId, str(body.suggestionId, 60), status);
    if (!ok) return NextResponse.json({ error: 'not-allowed' }, { status: 403 });
    return done();
  }

  if (action === 'dates') {
    const days = Array.isArray(body.days) ? (body.days as unknown[]).map((d) => String(d)) : [];
    const saved = await setDateOptions(invite, userId, days);
    if (!saved) return NextResponse.json({ error: 'not-allowed' }, { status: 403 });
    // The invite in hand is stale by one field now - hand the saved list back.
    return NextResponse.json({
      ok: true,
      votes: await voteTallies(invite.owner_id, invite.trip_id, userId),
      ...(await planningPayload({ ...invite, date_options: saved }, userId)),
    });
  }

  if (action === 'available') {
    const ok = await setAvailability(invite, userId, str(body.day, 10), body.ok === true);
    if (!ok) return NextResponse.json({ error: 'bad-day' }, { status: 400 });
    tell('dates');
    return done();
  }

  if (action === 'rsvp') {
    const status = body.status;
    if (status !== 'going' && status !== 'maybe' && status !== 'no') {
      return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }
    const ok = await setRsvp(invite, userId, status as RsvpStatus);
    if (!ok) return NextResponse.json({ error: 'error' }, { status: 500 });
    tell('rsvp');
    return done();
  }

  return NextResponse.json({ error: 'bad-action' }, { status: 400 });
}
