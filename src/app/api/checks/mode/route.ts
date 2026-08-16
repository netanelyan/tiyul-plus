import { NextResponse } from 'next/server';
import { paypalMode } from '@/lib/server/paypal';

/**
 * GET → `{ mode }` בלבד. **בלי סוד** - זה בדיוק מה שהצד הזה צריך: להציג
 * את פס האזהרה "מצב בדיקה" עוד לפני שמנסים לשלם, כמו ש-`ActivitiesPanel`
 * עושה ל-Viator. לא דורש התחברות - זה לא מידע פרטי.
 */
export async function GET() {
  // התשובה נגזרת ממשתני סביבה בלבד - היא לא יכולה להשתנות בלי דיפלוי,
  // ונשלפה עד עכשיו בכל טעינה של מסך הטיול אצל כל מבקר. 5 דקות במטמון
  // (דפדפן + CDN) הן אפס סיכון: אחרי דיפלוי שמחליף מצב, הפס הכתום של
  // ה-sandbox מתעדכן תוך דקות - וזה ממילא מסך שנטען מחדש בין רכישות.
  return NextResponse.json(
    { mode: paypalMode() },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  );
}
