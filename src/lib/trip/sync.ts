'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Trip } from './types';

/**
 * Trip sync to the account (the user_trips table, see supabase-accounts.sql).
 * The model: localStorage stays the immediate working copy (offline-first);
 * when a user is signed in - every change is pushed (debounced by
 * AccountSync) and every sign-in pulls and merges. RLS on the server side
 * guarantees everyone sees only their own rows - the client never sends
 * user_id at all, the server derives it from the token.
 *
 * ## A deletion is data, not the absence of data
 *
 * Until this fix, a deletion was expressed only by the row disappearing.
 * Every other change has an `updatedAt`, so the merge can decide - but an
 * absence carries no timestamp, and therefore **every remote copy beat
 * every deletion**: a snapshot read a moment before the click, or a second
 * device not yet synced, brought the trip back to life. That is the bug
 * that was reported.
 *
 * Now a deletion is written as a tombstone row: the same row in
 * `user_trips` remains, but its `data` is replaced with the signature
 * `{ id, name, deletedAt }` without the trip's content. That gives a
 * **cross-device tombstone with no schema change** (no new SQL to run),
 * and also stops storing the content of a trip somebody deleted.
 */

interface Row {
  id: string;
  data: Trip & { deletedAt?: number };
  updated_at: string;
}

const stamp = (t: Trip): number => t.updatedAt ?? t.createdAt;

/** A tombstone row - no days and no preferences, only when it was deleted */
export interface TombstoneRow {
  id: string;
  deletedAt: number;
}

export interface PullResult {
  trips: Trip[];
  /** id → when it was deleted, per what other devices wrote */
  tombstones: Record<string, number>;
}

function isTombstone(data: unknown): data is { deletedAt: number } {
  return Boolean(
    data && typeof (data as { deletedAt?: unknown }).deletedAt === 'number',
  );
}

export async function pullRemoteTrips(supabase: SupabaseClient): Promise<PullResult | null> {
  // Defensive cap: a real user holds a handful of trips, and tombstone
  // pruning already blocks at 200 - but an unbounded query is the thing
  // that surprises you a year from now. 500 is a safe margin above any
  // legitimate use, newest-first so that if the cap is ever hit, what
  // falls off is the oldest.
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
 * Writes tombstones instead of deleting rows. Idempotent on purpose:
 * AccountSync calls this on every pull for every local tombstone, so a
 * deletion that failed or raced against a pull repairs itself on the next
 * round - instead of remaining "deleted locally, alive on the server".
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
 * Pull merge: for each id - the version with the later timestamp wins;
 * trips that exist on only one side are kept. Tombstones participate in
 * the merge like any other timestamp:
 * - A remote trip that has a later local tombstone → is **not** brought
 *   back to life; instead a tombstone is written for it on the server
 *   (self-repair of a deletion that never landed).
 * - A remote tombstone later than the local edit → the trip is deleted
 *   here too.
 * - A local edit later than the tombstone → the edit wins, exactly like
 *   any other conflict.
 */
export function mergeTrips(
  local: Trip[],
  remote: Trip[],
  localTombstones: Record<string, number> = {},
  remoteTombstones: Record<string, number> = {},
): {
  applyLocally: Trip[];
  pushRemotely: Trip[];
  /** Tombstones to write to the server (a local deletion the server doesn't know about yet) */
  writeRemotely: Record<string, number>;
  /** Tombstones that arrived from the server and must be applied locally */
  applyDeletions: Record<string, number>;
} {
  const applyLocally: Trip[] = [];
  const pushRemotely: Trip[] = [];
  const writeRemotely: Record<string, number> = {};
  const applyDeletions: Record<string, number> = {};
  const localById = new Map(local.map((t) => [t.id, t]));
  const remoteById = new Map(remote.map((t) => [t.id, t]));

  /** The governing deletion for a given id, local or remote - the later of the two */
  const tombstoneAt = (id: string): number | null => {
    const a = localTombstones[id];
    const b = remoteTombstones[id];
    if (a === undefined && b === undefined) return null;
    return Math.max(a ?? 0, b ?? 0);
  };

  for (const r of remote) {
    const dead = tombstoneAt(r.id);
    if (dead !== null && dead >= stamp(r)) {
      // Deleted, and the remote copy is not newer than the deletion. Do not resurrect.
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
    if (dead !== null && dead >= stamp(l)) continue; // deleted - do not push back up
    pushRemotely.push(l);
  }
  // Remote tombstones not yet known locally
  for (const [id, at] of Object.entries(remoteTombstones)) {
    if ((localTombstones[id] ?? 0) < at) applyDeletions[id] = at;
  }
  // Local tombstones the server doesn't know about at all (the row was
  // deleted, or never went up). Worth writing them so that a second device
  // still holding the trip doesn't push it back - but within bounds: only
  // deletions from the last month and no more than 50 rows, otherwise a
  // first sign-in on an old device would write hundreds of tombstone rows.
  const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const pending = Object.entries(localTombstones)
    .filter(([id, at]) => remoteTombstones[id] === undefined && !writeRemotely[id] && now - at < RECENT_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
  for (const [id, at] of pending) writeRemotely[id] = at;
  return { applyLocally, pushRemotely, writeRemotely, applyDeletions };
}
