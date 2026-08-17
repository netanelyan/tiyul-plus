/**
 * Planning together on a shared trip: comments, suggestions, dates and RSVP.
 *
 * ## Why these exist
 *
 * Voting told the organiser THAT somebody objected and never why, so the actual
 * conversation stayed in WhatsApp - which is the thing the feature claims to
 * replace. These four move it next to the plan, and each answers a different
 * question a group actually argues about:
 *
 *   comments    - why somebody is for or against a stop
 *   suggestions - "what about X?", which voting cannot express at all
 *   dates       - who can make which day, the thing groups fail on most
 *   rsvp        - who is actually coming
 *
 * ## Permission, in one sentence
 *
 * Every function here takes an `InviteRow` that the ROUTE already obtained from
 * `isMember(code, userId)`. Membership is therefore proved before anything in
 * this file runs, and nothing here re-derives it - the same shape as `castVote`.
 * The one asymmetry is deliberate and enforced per function: a member may write
 * their own comment/vote/date/RSVP and may propose a suggestion, but only the
 * OWNER may set the candidate dates or accept a suggestion. Those two check
 * `invite.owner_id === actorId` explicitly.
 */

import { destinations } from '@/data/destinations';
import { adminDelete, adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgIn, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';

export const MAX_COMMENT_LEN = 500;
/** Per member per trip. A planning thread is tens of messages; this only stops a flood. */
export const MAX_COMMENTS_PER_MEMBER = 100;
export const MAX_SUGGESTIONS_PER_MEMBER = 20;
/** Candidate dates the organiser may put up for a vote. */
export const MAX_DATE_OPTIONS = 14;

export interface InviteLike {
  owner_id: string;
  trip_id: string;
  date_options?: string[];
}

/* ---------- who said it ---------- */

/**
 * Member id -> the name to show beside their comment.
 *
 * A thread where everybody is "participant" is not a thread, so a member with no
 * display name gets a stable label derived from the first four characters of
 * their own uuid. That is not personal data and it does not change between
 * requests, which is what makes two unnamed people distinguishable. The UI
 * separately nudges the signed-in user to set a real name.
 */
export async function memberNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return out;

  const rows = await adminSelect<{ user_id: string; display_name: string | null }>(
    'profiles',
    pgQuery(pgIn('user_id', unique), pgSelect(['user_id', 'display_name'])),
  );
  const named = new Map((rows ?? []).map((r) => [r.user_id, (r.display_name ?? '').trim()]));
  for (const id of unique) {
    const name = named.get(id);
    out.set(id, name && name.length > 0 ? name.slice(0, 40) : `מטייל ${id.slice(0, 4)}`);
  }
  return out;
}

/* ---------- comments ---------- */

export interface CommentRow {
  id: string;
  member_id: string;
  place_id: string | null;
  body: string;
  created_at: string;
}
export interface CommentView extends CommentRow {
  author: string;
  mine: boolean;
}

export async function listComments(invite: InviteLike, viewerId: string): Promise<CommentView[]> {
  const rows = await adminSelect<CommentRow>(
    'trip_group_comments',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      pgSelect(['id', 'member_id', 'place_id', 'body', 'created_at']),
      pgOrder('created_at', 'asc'),
      pgLimit(500),
    ),
  );
  if (!rows) return [];
  const names = await memberNames(rows.map((r) => r.member_id));
  return rows.map((r) => ({
    ...r,
    author: names.get(r.member_id) ?? 'מטייל',
    mine: r.member_id === viewerId,
  }));
}

export type CommentResult = 'ok' | 'empty' | 'too-many' | 'bad-place' | 'error';

/**
 * A comment is attached to a stop, or to nothing (the general thread).
 * `placeId` is checked against the trip, so a comment can never be filed against
 * a place that is not in it - the same rule `castVote` applies.
 */
export async function addComment(
  invite: InviteLike,
  memberId: string,
  body: string,
  placeId: string | null,
  tripPlaceIds: ReadonlySet<string>,
): Promise<CommentResult> {
  const text = body.trim().slice(0, MAX_COMMENT_LEN);
  if (!text) return 'empty';
  if (placeId && !tripPlaceIds.has(placeId)) return 'bad-place';

  const mine = await adminSelect<{ id: string }>(
    'trip_group_comments',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      eq('member_id', memberId),
      pgSelect(['id']),
      pgLimit(MAX_COMMENTS_PER_MEMBER + 1),
    ),
  );
  if (mine && mine.length >= MAX_COMMENTS_PER_MEMBER) return 'too-many';

  const rows = await adminInsert('trip_group_comments', {
    owner_id: invite.owner_id,
    trip_id: invite.trip_id,
    member_id: memberId,
    place_id: placeId,
    body: text,
  });
  return rows ? 'ok' : 'error';
}

/** Only the author may delete their own comment - not even the organiser. */
export async function deleteComment(
  invite: InviteLike,
  memberId: string,
  commentId: string,
): Promise<boolean> {
  const rows = await adminDelete(
    'trip_group_comments',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      eq('member_id', memberId),
      eq('id', commentId),
    ),
  );
  return Boolean(rows);
}

/* ---------- suggestions ---------- */

export interface SuggestionRow {
  id: string;
  member_id: string;
  place_id: string;
  city_slug: string;
  note: string | null;
  status: 'pending' | 'accepted' | 'dismissed';
  created_at: string;
}
export interface SuggestionView extends SuggestionRow {
  author: string;
  name: string;
  photo?: string;
  description?: string;
}

/** The catalog place behind a suggestion - a suggestion of something that does not exist is not stored. */
function catalogPlace(citySlug: string, placeId: string) {
  const dest = destinations.find((d) => d.slug === citySlug);
  return dest?.places.find((p) => p.id === placeId);
}

export async function listSuggestions(invite: InviteLike): Promise<SuggestionView[]> {
  const rows = await adminSelect<SuggestionRow>(
    'trip_group_suggestions',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      pgSelect(['id', 'member_id', 'place_id', 'city_slug', 'note', 'status', 'created_at']),
      pgOrder('created_at', 'desc'),
      pgLimit(200),
    ),
  );
  if (!rows) return [];
  const names = await memberNames(rows.map((r) => r.member_id));
  return rows.flatMap((r) => {
    const p = catalogPlace(r.city_slug, r.place_id);
    // A place that has since left the catalog is dropped rather than shown as a
    // suggestion nobody can act on.
    if (!p) return [];
    return [
      {
        ...r,
        author: names.get(r.member_id) ?? 'מטייל',
        name: p.name,
        ...(p.photo ? { photo: p.photo } : {}),
        ...(p.description ? { description: p.description } : {}),
      },
    ];
  });
}

export type SuggestResult = 'ok' | 'unknown-place' | 'already-in-trip' | 'duplicate' | 'too-many' | 'error';

export async function addSuggestion(
  invite: InviteLike,
  memberId: string,
  citySlug: string,
  placeId: string,
  note: string | null,
  tripPlaceIds: ReadonlySet<string>,
): Promise<SuggestResult> {
  if (!catalogPlace(citySlug, placeId)) return 'unknown-place';
  // Suggesting something already planned is noise, not a suggestion.
  if (tripPlaceIds.has(placeId)) return 'already-in-trip';

  const mine = await adminSelect<{ id: string; place_id: string }>(
    'trip_group_suggestions',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      eq('member_id', memberId),
      pgSelect(['id', 'place_id']),
      pgLimit(MAX_SUGGESTIONS_PER_MEMBER + 1),
    ),
  );
  if (mine?.some((r) => r.place_id === placeId)) return 'duplicate';
  if (mine && mine.length >= MAX_SUGGESTIONS_PER_MEMBER) return 'too-many';

  const rows = await adminInsert('trip_group_suggestions', {
    owner_id: invite.owner_id,
    trip_id: invite.trip_id,
    member_id: memberId,
    place_id: placeId,
    city_slug: citySlug,
    note: note ? note.trim().slice(0, MAX_COMMENT_LEN) : null,
    status: 'pending',
  });
  return rows ? 'ok' : 'error';
}

/**
 * Accepting or dismissing is the ORGANISER's call - it is their trip. Accepting
 * only records the decision here; adding the place to the trip is done by the
 * client against the trip it already owns, so this file never writes a
 * traveller's itinerary.
 */
export async function decideSuggestion(
  invite: InviteLike,
  actorId: string,
  suggestionId: string,
  status: 'accepted' | 'dismissed',
): Promise<boolean> {
  if (actorId !== invite.owner_id) return false;
  const rows = await adminUpdate(
    'trip_group_suggestions',
    pgQuery(eq('owner_id', invite.owner_id), eq('trip_id', invite.trip_id), eq('id', suggestionId)),
    { status, decided_at: new Date().toISOString() },
  );
  return Boolean(rows);
}

/* ---------- dates ---------- */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DateVote {
  member_id: string;
  day: string;
  ok: boolean;
}

/** The organiser puts up the candidate days; only they may change the list. */
export async function setDateOptions(
  invite: InviteLike,
  actorId: string,
  days: string[],
): Promise<string[] | null> {
  if (actorId !== invite.owner_id) return null;
  const clean = [...new Set(days.filter((d) => typeof d === 'string' && ISO_DAY.test(d)))]
    .sort()
    .slice(0, MAX_DATE_OPTIONS);
  const rows = await adminUpdate<{ date_options: string[] }>(
    'trip_group_invites',
    pgQuery(eq('owner_id', invite.owner_id), eq('trip_id', invite.trip_id)),
    { date_options: clean },
  );
  return rows ? clean : null;
}

export async function listDateVotes(invite: InviteLike): Promise<DateVote[]> {
  const rows = await adminSelect<DateVote>(
    'trip_group_dates',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      pgSelect(['member_id', 'day', 'ok']),
      pgLimit(1000),
    ),
  );
  return rows ?? [];
}

/**
 * A member marks one candidate day. Only days the organiser actually proposed
 * are accepted, so the availability grid cannot grow rows nobody asked about.
 */
export async function setAvailability(
  invite: InviteLike,
  memberId: string,
  day: string,
  ok: boolean,
): Promise<boolean> {
  if (!ISO_DAY.test(day)) return false;
  if (!(invite.date_options ?? []).includes(day)) return false;

  const keys = pgQuery(
    eq('owner_id', invite.owner_id),
    eq('trip_id', invite.trip_id),
    eq('member_id', memberId),
    eq('day', day),
  );
  const updated = await adminUpdate('trip_group_dates', keys, {
    ok,
    updated_at: new Date().toISOString(),
  });
  if (updated && updated.length > 0) return true;
  const rows = await adminInsert(
    'trip_group_dates',
    { owner_id: invite.owner_id, trip_id: invite.trip_id, member_id: memberId, day, ok },
    { upsert: true },
  );
  return Boolean(rows);
}

/* ---------- rsvp ---------- */

export type RsvpStatus = 'going' | 'maybe' | 'no';
export interface RsvpRow {
  member_id: string;
  status: RsvpStatus;
}
export interface RsvpView extends RsvpRow {
  author: string;
}

export async function listRsvp(invite: InviteLike): Promise<RsvpView[]> {
  const rows = await adminSelect<RsvpRow>(
    'trip_group_rsvp',
    pgQuery(
      eq('owner_id', invite.owner_id),
      eq('trip_id', invite.trip_id),
      pgSelect(['member_id', 'status']),
      pgLimit(200),
    ),
  );
  if (!rows) return [];
  const names = await memberNames(rows.map((r) => r.member_id));
  return rows.map((r) => ({ ...r, author: names.get(r.member_id) ?? 'מטייל' }));
}

export async function setRsvp(
  invite: InviteLike,
  memberId: string,
  status: RsvpStatus,
): Promise<boolean> {
  const keys = pgQuery(
    eq('owner_id', invite.owner_id),
    eq('trip_id', invite.trip_id),
    eq('member_id', memberId),
  );
  const updated = await adminUpdate('trip_group_rsvp', keys, {
    status,
    updated_at: new Date().toISOString(),
  });
  if (updated && updated.length > 0) return true;
  const rows = await adminInsert(
    'trip_group_rsvp',
    { owner_id: invite.owner_id, trip_id: invite.trip_id, member_id: memberId, status },
    { upsert: true },
  );
  return Boolean(rows);
}
