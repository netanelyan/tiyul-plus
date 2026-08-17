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
export function postAlert(text: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[alert] ${text}`);
  const hook = process.env.PURCHASE_ALERT_WEBHOOK ?? process.env.AI_BUDGET_ALERT_WEBHOOK;
  if (!hook) return;
  fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, content: text, ...extra }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}
