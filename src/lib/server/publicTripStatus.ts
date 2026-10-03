/**
 * Is this published-trip slug live, withdrawn, or unknown - **and nothing else**.
 *
 * ## Why this exists beside `publicTrips.ts`, which can already answer it
 *
 * The only caller is `middleware.ts`, and middleware runs in the Edge runtime for
 * every matching request. `publicTrips.ts` imports the catalog (~4MB) in order to
 * validate place ids; pulling that into the middleware bundle would put the whole
 * of `destinations.ts` on the hot path of every `/trips/` request to answer a
 * question that needs one boolean.
 *
 * So this module is deliberately self-contained: `fetch`, two environment
 * variables, and the slug regex. No catalog, no Supabase client, no shared
 * helpers that might grow a Node-only dependency later.
 *
 * ## It fails open, on purpose
 *
 * Every failure - unconfigured, network error, bad JSON, slow - returns
 * `'unknown'`, and the caller lets the request through to the page. The opposite
 * default would mean a momentary database problem answers **410 Gone** for a
 * live page, and 410 is the one status that actively tells search engines to
 * forget a URL. A withdrawn page briefly answering 200 is recoverable; a live
 * page briefly answering 410 is not.
 */
import { isPublicTripSlug } from '@/lib/trip/publicTrip';

export type SlugStatus = 'live' | 'gone' | 'unknown';

/** Milliseconds before the lookup is abandoned and the request is let through. */
const TIMEOUT_MS = 1500;

export async function publicTripStatus(slug: string): Promise<SlugStatus> {
  if (!isPublicTripSlug(slug)) return 'unknown';

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return 'unknown';

  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  // Old-format keys are JWTs and are also sent as Bearer; the newer
  // sb_publishable_/sb_secret_ keys go through apikey only. Same rule as shareStore.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_public_trip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_slug: slug }),
      signal: abort.signal,
    });
    if (!res.ok) return 'unknown';
    const rows = (await res.json()) as { unpublished_at?: string | null }[] | null;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return 'unknown'; // never published - the page itself will 404
    return row.unpublished_at ? 'gone' : 'live';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}
