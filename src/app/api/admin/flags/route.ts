import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminInsert } from '@/lib/server/supabaseAdmin';
import { allFlags, invalidateFlags } from '@/lib/server/flags';

/**
 * רק דגלים מוכרים - כדי שהטבלה לא תהפוך לשק זבל של מפתחות מומצאים.
 *
 * לכל דגל יש גם **סוג וטווח**, כי מפסק הוא בוליאני, תקרת הוצאה היא
 * מספר בדולרים, וחלק אנונימי הוא שבר בין 0 ל-1 - ודגל בלי טווח משלו
 * הוא הזמנה לכתוב 55 (כלומר 5,500%) במקום 0.55 ולגלות את זה בייצור.
 */
const KNOWN: Record<string, { type: 'boolean' | 'number'; min?: number; max?: number }> = {
  agent_enabled: { type: 'boolean' },
  ai_daily_budget_usd: { type: 'number', min: 0, max: 10_000 },
  /**
   * חלקה של התנועה האנונימית מהתקציב היומי, 0..1. ראו `anonShare()`
   * ב-`lib/server/budget.ts` - הרצפה של המחוברים (1-הערך) מוגנת שם
   * ע"י `min()` ולא כאן, כך שאין ערך שהטווח הזה מרשה שיכול לשבור אותה.
   */
  ai_anon_share: { type: 'number', min: 0, max: 1 },
};

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
  const spec = KNOWN[key];
  if (!spec) return badRequest('unknown_flag');
  if (spec.type === 'boolean' && typeof body.value !== 'boolean') return badRequest('bad_value');
  if (spec.type === 'number') {
    const n = Number(body.value);
    // גבול תחתון שלילי אינו מצב - 0 הוא ערך חוקי ומכוון (למשל "כבוי")
    if (!Number.isFinite(n) || n < (spec.min ?? 0) || n > (spec.max ?? 10_000)) {
      return badRequest('bad_value');
    }
    body.value = n;
  }

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
