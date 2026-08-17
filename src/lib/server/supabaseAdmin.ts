/**
 * Server only. **Never import from a client component** - the key here
 * bypasses RLS entirely, and leaking it to the browser is equivalent to
 * handing over the database.
 *
 * Direct REST against Supabase with the service role, no new dependency
 * (hard rule 6), in the same style as `trip/shareStore.ts`.
 *
 * **Table/function names and the uuid go into the URL path and are therefore
 * validated** (`pgIdent` / `pgUuid`), and the filters are built only in
 * `pgrest.ts` - where every value is encoded. These two layers are what
 * makes PostgREST injection structurally impossible rather than "provided
 * every caller remembered to escape".
 *
 * Without `SUPABASE_SERVICE_ROLE_KEY` everything returns null / false and
 * the features that depend on it are silently off - the site itself keeps
 * working exactly as before. That is the actual state until Netanel runs
 * the SQL and adds the key.
 */

import { pgIdent, pgUuid } from '@/lib/server/pgrest';

const url = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const adminDbEnabled = () => Boolean(url() && serviceKey());

/**
 * **The only place that builds service-role headers.** `limits.ts` and
 * `budget.ts` kept a copy of their own that always sent `Bearer` - so with
 * an `sb_secret_` key (which is not a JWT) every write of theirs was
 * silently rejected, and the dashboard counters showed zero while calls
 * were genuinely being made. A second copy of logic like this is a bug in
 * waiting.
 */
export function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return headers(extra);
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const k = serviceKey()!;
  const h: Record<string, string> = {
    apikey: k,
    'Content-Type': 'application/json',
    ...extra,
  };
  // Only keys in the old format are JWTs and are also sent as Bearer.
  // Supabase's new `sb_secret_...` keys are not JWTs, and PostgREST rejects
  // a Bearer whose value is not a JWT - i.e. blindly sending both would
  // have broken the admin area precisely on new projects. The same
  // distinction already exists in trip/shareStore.ts for the anon key; it
  // was missed here.
  if (k.startsWith('eyJ')) h.Authorization = `Bearer ${k}`;
  return h;
}

/** GET on a table/view. `query` is a PostgREST query string without the ? */
export async function adminSelect<T>(table: string, query: string): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}?${query}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** DELETE by a pgrest query. Returns the deleted rows (or null on failure). */
export async function adminDelete<T>(table: string, query: string): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}?${query}`, {
      method: 'DELETE',
      headers: headers({ Prefer: 'return=representation' }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** PATCH by a condition. Returns the updated rows, or null on failure. */
export async function adminUpdate<T>(
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}?${query}`, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/**
 * INSERT (with optional upsert by primary key).
 *
 * `ignoreDuplicates` is the second form of upsert: a duplicate is not
 * written **and is not returned either** - an empty array means "everything
 * was a duplicate". That is what lets the newsletter route count only
 * genuinely new addresses without changing the response to the client
 * (which stays identical for new and duplicate, deliberately - so the form
 * cannot become an "is this address registered" oracle). One content
 * difference from merge: a duplicate does not touch the existing row - the
 * original source signature and date are preserved.
 */
export async function adminInsert<T>(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[],
  opts: { upsert?: boolean; ignoreDuplicates?: boolean } = {},
): Promise<T[] | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/${pgIdent(table)}`, {
      method: 'POST',
      headers: headers({
        Prefer: opts.ignoreDuplicates
          ? 'resolution=ignore-duplicates,return=representation'
          : opts.upsert
            ? 'resolution=merge-duplicates,return=representation'
            : 'return=representation',
      }),
      body: JSON.stringify(rows),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** RPC call (security definer) */
export async function adminRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!adminDbEnabled()) return null;
  try {
    const res = await fetch(`${url()}/rest/v1/rpc/${pgIdent(fn)}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(args),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Email by uuid and vice versa, via GoTrue's Admin API. The emails live in
 * auth, not in profiles, deliberately: they are never exposed to any client
 * query.
 */
export async function userByEmail(email: string): Promise<{ id: string; email: string } | null> {
  if (!adminDbEnabled()) return null;
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return null;
  try {
    const res = await fetch(
      `${url()}/auth/v1/admin/users?filter=${encodeURIComponent(clean)}&per_page=50`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { id: string; email?: string }[] };
    // `filter` is a partial search - we require an exact match so we never
    // act on a similar account by mistake (an email is an identifier, not a
    // free-text search)
    const hit = (data.users ?? []).find((u) => (u.email ?? '').toLowerCase() === clean);
    return hit ? { id: hit.id, email: hit.email ?? clean } : null;
  } catch {
    return null;
  }
}

/**
 * Email-by-uuid cache, in process memory. An account's email almost never
 * changes, and every admin dashboard load re-fetched the same emails - one
 * HTTP call to GoTrue per displayed row, plus one in `requireRole` on every
 * admin request. Short TTL (10 min) because the cost of a stale value is
 * cosmetic only (dashboard display, and the actor field in the audit log -
 * which carries the uuid anyway). **A failure is not cached**: a null from
 * the network could be a transient fault, and pinning it for 10 minutes
 * would show "no email" on a valid account.
 */
const EMAIL_TTL_MS = 10 * 60_000;
const emailCache = new Map<string, { email: string; at: number }>();

export async function emailByUserId(userId: string): Promise<string | null> {
  if (!adminDbEnabled()) return null;
  const hit = emailCache.get(userId);
  if (hit && Date.now() - hit.at < EMAIL_TTL_MS) return hit.email;
  try {
    const res = await fetch(`${url()}/auth/v1/admin/users/${pgUuid(userId)}`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { email?: string };
    if (u.email) {
      emailCache.set(userId, { email: u.email, at: Date.now() });
      if (emailCache.size > 5_000) emailCache.clear(); // crude memory guard
    }
    return u.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetching emails for several users in parallel - the fix for the N+1
 * pattern that sat in three admin routes (purchases / trips / spend): a
 * serial `await` loop that paid a full network round-trip per row. GoTrue
 * has no batch endpoint, so the parallelism is Promise.all - N round-trips
 * in parallel instead of in series, and the cache above turns the second
 * load of the same dashboard into zero network calls.
 */
export async function emailsByUserIds(userIds: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(userIds)];
  const pairs = await Promise.all(
    unique.map(async (id) => [id, await emailByUserId(id)] as const),
  );
  return new Map(pairs);
}

/**
 * The real account count, from `auth.users` and not from `profiles`.
 *
 * ## The bug this function was born from
 *
 * The status board showed "accounts: 1" while Netanel had several family
 * members' accounts. The reason: I counted rows in `profiles`, and a row
 * there is created only when somebody **saves** a profile (display name,
 * photo, country passport). Someone who signed in and used the site without
 * touching the personal area simply does not exist there.
 *
 * The general conclusion: `profiles` is a preferences table, not the user
 * list. The user list is `auth.users`, reached via GoTrue's Admin API.
 *
 * Pagination: GoTrue returns up to `per_page` per page and does not
 * guarantee a total field, so we page until a page comes back partial. A
 * ceiling of 25 pages (5,000 accounts) guards against a loop, and is marked
 * with `capped` so the number is not presented as exact if it was cut off.
 */
export async function countAuthUsers(): Promise<{ total: number; capped: boolean } | null> {
  if (!adminDbEnabled()) return null;
  const perPage = 200;
  let total = 0;
  for (let page = 1; page <= 25; page++) {
    try {
      const res = await fetch(`${url()}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
        headers: headers(),
        cache: 'no-store',
      });
      if (!res.ok) return page === 1 ? null : { total, capped: false };
      const data = (await res.json()) as { users?: unknown[] };
      const n = Array.isArray(data.users) ? data.users.length : 0;
      total += n;
      if (n < perPage) return { total, capped: false };
    } catch {
      return page === 1 ? null : { total, capped: false };
    }
  }
  return { total, capped: true };
}
