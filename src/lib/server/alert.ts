/**
 * Server only - a general external alert (Slack/Discord/any
 * request-to-email service), **exactly the same pattern** as the private
 * `post()` in `server/budget.ts` - extracted here because it now has two
 * callers from two different features.
 *
 * `PURCHASE_ALERT_WEBHOOK` comes first, and if unset it falls back to the
 * existing `AI_BUDGET_ALERT_WEBHOOK` - so no new channel is needed if one
 * is already configured, and they can still be separated if desired.
 */
import { ALERT_MAX_CHARS, cleanLine } from '@/lib/logSafe';

export function postAlert(text: string, extra: Record<string, unknown> = {}): void {
  /*
    Flattened HERE rather than by each caller. Several alerts carry values a user
    typed - a trip name, a display name - and an alert is one line in a log and one
    message in a channel, so a newline in it forges an entry that reads as ours. Five
    callers meant five chances to forget; the sink cannot forget. Idempotent, so
    `errorAlert`'s own cleanLine on the message portion still stands.
  */
  const line = cleanLine(text, ALERT_MAX_CHARS);
  console.warn(`[alert] ${line}`);
  const hook = process.env.PURCHASE_ALERT_WEBHOOK ?? process.env.AI_BUDGET_ALERT_WEBHOOK;
  if (!hook) return;
  fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: line, content: line, ...extra }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}
