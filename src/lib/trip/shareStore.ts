/**
 * Server only - do not import from a client component (the keys live in the
 * server's env; the server-only package is not in the project, so the
 * protection is this convention).
 *
 * Storage for short share links - Supabase (REST, no new dependency).
 *
 * ## What changed here, and why it is not just a key swap
 *
 * The table carried a `select ... to anon using (true)` policy named
 * "anyone can read a share link by code". **The name described an intent
 * the condition did not express**: `using (true)` is "every row", so anyone
 * holding the anon key - shipped with every page we serve - could pull all
 * of the site's share links in a single request.
 *
 * "Must know the code" is not a condition expressible in RLS: a policy sees
 * a row, not a query, so it cannot require that the caller specified
 * `code`. Hence both paths here changed shape, each for a different reason:
 *
 * - **Reads** go through `get_shared_trip(code)` (`security definer`).
 *   The function has no list-returning variant, so "one row per code" is
 *   structure, not convention. There is no `select` on the table here at all.
 * - **Writes** go through the service role, i.e. only from our server, i.e.
 *   always behind the quotas of `/api/share`. The previous policy let any
 *   browser write directly and bypass them entirely.
 *
 * The shared_trips table (see supabase-setup.sql and supabase-rls-fix.sql):
 * code (PK) ← the encoded v1 payload. We store the same base64url the long
 * link carries, so decoding and validation against the curated data stay in
 * decodeTripShare - a single point of truth.
 *
 * **Without `SUPABASE_SERVICE_ROLE_KEY` short-link creation is silently
 * off** and the client falls back to the long link, which works in full and
 * depends on no backend. Reading existing links keeps working without it
 * too, because the function has execute permission for anon.
 *
 * When user accounts arrive: the same table gains a user_id column and
 * trips are stored under the account - the short code is already set up
 * for that.
 */

import { pgIdent } from '@/lib/server/pgrest';

const baseUrl = () => process.env.SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; // without io01l

/** Code shape - the exact same shape is also enforced inside the SQL function */
const CODE_SHAPE = /^[a-zA-Z0-9]{6,12}$/;

function randomCode(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * Old-format anon keys are JWTs and are also sent as Bearer; the new
 * `sb_publishable_` / `sb_secret_` keys go through apikey only
 * (PostgREST rejects Bearer with a non-JWT value).
 */
function headers(key: string): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

/** Reads work with any key - the function is granted to anon and to service_role */
const readKey = () => serviceKey() ?? anonKey();

/** Reading an existing link is possible */
export const shareReadEnabled = () => Boolean(baseUrl() && readKey());

/**
 * Creating a short link is possible. **Requires the service role on
 * purpose** - it is the only way to guarantee that every write went
 * through our quotas.
 */
export const shareCreateEnabled = () => Boolean(baseUrl() && serviceKey());

/** Stores a payload and returns a short code, or null if storage is unconfigured/failed */
export async function createShareCode(payload: string): Promise<string | null> {
  if (!shareCreateEnabled()) return null;
  const url = baseUrl()!;
  const h = headers(serviceKey()!);
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode();
    try {
      const res = await fetch(`${url}/rest/v1/${pgIdent('shared_trips')}`, {
        method: 'POST',
        headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify({ code, payload }),
      });
      if (res.ok) return code;
      if (res.status === 409) continue; // rare code collision - roll a new one
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Fetches a payload by short code; null if it does not exist or storage is
 * off.
 *
 * Via the RPC and not via a `select` on the table: the function has no form
 * that returns more than one row, so even a bug in this code cannot turn it
 * into a list.
 */
export async function getSharedPayload(code: string): Promise<string | null> {
  if (!shareReadEnabled()) return null;
  // Local check before the network. The same check is repeated inside the
  // SQL function, because the only side that can be trusted is the side
  // that cannot be bypassed.
  if (!CODE_SHAPE.test(code)) return null;
  try {
    const res = await fetch(`${baseUrl()}/rest/v1/rpc/${pgIdent('get_shared_trip')}`, {
      method: 'POST',
      headers: headers(readKey()!),
      body: JSON.stringify({ p_code: code }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    // The function returns a scalar: the payload string, or null.
    const payload = (await res.json()) as unknown;
    return typeof payload === 'string' && payload.length > 0 ? payload : null;
  } catch {
    return null;
  }
}
