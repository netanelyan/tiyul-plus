/**
 * Shared group trip - server side. The organizer is premium; the friends are free.
 *
 * ## The permission model: the code IS the permission
 *
 * The invite code is a capability: whoever holds it and is signed in can join
 * and see the trip. There is no "invitees" list by email - this is
 * deliberately the same simplicity as a share link, only with identity (a
 * real member_id from GoTrue) so that voting is one per person. A 30-day
 * expiry limits the exposure window of a leaked code; members who already
 * joined stay even after expiry.
 *
 * ## A member's view is the live trip, through the server
 *
 * A member reads the organizer's trip through a snapshot built on the server
 * (buildSnapshot - names from the catalog only) on
 * every request - meaning the organizer's edits are visible on the next
 * read. Nothing is ever written to the trip itself: members vote, they do
 * not edit.
 */

import { buildSnapshot, enrichSnapshot, type EnrichedSnapshot } from '@/lib/server/tripSnapshot';
import { findOwnTrip } from '@/lib/server/userTrips';
import { adminDelete, adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

export const INVITE_TTL_DAYS = 30;
export const MAX_MEMBERS = 20;

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function newInviteCode(): string {
  let s = 'gr';
  for (let i = 0; i < 10; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export const isInviteCode = (code: string) => /^gr[a-z2-9]{8,12}$/.test(code);

export interface InviteRow {
  code: string;
  owner_id: string;
  trip_id: string;
  expires_at: string;
  /** Candidate dates the organiser put up for the group to answer (supabase-group-planning.sql) */
  date_options?: string[];
}

/** Create an invite link (or replace the existing one) - organizer only, premium is enforced in the route */
export async function createInvite(ownerId: string, tripId: string): Promise<InviteRow | null> {
  const trip = await findOwnTrip(ownerId, tripId);
  if (!trip) return null;
  const row = {
    code: newInviteCode(),
    owner_id: ownerId,
    trip_id: tripId,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString(),
  };
  // An existing invite for the trip is replaced (unique on owner+trip) - delete then insert
  await adminDelete('trip_group_invites', pgQuery(eq('owner_id', ownerId), eq('trip_id', tripId)));
  const rows = await adminInsert<InviteRow>('trip_group_invites', row);
  return rows?.[0] ?? null;
}

export async function findInvite(code: string): Promise<InviteRow | null> {
  if (!isInviteCode(code)) return null;
  const rows = await adminSelect<InviteRow>(
    'trip_group_invites',
    pgQuery(eq('code', code), pgSelect(['code', 'owner_id', 'trip_id', 'expires_at', 'date_options'])),
  );
  return rows?.[0] ?? null;
}

export type JoinResult = 'joined' | 'already' | 'expired' | 'full' | 'not-found' | 'error';

export async function joinGroup(code: string, memberId: string): Promise<JoinResult> {
  const invite = await findInvite(code);
  if (!invite) return 'not-found';
  if (Date.parse(invite.expires_at) < Date.now()) return 'expired';
  // The organizer themselves is not a "member" - they already see everything on the trip screen
  if (invite.owner_id === memberId) return 'already';

  const members = await adminSelect<{ member_id: string }>(
    'trip_group_members',
    pgQuery(eq('owner_id', invite.owner_id), eq('trip_id', invite.trip_id), pgSelect(['member_id'])),
  );
  if (!members) return 'error';
  if (members.some((m) => m.member_id === memberId)) return 'already';
  if (members.length >= MAX_MEMBERS) return 'full';

  const rows = await adminInsert(
    'trip_group_members',
    { owner_id: invite.owner_id, trip_id: invite.trip_id, member_id: memberId },
    { ignoreDuplicates: true },
  );
  return rows ? 'joined' : 'error';
}

export async function isMember(code: string, memberId: string): Promise<InviteRow | null> {
  const invite = await findInvite(code);
  if (!invite) return null;
  if (invite.owner_id === memberId) return invite; // the organizer is always allowed
  const rows = await adminSelect<{ member_id: string }>(
    'trip_group_members',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      eq('member_id', memberId),
      pgSelect(['member_id']),
    ),
  );
  return rows && rows.length > 0 ? invite : null;
}

/**
 * The live snapshot of the trip for a member - rebuilt on every read, edits are visible.
 *
 * Enriched with the catalog photo and description here, on the server, for the same
 * reason the story page does it: the friend voting on stops should see what each place
 * IS, and the alternative - letting the client resolve it - would ship the whole catalog
 * to every invited friend.
 */
export async function groupTripSnapshot(invite: InviteRow): Promise<EnrichedSnapshot | null> {
  const trip = await findOwnTrip(invite.owner_id, invite.trip_id);
  return trip ? enrichSnapshot(buildSnapshot(trip)) : null;
}

/**
 * The place ids actually in the trip right now.
 *
 * Comments and suggestions are both validated against this, for the same reason
 * `castVote` is: a member must not be able to file either one against a place
 * that is not in the trip - that is how a group thread ends up carrying rows
 * nothing on screen can ever show.
 */
export async function tripPlaceIds(invite: InviteRow): Promise<ReadonlySet<string>> {
  const trip = await findOwnTrip(invite.owner_id, invite.trip_id);
  if (!trip) return new Set();
  return new Set(trip.days.flatMap((d) => d.placeIds));
}

/** The trip's name, for a notification that says which trip it is about. */
export async function tripName(invite: InviteRow): Promise<string> {
  const trip = await findOwnTrip(invite.owner_id, invite.trip_id);
  return trip?.name ?? 'הטיול';
}

export interface VoteTally {
  placeId: string;
  up: number;
  down: number;
  mine?: 1 | -1;
}

export async function castVote(
  invite: InviteRow,
  memberId: string,
  placeId: string,
  vote: 1 | -1 | 0,
): Promise<boolean> {
  // The vote must be on a stop that exists in the trip - not an arbitrary id
  const trip = await findOwnTrip(invite.owner_id, invite.trip_id);
  if (!trip) return false;
  const exists = trip.days.some((d) => d.placeIds.includes(placeId));
  if (!exists) return false;

  const keys = pgQuery(
    eq('owner_id', invite.owner_id),
    eq('trip_id', invite.trip_id),
    eq('member_id', memberId),
    eq('place_id', placeId),
  );
  if (vote === 0) {
    await adminDelete('trip_group_votes', keys);
    return true;
  }
  const updated = await adminUpdate<{ vote: number }>('trip_group_votes', keys, {
    vote,
    updated_at: new Date().toISOString(),
  });
  if (updated && updated.length > 0) return true;
  const rows = await adminInsert(
    'trip_group_votes',
    {
      owner_id: invite.owner_id,
      trip_id: invite.trip_id,
      member_id: memberId,
      place_id: placeId,
      vote,
    },
    { upsert: true },
  );
  return Boolean(rows);
}

export async function voteTallies(
  ownerId: string,
  tripId: string,
  forMember?: string,
): Promise<VoteTally[]> {
  const rows = await adminSelect<{ member_id: string; place_id: string; vote: number }>(
    'trip_group_votes',
    pgQuery(eq('owner_id', ownerId), eq('trip_id', tripId), pgSelect(['member_id', 'place_id', 'vote'])),
  );
  if (!rows) return [];
  const byPlace = new Map<string, VoteTally>();
  for (const r of rows) {
    const t = byPlace.get(r.place_id) ?? { placeId: r.place_id, up: 0, down: 0 };
    if (r.vote > 0) t.up += 1;
    else t.down += 1;
    if (forMember && r.member_id === forMember) t.mine = r.vote > 0 ? 1 : -1;
    byPlace.set(r.place_id, t);
  }
  return [...byPlace.values()];
}

export async function memberCount(ownerId: string, tripId: string): Promise<number> {
  const rows = await adminSelect<{ member_id: string }>(
    'trip_group_members',
    pgQuery(eq('owner_id', ownerId), eq('trip_id', tripId), pgSelect(['member_id'])),
  );
  return rows?.length ?? 0;
}

/**
 * Everyone whose answer counts, **including the organiser**.
 *
 * This is the denominator for "can everyone make the 12th", so leaving the
 * organiser out would let a date read as unanimous while the person planning the
 * trip has not said whether they can make it. They never appear in
 * `trip_group_members` - joining your own trip is meaningless - so they are added
 * here rather than stored.
 */
export async function memberIds(ownerId: string, tripId: string): Promise<string[]> {
  const rows = await adminSelect<{ member_id: string }>(
    'trip_group_members',
    pgQuery(eq('owner_id', ownerId), eq('trip_id', tripId), pgSelect(['member_id'])),
  );
  return [...new Set([ownerId, ...(rows ?? []).map((r) => r.member_id)])];
}

/** The organiser's own invite for a trip - how their trip screen reads the group data. */
export async function inviteForTrip(ownerId: string, tripId: string): Promise<InviteRow | null> {
  const rows = await adminSelect<InviteRow>(
    'trip_group_invites',
    pgQuery(
      eq('owner_id', ownerId),
      eq('trip_id', tripId),
      pgSelect(['code', 'owner_id', 'trip_id', 'expires_at', 'date_options']),
    ),
  );
  return rows?.[0] ?? null;
}
