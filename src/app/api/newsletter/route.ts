import { NextResponse } from 'next/server';
import { adminDbEnabled, adminInsert } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';

/**
 * POST { email } → { ok } · הרשמה לרשימת הדיוור.
 *
 * הכתובות נשמרות ב-`newsletter_signups` באותו פרויקט Supabase שכבר
 * מריץ את החשבונות (ראו `supabase-newsletter.sql`). הטבלה סגורה ל-anon
 * ולא ניתנת לקריאה מהדפדפן, ולכן ההוספה נעשית כאן בשרת עם ה-service
 * role - ולא ישירות מהטופס.
 *
 * שתי החלטות שקשורות זו בזו:
 *
 * - **התשובה זהה בין "נרשמת" ל"כבר היית רשום".** אחרת הטופס הופך לכלי
 *   שבודק אם כתובת מסוימת נמצאת ברשימה שלנו, וזה דליפה של מידע על
 *   אנשים אחרים. `Prefer: resolution=merge-duplicates` הופך הרשמה
 *   חוזרת ל-no-op שקט.
 * - **בלי המפתח מוגדר מחזירים 503 מפורש** ולא "הצלחה". טופס שמצייר וי
 *   ירוק ולא שומר כלום הוא הדבר הכי גרוע שאפשר לעשות כאן.
 */

/** בדיקת צורה בלבד. אימות אמיתי הוא מייל שנשלח, וזה שלב אחר. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  const caller = await resolveCaller(req);
  // טופס פתוח לציבור: שער צר, כי אין כאן שום סיבה לגיטימית לקצב גבוה
  const burst = checkLimit('newsletter-burst', caller.id, 3, 10 * 60_000);
  const daily = checkLimit('newsletter-day', caller.id, 10, 24 * 60 * 60 * 1000);
  if (!burst.ok || !daily.ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }

  let email = '';
  let source = 'footer';
  try {
    const body = (await req.json()) as { email?: unknown; source?: unknown };
    email = String(body.email ?? '').trim().toLowerCase().slice(0, 254);
    if (typeof body.source === 'string') source = body.source.slice(0, 40);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'bad-email' }, { status: 400 });
  }

  if (!adminDbEnabled()) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }

  // upsert: הרשמה חוזרת היא no-op שקט, ולכן התשובה זהה בשני המקרים
  const saved = await adminInsert('newsletter_signups', { email, source }, { upsert: true });
  if (!saved) {
    return NextResponse.json({ ok: false, error: 'store-failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
