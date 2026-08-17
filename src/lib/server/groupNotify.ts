/**
 * Telling the organiser that something happened on their shared trip.
 *
 * ## Why a webhook and not an email library
 *
 * There is still no mailer in this project, and picking one is a business
 * decision with a cost - the session log has recorded that twice. So this reuses
 * the shape the budget alert already uses: one POST to a configured URL carrying
 * both `text` and `content`, which Slack, Discord and every request-to-email
 * service accept unchanged. No dependency, and nothing to choose before it works.
 *
 * **Unconfigured is a first-class state, not a failure.** With no
 * `GROUP_NOTIFY_WEBHOOK` set, nothing is sent, a line is logged, and the caller
 * carries on - a comment must never fail to save because a notification could not
 * be delivered. The UI likewise never promises an email; it says the organiser
 * will see it on the trip screen, which is true with or without this.
 *
 * ## Who gets told, and who deliberately does not
 *
 * **Only the organiser.** It is their trip and their account, so notifying them
 * about their own trip needs no further consent. Notifying the *members* - people
 * who joined a link - would mean emailing users about somebody else's activity,
 * and that is a consent question rather than a plumbing one. It is deliberately
 * not built here; the members see everything when they open the link.
 *
 * Nothing here contains trip content beyond a name and who acted: enough to know
 * it is worth opening, not a copy of the conversation in an inbox.
 */

export type GroupEvent = 'comment' | 'suggestion' | 'rsvp' | 'dates';

export interface NotifyResult {
  configured: boolean;
  ok: boolean;
  error?: string;
}

const LABEL: Record<GroupEvent, string> = {
  comment: 'הגיב על הטיול',
  suggestion: 'הציע מקום להוסיף',
  rsvp: 'עדכן אם הוא מגיע',
  dates: 'עדכן אילו תאריכים מתאימים לו',
};

/**
 * Fire-and-forget by design: callers do `void notifyOrganiser(...)` so the write
 * they just made returns immediately. Failures are logged, never thrown - the
 * same rule the budget alert follows.
 */
export async function notifyOrganiser(
  event: GroupEvent,
  actorName: string,
  tripName: string,
): Promise<NotifyResult> {
  const text = `טיול+ · ${actorName} ${LABEL[event]} "${tripName}"`;
  const hook = process.env.GROUP_NOTIFY_WEBHOOK;
  if (!hook) {
    console.info(`[group] notify (not sent, no GROUP_NOTIFY_WEBHOOK): ${text}`);
    return { configured: false, ok: false, error: 'no_webhook_configured' };
  }
  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `text` for Slack, `content` for Discord - same message, no new dependency
      body: JSON.stringify({ text, content: text, event }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const error = `webhook_http_${res.status}`;
      console.warn(`[group] notify delivery failed: ${error}`);
      return { configured: true, ok: false, error };
    }
    return { configured: true, ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'webhook_fetch_failed';
    console.warn(`[group] notify delivery failed: ${error}`);
    return { configured: true, ok: false, error };
  }
}
