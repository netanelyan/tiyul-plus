/**
 * Server only - the admin area's authorization gate.
 *
 * ## The rule everything else rests on
 *
 * **The role is read from the database based on the token, never from the
 * request body.** A client can send `{"role":"owner"}` in any request, so
 * no route looks at what was sent: the token is verified against GoTrue,
 * we get a uuid, and read `profiles.role` with the service role. There is
 * no other way in.
 *
 * ## Why there is no cache on the role
 *
 * `identity.ts` caches the plan for 5 minutes, and that is fine for
 * quotas. Not here: a role demotion must take effect immediately, not
 * remain valid five minutes after it was revoked. Admin operations are
 * rare, so the cost is negligible.
 */

import { type Role, isRole, roleAtLeast } from '@/lib/plans';
import { adminInsert, adminSelect, adminDbEnabled, emailByUserId } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';

export interface Actor {
  userId: string;
  email: string | null;
  role: Role;
}

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

/** Verifies the token against GoTrue and returns a uuid, or null */
async function userIdFromToken(token: string): Promise<string | null> {
  if (!supaUrl() || !anonKey()) return null;
  try {
    const res = await fetch(`${supaUrl()}/auth/v1/user`, {
      headers: { apikey: anonKey()!, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return typeof u.id === 'string' ? u.id : null;
  } catch {
    return null;
  }
}

/**
 * Whether the admin area is configured on the server at all - i.e. there
 * is a URL and a service role. Useful for distinguishing "you lack
 * permission" from "the key is missing" (see /api/admin/me).
 */
export const adminConfigured = () => adminDbEnabled();

/**
 * Just "is this a genuinely signed-in someone", without the service role.
 * Lets us return a "not configured" message to a signed-in user even when
 * the key is missing - because without the key there is no way at all to
 * read their role, and therefore no other way to tell the states apart.
 */
export async function signedInUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  return token ? userIdFromToken(token) : null;
}


/**
 * Who the caller is. Returns null when there is no valid token, when the
 * service role is unconfigured, or when the role column does not exist yet
 * (the SQL has not run) - in all of these cases there is no admin access,
 * and that is the safe state.
 */
export async function actorFrom(req: Request): Promise<Actor | null> {
  if (!adminDbEnabled()) return null;
  const token = bearer(req);
  if (!token) return null;
  const userId = await userIdFromToken(token);
  if (!userId) return null;
  const rows = await adminSelect<{ role?: string }>(
    'profiles',
    pgQuery(eq('user_id', userId), pgSelect(['role']), pgLimit(1)),
  );
  if (!rows || rows.length === 0) return null;
  const role = isRole(rows[0].role) ? rows[0].role : 'user';
  return { userId, email: await emailByUserId(userId), role };
}

/**
 * Gate: returns the caller only if they hold at least the required role,
 * otherwise null. On null, the routes return the same response they return
 * to a signed-out user - without hinting that the area exists.
 */
export async function requireRole(req: Request, need: Role): Promise<Actor | null> {
  const actor = await actorFrom(req);
  if (!actor) return null;
  return roleAtLeast(actor.role, need) ? actor : null;
}

/** Uniform response for missing permission. 404 and not 403 on purpose - there is nothing to confirm to strangers. */
export const denied = () =>
  new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

export const badRequest = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

export const ok = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Audit log. Written **before** a successful response is returned, and a
 * failure to write it does not fail the operation - but it is logged on
 * the server, because a silent log is a log that does not exist.
 */
export async function audit(
  actor: Actor,
  action: string,
  target: { userId?: string | null; email?: string | null } = {},
  detail: Record<string, unknown> = {},
): Promise<void> {
  const row = await adminInsert('admin_audit', {
    actor_user_id: actor.userId,
    actor_email: actor.email,
    action,
    target_user_id: target.userId ?? null,
    target_email: target.email ?? null,
    detail,
  });
  if (!row) console.error('[admin] audit write failed', { action, actor: actor.email });
}
