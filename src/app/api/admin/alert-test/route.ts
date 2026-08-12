import { requireRole, denied, ok, audit } from '@/lib/server/admin';
import { sendTestAlert } from '@/lib/server/budget';

/**
 * שולחת התראת בדיקה אמיתית, וממתינה לתשובה.
 *
 * זה ההבדל בין "ה-webhook מוגדר" לבין "בדקתי, וזה עבד" - נתנאל עומד
 * להריץ את התקרה קרוב לקצה ורוצה לדעת **לפני** שהוא צריך את ההתראה
 * שהיא באמת מגיעה, לא רק שהקוד שכותב אותה נראה נכון.
 */
export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const result = await sendTestAlert();
  await audit(actor, 'send_test_alert', {}, { ...result });
  return ok(result);
}
