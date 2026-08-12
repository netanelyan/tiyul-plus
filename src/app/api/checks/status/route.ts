import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { findForUserTrip } from '@/lib/server/purchases';
import { postAlert } from '@/lib/server/alert';

/**
 * GET → מצב הרכישה עבור טיול, לסקר אחרי חזרה מ-PayPal ולתצוגת
 * "כבר נרכש - רואים תוצאה, לא הצעה".
 *
 * **גם מנגנון הנראות ל"תקוע":** אם עברו יותר מ-3 דקות ועדיין `pending`,
 * זה בדיוק הרגע שהמטייל יושב ומחכה - ההתראה יוצאת כאן, פעם אחת לרכישה,
 * ולא ממתינה למישהו שיפתח את /admin. ה-3-דקות הזה משלים ולא מחליף את
 * הכרטיס באדמין: מטייל שסגר את הטאב לפני שהספיק לסקר לא יפעיל את זה,
 * ואז /admin (שמסמן רכישות תקועות מעל 15 דקות בכל טעינה) הוא הרשת השנייה.
 */

const POLL_ALERT_AFTER_MS = 3 * 60_000;
const alertedPurchases = new Set<string>();

export async function GET(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('checks-status', caller.id, 60, 60_000);
  if (!burst.ok) return NextResponse.json({ status: 'none' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ status: 'none', error: 'auth-required' }, { status: 401 });

  const url = new URL(request.url);
  const tripId = (url.searchParams.get('tripId') ?? '').slice(0, 100);
  if (!tripId) return NextResponse.json({ status: 'none' }, { status: 400 });

  const purchase = await findForUserTrip(caller.userId, tripId);
  if (!purchase) return NextResponse.json({ status: 'none' });

  if (purchase.status === 'paid') {
    return NextResponse.json({ status: 'paid', report: purchase.report, paidAt: purchase.paid_at });
  }
  if (purchase.status === 'pending') {
    const ageMs = Date.now() - Date.parse(purchase.created_at);
    if (Number.isFinite(ageMs) && ageMs > POLL_ALERT_AFTER_MS && !alertedPurchases.has(purchase.id)) {
      alertedPurchases.add(purchase.id);
      if (alertedPurchases.size > 5000) alertedPurchases.clear();
      postAlert(
        `⏳ טיול+ · רכישה ${purchase.id} עדיין pending אחרי ${Math.round(ageMs / 60_000)} דקות (טיול ${purchase.trip_id}). ייתכן שה-webhook התעכב או לא הגיע.`,
      );
    }
    return NextResponse.json({ status: 'pending' });
  }
  // failed / revoked - מבחינת הלקוח זה כמו "לא נרכש", אפשר להציע שוב
  return NextResponse.json({ status: 'none' });
}
