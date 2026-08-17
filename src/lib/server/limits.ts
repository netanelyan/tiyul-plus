/**
 * Server-only - do not import from a client component.
 *
 * Rate limiting and a daily budget, with no new dependency:
 *
 * 1. Fixed windows in memory (checkLimit) - the immediate protection
 *    against bursts and floods. In the instance's memory: on a single
 *    server this is exact; in serverless each instance counts for itself -
 *    which still stops the real flood pattern (thousands of consecutive
 *    requests hitting the same warm instance).
 * 2. A daily AI-units budget - always in memory, and if
 *    SUPABASE_SERVICE_ROLE_KEY is set it is also stored in usage_daily
 *    (see supabase-premium.sql) so the quota holds across several
 *    instances and survives a cold start. The first read of a day/identity
 *    merges the remote value in (max); the write is fire-and-forget via an
 *    atomic RPC.
 */

import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { serviceHeaders } from '@/lib/server/supabaseAdmin';

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Lazy cleanup - called occasionally so the map does not grow forever */
let lastPrune = 0;
function prune(now: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Fixed window: up to max requests per windowMs, keyed by (bucket, id).
 * Every call is counted (blocked ones too) - a flooder who keeps trying
 * gets nowhere.
 */
export function checkLimit(bucket: string, id: string, max: number, windowMs: number): LimitResult {
  const now = Date.now();
  prune(now);
  const key = `${bucket}|${id}`;
  let e = windows.get(key);
  if (!e || e.resetAt <= now) {
    e = { count: 0, resetAt: now + windowMs };
    windows.set(key, e);
  }
  e.count += 1;
  return {
    ok: e.count <= max,
    remaining: Math.max(0, max - e.count),
    retryAfterSec: Math.ceil((e.resetAt - now) / 1000),
  };
}

/**
 * Read-only: how much has already been counted in the active window,
 * without consuming.
 *
 * Exists for quotas counted by **success** rather than by attempt - the
 * premium full-trip-build quota. There, a plain `checkLimit` would have
 * burned one of the allowed builds on every attempt that failed
 * validation, and a model retrying within the same turn would have wasted
 * the quota with nothing built. The pattern: `peekUsed` before execution
 * (blocking without consuming), `checkLimit` after success (consuming).
 */
export function peekUsed(bucket: string, id: string): number {
  const e = windows.get(`${bucket}|${id}`);
  if (!e || e.resetAt <= Date.now()) return 0;
  return e.count;
}

/** Day key in UTC - consistent across instances in different regions */
export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/* ---------- Daily AI-units budget ---------- */

interface UsageEntry {
  day: string;
  units: number;
  /** Whether the value from remote storage has already been merged in today */
  merged: boolean;
}

const usage = new Map<string, UsageEntry>();

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const persistent = () => Boolean(supaUrl() && serviceKey());


function entryFor(id: string): UsageEntry {
  const day = dayKey();
  let e = usage.get(id);
  if (!e || e.day !== day) {
    e = { day, units: 0, merged: false };
    usage.set(id, e);
    if (usage.size > 20_000) usage.clear(); // coarse memory guard - resets, never leaks
  }
  return e;
}

/** How many AI units were used today. Merges remote storage on the first read of the day. */
export async function aiUnitsUsedToday(id: string): Promise<number> {
  const e = entryFor(id);
  if (!e.merged && persistent()) {
    e.merged = true; // even on failure we do not retry on every request - best effort
    try {
      const res = await fetch(
        `${supaUrl()}/rest/v1/usage_daily?${pgQuery(eq('identity', id), eq('day', e.day), pgSelect(['units']))}`,
        { headers: serviceHeaders(), signal: AbortSignal.timeout(3000) },
      );
      if (res.ok) {
        const rows = (await res.json()) as { units?: number }[];
        const remote = rows[0]?.units ?? 0;
        if (remote > e.units) e.units = remote;
      }
    } catch {
      /* no remote storage right now - local memory keeps protecting */
    }
  }
  return e.units;
}

/** Record usage after a model call - local immediately, remote in the background */
export function recordAiUnits(id: string, units: number): void {
  if (units <= 0) return;
  const e = entryFor(id);
  e.units += units;
  if (persistent()) {
    // Atomic RPC (insert on conflict update) - fire and forget
    fetch(`${supaUrl()}/rest/v1/rpc/bump_usage`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({ p_identity: id, p_day: e.day, p_units: units }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }
}

/** For tests only */
export function resetLimitsForTest(): void {
  windows.clear();
  usage.clear();
  lastPrune = 0;
}
