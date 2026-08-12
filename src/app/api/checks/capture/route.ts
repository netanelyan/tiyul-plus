import { NextResponse } from 'next/server';
import { resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { captureOrder } from '@/lib/server/paypal';
import { findById, markFailed } from '@/lib/server/purchases';

/**
 * POST → מפעילה את הלכידה מול PayPal אחרי שהמטייל אישר שם. **זה לא
 * המקום שמעניק גישה** - ראו הכותרת של `server/paypal.ts`. לכידה
 * מוצלחת רק מבטיחה שהכסף זז; מה שקובע `status='paid'` הוא ורק ה-webhook
 * המאומת ב-`/api/checks/webhook`. עמוד החזרה קורא לזה ואז עובר למצב
 * "מאמתים", לא למצב "שולם".
 */
export async function POST(request: Request) {
  const caller = await resolveCaller(request);
  const burst = checkLimit('checks-capture', caller.id, 10, 10 * 60_000);
  if (!burst.ok) return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  if (!caller.userId) return NextResponse.json({ ok: false, error: 'auth-required' }, { status: 401 });

  let body: { purchaseId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : '';
  if (!purchaseId) return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });

  const purchase = await findById(purchaseId);
  // בעלות: אף אחד לא יכול לגרום לתשלום שלו ללכוד עבור מישהו אחר
  if (!purchase || purchase.user_id !== caller.userId) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }
  if (purchase.status === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }
  if (purchase.status !== 'pending' || !purchase.paypal_order_id) {
    return NextResponse.json({ ok: false, error: 'not-pending' }, { status: 409 });
  }

  const outcome = await captureOrder(purchase.mode, purchase.paypal_order_id);
  if (outcome.ok) {
    // ה-status נשאר pending בכוונה. הלקוח עובר לסקר את /api/checks/status.
    return NextResponse.json({ ok: true, captured: true });
  }

  if (outcome.reason === 'declined') {
    await markFailed(purchase.paypal_order_id, 'paypal capture declined');
    return NextResponse.json({ ok: false, error: 'declined' });
  }
  // 'network' / 'not-configured' / 'bad-response': זמני, לא נוגעים בשורה - אפשר לנסות שוב
  return NextResponse.json({ ok: false, error: 'retry' }, { status: 503 });
}
