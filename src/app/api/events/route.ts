import { adminRpc } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { sameOriginOk } from '@/lib/server/chatGuards';
import { dayKey } from '@/lib/server/limits';

/**
 * מונה אירועים - **התשובה לשאלה "כמה טיולים מיוצאים", בלי מעקב**.
 *
 * הדפסה, PDF, שיתוף בוואטסאפ וניווט קורים כולם בדפדפן ולא משאירים
 * שום עקבה בשרת, ולכן אי אפשר היה לענות על השאלה. הפתרון כאן הוא
 * **מונה ולא יומן**: נשמר רק "ביום הזה היו N הדפסות".
 *
 * מה שבמכוון **לא** נשמר: מי, איזה טיול, מתי בדיוק, מאיזו כתובת.
 * שורה במונה לא ניתנת לשיוך לאף אדם, וזו הסיבה שהיא מותרת.
 *
 * הנתיב פתוח לכל מי שגולש באתר (הפעולות האלה זמינות גם בלי חשבון),
 * ולכן יש עליו את אותן הגנות זולות כמו על שאר הנתיבים: מקור הבקשה
 * ומכסת קצב. הוא לא נוגע במודל ולא עולה כסף.
 */

const KINDS = new Set(['print', 'pdf', 'whatsapp', 'share', 'maps']);

export async function POST(req: Request) {
  /*
    **כל תשובה כאן היא 204, כולל דחייה.** ב-`/api/chat` מקור זר מקבל 403
    כי שם התשובה עולה כסף ומגיע לומר "לא". כאן אין מה להגן עליו מלבד
    דיוק המונה, ולכן אין סיבה שהנתיב יענה תשובות שונות לבקשות שונות -
    ובנוסף `trackEvent` נשלח תוך כדי ניווט, ותשובת שגיאה שם היא רעש
    בקונסולה של המשתמש בשביל כלום.
  */
  const counted = sameOriginOk(req);
  if (!counted) return new Response(null, { status: 204 });

  const caller = await resolveCaller(req);
  // תקרה נדיבה: אדם שמדפיס חמש פעמים הוא אדם, לא בעיה
  if (!checkLimit('events', caller.id, 60, 60 * 60_000).ok) return new Response(null, { status: 204 });

  let kind = '';
  try {
    const body = (await req.json()) as { kind?: unknown };
    kind = typeof body.kind === 'string' ? body.kind : '';
  } catch {
    return new Response(null, { status: 204 });
  }
  // רשימה סגורה. ערך אחר לא יוצר מפתח חדש - הוא פשוט לא נספר.
  if (!KINDS.has(kind)) return new Response(null, { status: 204 });

  // fire and forget: מונה לא מעכב הדפסה ולא מפיל אותה
  void adminRpc('bump_event', { p_day: dayKey(), p_kind: kind });
  return new Response(null, { status: 204 });
}
