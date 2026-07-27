import { actorFrom } from '@/lib/server/admin';
import { adminInsert, adminRpc, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';

/**
 * פדיון קוד הטבה ע"י המטייל עצמו. **לא** נתיב ניהול - כל משתמש מחובר
 * יכול לקרוא לו - ולכן הוא הנקודה החשופה ביותר בפיצ׳ר הזה, ובנוי בהתאם:
 *
 * - הזהות באה מהטוקן ולא מהגוף. אי אפשר לפדות קוד "בשם" מישהו אחר.
 * - הבדיקה והעדכון קורים ב-RPC אחד אטומי (`redeem_promo`), עם נעילת
 *   שורה. קריאה-ואז-כתיבה מהשרת הייתה מאפשרת לשתי בקשות במקביל לפדות
 *   את המקום האחרון בקוד.
 * - פדיון כפול נחסם ע"י מפתח ראשי כפול בדאטהבייס, לא ע"י תנאי בקוד.
 * - הודעות השגיאה לא מבדילות בין "קוד לא קיים" ל"קוד מלא" - אין סיבה
 *   לעזור למי שמנחש קודים.
 *
 * הענקה דרך קוד **מאריכה** פרימיום קיים ולא מקצרת אותו: מי שיש לו כבר
 * חודש מקבל חודש נוסף, ומי שיש לו מנוי Stripe ללא תאריך לא מאבד אותו.
 */
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(req: Request) {
  const actor = await actorFrom(req);
  if (!actor) return json({ ok: false, error: 'not_signed_in' }, 401);

  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{3,24}$/.test(code)) return json({ ok: false, error: 'bad_code' }, 400);

  const days = await adminRpc<number>('redeem_promo', { p_code: code, p_user: actor.userId });
  if (days === null) return json({ ok: false, error: 'unavailable' }, 503);
  if (days === -1) return json({ ok: false, error: 'already_redeemed' }, 409);
  if (days <= 0) return json({ ok: false, error: 'invalid_code' }, 404);

  // מאריכים מהתאריך הקיים אם הוא בעתיד, אחרת מעכשיו
  const current = await adminSelect<{ plan?: string; plan_until?: string | null }>(
    'profiles',
    `user_id=eq.${actor.userId}&select=plan,plan_until&limit=1`,
  );
  const row = current?.[0];
  const stripeForever = row?.plan === 'premium' && !row.plan_until;
  const base =
    row?.plan_until && Date.parse(row.plan_until) > Date.now()
      ? Date.parse(row.plan_until)
      : Date.now();
  const until = stripeForever ? null : new Date(base + days * 86_400_000).toISOString();

  const patch = {
    plan: 'premium',
    plan_until: until,
    plan_source: stripeForever ? 'stripe' : 'promo',
    updated_at: new Date().toISOString(),
  };
  let rows = await adminUpdate<{ user_id: string }>('profiles', `user_id=eq.${actor.userId}`, patch);
  if (rows && rows.length === 0) {
    rows = await adminInsert<{ user_id: string }>('profiles', { user_id: actor.userId, ...patch }, { upsert: true });
  }
  if (!rows) return json({ ok: false, error: 'unavailable' }, 503);

  await adminInsert('admin_audit', {
    actor_user_id: actor.userId,
    actor_email: actor.email,
    action: 'redeem_promo',
    target_user_id: actor.userId,
    target_email: actor.email,
    detail: { code, days, until },
  });

  return json({ ok: true, days, until });
}
