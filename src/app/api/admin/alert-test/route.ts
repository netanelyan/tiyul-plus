import { requireRole, denied, ok, audit } from '@/lib/server/admin';
import { sendTestAlert } from '@/lib/server/budget';

/**
 * Sends a real test alert, and waits for the answer.
 *
 * This is the difference between "the webhook is configured" and "I checked, and it worked" -
 * Netanel is about to run the ceiling close to the edge and wants to know **before** he needs the
 * alert that it genuinely arrives, not merely that the code writing it looks right.
 */
export async function POST(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const result = await sendTestAlert();
  await audit(actor, 'send_test_alert', {}, { ...result });
  return ok(result);
}
