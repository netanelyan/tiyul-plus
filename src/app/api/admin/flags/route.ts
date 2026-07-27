import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert } from '@/lib/server/supabaseAdmin';
import { allFlags, invalidateFlags } from '@/lib/server/flags';

/** רק דגלים מוכרים - כדי שהטבלה לא תהפוך לשק זבל של מפתחות מומצאים */
const KNOWN = new Set(['agent_enabled']);

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();
  return ok({ flags: await allFlags() });
}

export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  let body: { key?: unknown; value?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('bad_json');
  }
  const key = typeof body.key === 'string' ? body.key : '';
  if (!KNOWN.has(key)) return badRequest('unknown_flag');
  if (typeof body.value !== 'boolean') return badRequest('bad_value');

  const rows = await adminInsert(
    'app_flags',
    { key, value: body.value, updated_at: new Date().toISOString(), updated_by: actor.userId },
    { upsert: true },
  );
  if (!rows) return badRequest('db_unavailable');
  invalidateFlags();
  await audit(actor, 'set_flag', {}, { key, value: body.value });
  return ok({ key, value: body.value });
}
