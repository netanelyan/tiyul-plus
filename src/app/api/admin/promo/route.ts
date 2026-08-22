import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { eq } from '@/lib/server/pgrest';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import type { PaidPlan } from '@/lib/plans';

/** Letters and digits only, in Latin script - a code that can be dictated over the phone */
const CODE_OK = /^[A-Z0-9]{3,24}$/;

/** GET: all the codes. POST: create. PATCH: enable/disable. */
export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();
  const rows = await adminSelect<Record<string, unknown>>(
    'promo_codes',
    'select=code,days,plan,max_redemptions,redeemed,expires_at,active,note,created_at&order=created_at.desc&limit=100',
  );
  return ok({ codes: rows ?? [] });
}

export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { code?: unknown; days?: unknown; max?: unknown; note?: unknown; expiresInDays?: unknown; plan?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!CODE_OK.test(code)) return badRequest('bad_code');

  const days = Math.max(1, Math.min(3650, Math.floor(Number(body.days) || 30)));
  const max = Math.max(1, Math.min(100_000, Math.floor(Number(body.max) || 1)));
  const note = typeof body.note === 'string' ? body.note.slice(0, 200) : null;
  // Closed list, defaulting to the cheaper plan - an unrecognised value must
  // never be the one that widens a grant.
  const plan: PaidPlan = body.plan === 'pro' ? 'pro' : 'premium';
  const expiresInDays = Math.floor(Number(body.expiresInDays) || 0);
  const expires_at =
    expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null;

  const rows = await adminInsert<{ code: string }>('promo_codes', {
    code,
    days,
    plan,
    max_redemptions: max,
    note,
    expires_at,
    created_by: actor.userId,
  });
  // A duplicate primary key -> null. Better to say "that code is taken" than to overwrite an
  // existing code that may already have been handed out to people.
  if (!rows) return badRequest('code_taken_or_db_unavailable');

  await audit(actor, 'create_promo', {}, { code, days, plan, max, expires_at, note: note ?? undefined });
  return ok({ code, days, plan, max, expires_at });
}

export async function PATCH(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();
  let body: { code?: unknown; active?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!CODE_OK.test(code)) return badRequest('bad_code');
  const active = body.active === true;
  const rows = await adminUpdate<{ code: string }>('promo_codes', eq('code', code), { active });
  if (!rows) return badRequest('db_unavailable');
  await audit(actor, active ? 'enable_promo' : 'disable_promo', {}, { code });
  return ok({ code, active });
}
