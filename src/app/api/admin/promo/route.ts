import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';

/** אותיות וספרות בלבד, באנגלית - קוד שאפשר להכתיב בטלפון */
const CODE_OK = /^[A-Z0-9]{3,24}$/;

/** GET: כל הקודים. POST: יצירה. PATCH: כיבוי/הדלקה. */
export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();
  const rows = await adminSelect<Record<string, unknown>>(
    'promo_codes',
    'select=code,days,max_redemptions,redeemed,expires_at,active,note,created_at&order=created_at.desc&limit=100',
  );
  return ok({ codes: rows ?? [] });
}

export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { code?: unknown; days?: unknown; max?: unknown; note?: unknown; expiresInDays?: unknown };
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
  const expiresInDays = Math.floor(Number(body.expiresInDays) || 0);
  const expires_at =
    expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null;

  const rows = await adminInsert<{ code: string }>('promo_codes', {
    code,
    days,
    max_redemptions: max,
    note,
    expires_at,
    created_by: actor.userId,
  });
  // מפתח ראשי כפול -> null. עדיף להגיד "הקוד תפוס" מלדרוס קוד קיים
  // שאולי כבר חולק לאנשים.
  if (!rows) return badRequest('code_taken_or_db_unavailable');

  await audit(actor, 'create_promo', {}, { code, days, max, expires_at, note: note ?? undefined });
  return ok({ code, days, max, expires_at });
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
  const rows = await adminUpdate<{ code: string }>('promo_codes', `code=eq.${code}`, { active });
  if (!rows) return badRequest('db_unavailable');
  await audit(actor, active ? 'enable_promo' : 'disable_promo', {}, { code });
  return ok({ code, active });
}
