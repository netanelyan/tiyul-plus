/**
 * טיול משותף - צד השרת. המארגן פרימיום; החברים חינם.
 *
 * ## מודל ההרשאות: הקוד הוא ההרשאה
 *
 * קוד ההזמנה הוא capability: מי שמחזיק אותו ומחובר יכול להצטרף ולראות
 * את הטיול. אין רשימת "מוזמנים" לפי מייל - זו בכוונה אותה פשטות כמו
 * קישור שיתוף, רק עם זהות (member_id אמיתי מ-GoTrue) כדי שהצבעה תהיה
 * אחת לאדם. פקיעה של 30 יום מגבילה את חלון החשיפה של קוד שדלף;
 * חברים שכבר הצטרפו נשארים גם אחרי הפקיעה.
 *
 * ## הצפייה של חבר היא הטיול החי, דרך השרת
 *
 * חבר קורא את הטיול של המארגן דרך snapshot שנבנה בשרת (אותו
 * buildSnapshot של הסיפורים - שמות מהקטלוג בלבד) בכל בקשה - כלומר
 * עריכות של המארגן נראות בקריאה הבאה. שום דבר לא נכתב לטיול עצמו:
 * חברים מצביעים, לא עורכים.
 */

import { buildSnapshot, type StorySnapshot } from '@/lib/server/stories';
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

interface InviteRow {
  code: string;
  owner_id: string;
  trip_id: string;
  expires_at: string;
}

/** יצירת קישור הזמנה (או החלפת הקיים) - למארגן בלבד, פרימיום נאכף בנתיב */
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
  // הזמנה קיימת לטיול מוחלפת (unique על owner+trip) - מחיקה ואז הוספה
  await adminDelete('trip_group_invites', pgQuery(eq('owner_id', ownerId), eq('trip_id', tripId)));
  const rows = await adminInsert<InviteRow>('trip_group_invites', row);
  return rows?.[0] ?? null;
}

export async function findInvite(code: string): Promise<InviteRow | null> {
  if (!isInviteCode(code)) return null;
  const rows = await adminSelect<InviteRow>(
    'trip_group_invites',
    pgQuery(eq('code', code), pgSelect(['code', 'owner_id', 'trip_id', 'expires_at'])),
  );
  return rows?.[0] ?? null;
}

export type JoinResult = 'joined' | 'already' | 'expired' | 'full' | 'not-found' | 'error';

export async function joinGroup(code: string, memberId: string): Promise<JoinResult> {
  const invite = await findInvite(code);
  if (!invite) return 'not-found';
  if (Date.parse(invite.expires_at) < Date.now()) return 'expired';
  // המארגן עצמו אינו "חבר" - הוא כבר רואה הכול במסך הטיול
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
  if (invite.owner_id === memberId) return invite; // המארגן תמיד רשאי
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

/** ה-snapshot החי של הטיול עבור חבר - נבנה מחדש בכל קריאה, עריכות נראות */
export async function groupTripSnapshot(invite: InviteRow): Promise<StorySnapshot | null> {
  const trip = await findOwnTrip(invite.owner_id, invite.trip_id);
  return trip ? buildSnapshot(trip) : null;
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
  // ההצבעה חייבת להיות על עצירה שקיימת בטיול - לא מזהה חופשי
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
