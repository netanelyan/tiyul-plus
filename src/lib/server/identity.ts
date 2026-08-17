import { effectivePlan, type Plan, type Tier } from '@/lib/plans';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

/**
 * Server only - identifying the caller for quotas and plan.
 *
 * Signed in (Authorization: Bearer <supabase access token>): the token is
 * verified against GoTrue (/auth/v1/user) and the plan is read from their
 * profile row (RLS - the user's token reads only their own row). Both
 * steps sit in a short in-memory cache so we do not add two network calls
 * to every chat message.
 *
 * Not signed in: the identity is the IP address (the first
 * x-forwarded-for - what Vercel sets). No attempt to identify beyond that.
 */

export interface Caller {
  /** The quota key: user:<uid> or ip:<addr> */
  id: string;
  /** The plan for **billing** purposes: free | premium */
  plan: Plan;
  /** The tier for **quota** purposes: anon | free | premium. Anonymous gets less. */
  tier: Tier;
  /**
   * The IP key, separate from `id`.
   *
   * Exists only for anonymous callers, and it is a **wide safety net**,
   * not a quota: `id` is the browser, and that is what separates people.
   * The IP exists to catch a single machine cycling browser identifiers
   * in a loop - which is why its ceiling is much higher, so it never
   * touches a mobile carrier's CGNAT.
   */
  ip?: string;
  userId: string | null;
}

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TOKEN_TTL = 5 * 60 * 1000;
const tokenCache = new Map<string, CacheEntry<string | null>>(); // token -> userId
const planCache = new Map<string, CacheEntry<Plan>>(); // userId -> plan

function cached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const e = map.get(key);
  if (!e) return undefined;
  if (e.expiresAt <= Date.now()) {
    map.delete(key);
    return undefined;
  }
  return e.value;
}

function put<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { value, expiresAt: Date.now() + TOKEN_TTL });
  if (map.size > 5000) map.clear();
}

async function verifyToken(token: string): Promise<string | null> {
  const hit = cached(tokenCache, token);
  if (hit !== undefined) return hit;
  let userId: string | null = null;
  try {
    const res = await fetch(`${supaUrl()}/auth/v1/user`, {
      headers: { apikey: anonKey()!, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const user = (await res.json()) as { id?: string };
      if (typeof user.id === 'string' && user.id) userId = user.id;
    }
  } catch {
    /* GoTrue unavailable - treat as anonymous, do not fail the request */
  }
  put(tokenCache, token, userId);
  return userId;
}

async function fetchPlan(userId: string, token: string): Promise<Plan> {
  const hit = cached(planCache, userId);
  if (hit !== undefined) return hit;
  let plan: Plan = 'free';
  try {
    const key = anonKey()!;
    const res = await fetch(
      `${supaUrl()}/rest/v1/profiles?${pgQuery(eq('user_id', userId), pgSelect(['plan', 'plan_until']))}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (res.ok) {
      // effectivePlan and not `plan === 'premium'`: an admin grant or a
      // promo code carries plan_until, and without this check a 30-day
      // grant would keep granting the premium quota forever. Single source
      // of truth - see lib/plans.ts.
      const rows = (await res.json()) as { plan?: string; plan_until?: string | null }[];
      plan = effectivePlan(rows[0] ?? null);
    }
  } catch {
    /* No plan read - free is the safe default */
  }
  if (plan === 'free') {
    // The SQL of supabase-admin.sql may not have run yet, in which case
    // the select with plan_until fails entirely. A second attempt without
    // the column, exactly like the fallback in lib/auth/profile.ts, so
    // existing premium does not vanish.
    try {
      const res = await fetch(
        `${supaUrl()}/rest/v1/profiles?${pgQuery(eq('user_id', userId), pgSelect(['plan']))}`,
        {
          headers: { apikey: anonKey()!, Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as { plan?: string }[];
        if (rows[0]?.plan === 'premium') plan = 'premium';
      }
    } catch {
      /* stay on free */
    }
  }
  put(planCache, userId, plan);
  return plan;
}

export function requestIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function resolveCaller(request: Request): Promise<Caller> {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (token && supaUrl() && anonKey()) {
    const userId = await verifyToken(token);
    if (userId) {
      const plan = await fetchPlan(userId, token);
      return { id: `user:${userId}`, plan, tier: plan, userId };
    }
  }
  /*
    Anonymous is a **separate tier, not "free"**. Netanel asked that
    heavy usage come from people with an account and trips: whoever has
    not signed up gets enough to build a real trip and be impressed, and
    whoever has gets the full quota. `plan` stays 'free' because it is a
    **billing** field - an anonymous account is not a customer.
  */
  return {
    id: anonIdentity(request),
    ip: `ip:${requestIp(request)}`,
    plan: 'free',
    tier: 'anon',
    userId: null,
  };
}

/**
 * Browser identifier first, and only after it the IP address.
 *
 * **Why this matters precisely here:** Israeli mobile carriers put an
 * enormous number of customers behind a small number of addresses
 * (CGNAT). A quota resting on IP alone counts them all as one person -
 * i.e. it blocks people who have never visited the site, because of
 * someone else sharing an address with them. That is exactly the
 * failure this mechanism exists to prevent, just from the other
 * direction.
 *
 * The identifier is created in the browser and stored there (see
 * `lib/clientId.ts`). It is not a secret and cannot be trusted against
 * an attacker - but it is **not meant** to be protection against an
 * attacker: it is meant to separate real people. Whoever deletes it
 * falls back to the IP-based quota, which is the stricter of the two -
 * i.e. there is no gain in dropping it.
 *
 * The format is deliberately restricted to the shape we generate: an
 * arbitrary string from the client will not become a quota key.
 */
const CLIENT_ID = /^[a-z0-9]{16,64}$/;

export function anonIdentity(request: Request): string {
  const raw = request.headers.get('x-client-id')?.trim().toLowerCase() ?? '';
  if (CLIENT_ID.test(raw)) return `anon:${raw}`;
  return `ip:${requestIp(request)}`;
}

/** Invalidate the plan cache after an upgrade (e.g. from the webhook) */
export function invalidatePlanCache(userId: string): void {
  planCache.delete(userId);
}

/** For tests only */
export function resetIdentityForTest(): void {
  tokenCache.clear();
  planCache.clear();
}
