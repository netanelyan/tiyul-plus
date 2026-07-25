'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Trip } from './types';

/**
 * סנכרון טיולים לחשבון (טבלת user_trips, ראו supabase-accounts.sql).
 * המודל: localStorage נשאר מקור העבודה המיידי (offline-first); כשיש
 * משתמש מחובר - כל שינוי נדחף (debounced ע"י AccountSync) וכל התחברות
 * מושכת וממזגת. RLS בצד השרת מבטיח שכל אחד רואה רק את השורות שלו -
 * הלקוח לא שולח user_id בכלל, השרת גוזר אותו מהטוקן.
 */

interface Row {
  id: string;
  data: Trip;
  updated_at: string;
}

const stamp = (t: Trip): number => t.updatedAt ?? t.createdAt;

export async function pullRemoteTrips(supabase: SupabaseClient): Promise<Trip[] | null> {
  const { data, error } = await supabase.from('user_trips').select('id,data,updated_at');
  if (error) return null;
  return (data as Row[]).map((r) => r.data).filter((t) => t && Array.isArray(t.days));
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

export async function deleteRemoteTrips(supabase: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await supabase.from('user_trips').delete().in('id', ids);
}

/**
 * מיזוג משיכה: לכל id - הגרסה עם החותמת המאוחרת מנצחת; טיולים שקיימים
 * רק בצד אחד נשמרים. מחזיר את מה שצריך לעדכן מקומית ואת מה שצריך לדחוף.
 */
export function mergeTrips(
  local: Trip[],
  remote: Trip[],
): { applyLocally: Trip[]; pushRemotely: Trip[] } {
  const applyLocally: Trip[] = [];
  const pushRemotely: Trip[] = [];
  const localById = new Map(local.map((t) => [t.id, t]));
  const remoteById = new Map(remote.map((t) => [t.id, t]));

  for (const r of remote) {
    const l = localById.get(r.id);
    if (!l) applyLocally.push(r);
    else if (stamp(r) > stamp(l)) applyLocally.push(r);
    else if (stamp(l) > stamp(r)) pushRemotely.push(l);
  }
  for (const l of local) {
    if (!remoteById.has(l.id)) pushRemotely.push(l);
  }
  return { applyLocally, pushRemotely };
}
