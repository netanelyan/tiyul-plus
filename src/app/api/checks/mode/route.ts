import { NextResponse } from 'next/server';
import { paypalMode } from '@/lib/server/paypal';

/**
 * GET → `{ mode }` בלבד. **בלי סוד** - זה בדיוק מה שהצד הזה צריך: להציג
 * את פס האזהרה "מצב בדיקה" עוד לפני שמנסים לשלם, כמו ש-`ActivitiesPanel`
 * עושה ל-Viator. לא דורש התחברות - זה לא מידע פרטי.
 */
export async function GET() {
  return NextResponse.json({ mode: paypalMode() });
}
