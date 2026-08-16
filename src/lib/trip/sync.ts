'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Trip } from './types';

/**
 * סנכרון טיולים לחשבון (טבלת user_trips, ראו supabase-accounts.sql).
 * המודל: localStorage נשאר מקור העבודה המיידי (offline-first); כשיש
 * משתמש מחובר - כל שינוי נדחף (debounced ע"י AccountSync) וכל התחברות
 * מושכת וממזגת. RLS בצד השרת מבטיח שכל אחד רואה רק את השורות שלו -
 * הלקוח לא שולח user_id בכלל, השרת גוזר אותו מהטוקן.
 *
 * ## מחיקה היא נתון, לא היעדר נתון
 *
 * עד לתיקון הזה מחיקה התבטאה רק בכך שהשורה נעלמה. לכל שינוי אחר יש
 * `updatedAt`, ולכן המיזוג יודע להכריע - אבל להיעדר אין חותמת, ולכן
 * **כל עותק מרוחק ניצח כל מחיקה**: snapshot שנקרא רגע לפני הלחיצה, או
 * מכשיר שני שעוד לא סונכרן, החזירו את הטיול לחיים. זה הבאג שדווח.
 *
 * עכשיו מחיקה נכתבת כשורת מצבה: אותה שורה ב-`user_trips` נשארת, אבל
 * ה-`data` שלה מוחלף בחתימה `{ id, name, deletedAt }` בלי תוכן הטיול.
 * זה נותן מצבה **חוצת-מכשירים בלי שינוי סכמה** (אין SQL חדש להריץ),
 * וגם מפסיק לאחסן את תוכן הטיול שנמחק.
 */

interface Row {
  id: string;
  data: Trip & { deletedAt?: number };
  updated_at: string;
}

const stamp = (t: Trip): number => t.updatedAt ?? t.createdAt;

/** שורת מצבה - ללא ימים וללא העדפות, רק כמה זה נמחק */
export interface TombstoneRow {
  id: string;
  deletedAt: number;
}

export interface PullResult {
  trips: Trip[];
  /** id → מתי נמחק, לפי מה שמכשירים אחרים כתבו */
  tombstones: Record<string, number>;
}

function isTombstone(data: unknown): data is { deletedAt: number } {
  return Boolean(
    data && typeof (data as { deletedAt?: unknown }).deletedAt === 'number',
  );
}

export async function pullRemoteTrips(supabase: SupabaseClient): Promise<PullResult | null> {
  // תקרה הגנתית: משתמש אמיתי מחזיק טיולים בודדים, וגיזום המצבות ממילא
  // חוסם ב-200 - אבל שאילתה בלי גבול היא הדבר שמפתיע בעוד שנה. 500
  // מרווח בטוח מעל כל שימוש לגיטימי, החדשים-ראשונים כדי שאם התקרה
  // אי פעם נחתכת, מה שנופל הוא הישן ביותר.
  const { data, error } = await supabase
    .from('user_trips')
    .select('id,data,updated_at')
    .order('updated_at', { ascending: false })
    .limit(500);
  if (error) return null;
  const trips: Trip[] = [];
  const tombstones: Record<string, number> = {};
  for (const r of data as Row[]) {
    if (!r?.data) continue;
    if (isTombstone(r.data)) {
      tombstones[r.id] = r.data.deletedAt;
      continue;
    }
    if (Array.isArray(r.data.days)) trips.push(r.data);
  }
  return { trips, tombstones };
}

export async function pushTrips(supabase: SupabaseClient, trips: Trip[]): Promise<boolean> {
  if (trips.length === 0) return true;
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const rows = trips.map((t) => ({
    user_id: uid,
    id: t.id,
    data: t,
    updated_at: new Date(stamp(t)).toISOString(),
  }));
  const { error } = await supabase.from('user_trips').upsert(rows, { onConflict: 'user_id,id' });
  return !error;
}

/**
 * כותב מצבות במקום למחוק שורות. אידמפוטנטי בכוונה: AccountSync קורא לזה
 * בכל משיכה עבור כל מצבה מקומית, כך שמחיקה שנכשלה או שהתחרתה במשיכה
 * מתוקנת מעצמה בסבב הבא - במקום להישאר "מחוק מקומית, קיים בשרת".
 */
export async function writeTombstones(
  supabase: SupabaseClient,
  tombstones: Record<string, number>,
): Promise<boolean> {
  const ids = Object.keys(tombstones);
  if (ids.length === 0) return true;
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const rows = ids.map((id) => ({
    user_id: uid,
    id,
    data: { id, deletedAt: tombstones[id] },
    updated_at: new Date(tombstones[id]).toISOString(),
  }));
  const { error } = await supabase.from('user_trips').upsert(rows, { onConflict: 'user_id,id' });
  return !error;
}

/**
 * מיזוג משיכה: לכל id - הגרסה עם החותמת המאוחרת מנצחת; טיולים שקיימים
 * רק בצד אחד נשמרים. מצבות משתתפות במיזוג כמו כל חותמת אחרת:
 * - טיול מרוחק שיש לו מצבה מקומית מאוחרת יותר → **לא** מוחזר לחיים,
 *   ובמקום זאת נכתבת לו מצבה בשרת (תיקון עצמי של מחיקה שלא נקלטה).
 * - מצבה מרוחקת מאוחרת מהעריכה המקומית → הטיול נמחק גם כאן.
 * - עריכה מקומית מאוחרת מהמצבה → העריכה מנצחת, בדיוק כמו בכל התנגשות.
 */
export function mergeTrips(
  local: Trip[],
  remote: Trip[],
  localTombstones: Record<string, number> = {},
  remoteTombstones: Record<string, number> = {},
): {
  applyLocally: Trip[];
  pushRemotely: Trip[];
  /** מצבות שצריך לכתוב לשרת (מחיקה מקומית שהשרת עוד לא יודע עליה) */
  writeRemotely: Record<string, number>;
  /** מצבות שהגיעו מהשרת וצריך להחיל מקומית */
  applyDeletions: Record<string, number>;
} {
  const applyLocally: Trip[] = [];
  const pushRemotely: Trip[] = [];
  const writeRemotely: Record<string, number> = {};
  const applyDeletions: Record<string, number> = {};
  const localById = new Map(local.map((t) => [t.id, t]));
  const remoteById = new Map(remote.map((t) => [t.id, t]));

  /** המחיקה שהיא הקובעת לאותו id, מקומית או מרוחקת - המאוחרת מהשתיים */
  const tombstoneAt = (id: string): number | null => {
    const a = localTombstones[id];
    const b = remoteTombstones[id];
    if (a === undefined && b === undefined) return null;
    return Math.max(a ?? 0, b ?? 0);
  };

  for (const r of remote) {
    const dead = tombstoneAt(r.id);
    if (dead !== null && dead >= stamp(r)) {
      // נמחק, והעותק המרוחק אינו חדש מהמחיקה. לא מחזירים לחיים.
      if (localTombstones[r.id] !== undefined && remoteTombstones[r.id] === undefined)
        writeRemotely[r.id] = localTombstones[r.id];
      continue;
    }
    const l = localById.get(r.id);
    if (!l) applyLocally.push(r);
    else if (stamp(r) > stamp(l)) applyLocally.push(r);
    else if (stamp(l) > stamp(r)) pushRemotely.push(l);
  }
  for (const l of local) {
    if (remoteById.has(l.id)) continue;
    const dead = tombstoneAt(l.id);
    if (dead !== null && dead >= stamp(l)) continue; // נמחק - לא דוחפים בחזרה
    pushRemotely.push(l);
  }
  // מצבות מרוחקות שעוד לא ידועות מקומית
  for (const [id, at] of Object.entries(remoteTombstones)) {
    if ((localTombstones[id] ?? 0) < at) applyDeletions[id] = at;
  }
  // מצבות מקומיות שהשרת לא מכיר בכלל (השורה נמחקה, או מעולם לא עלתה).
  // שווה לכתוב אותן כדי שמכשיר שני שעוד מחזיק את הטיול לא ידחוף אותו
  // בחזרה - אבל בגבולות: רק מחיקות מהחודש האחרון ולא יותר מ-50 שורות,
  // אחרת התחברות ראשונה במכשיר ותיק הייתה כותבת מאות שורות מצבה.
  const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const pending = Object.entries(localTombstones)
    .filter(([id, at]) => remoteTombstones[id] === undefined && !writeRemotely[id] && now - at < RECENT_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
  for (const [id, at] of pending) writeRemotely[id] = at;
  return { applyLocally, pushRemotely, writeRemotely, applyDeletions };
}
