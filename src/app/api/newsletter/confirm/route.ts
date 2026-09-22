import { NextResponse } from 'next/server';
import { adminDbEnabled, adminInsert, adminRpc, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq } from '@/lib/server/pgrest';
import { checkLimit, dayKey } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { createMailToken, readMailToken } from '@/lib/server/mailToken';
import { sendMailInBackground } from '@/lib/server/mail';
import { canonical } from '@/lib/seo/site';

/**
 * POST { token } → { ok } · **the click that actually subscribes somebody.**
 *
 * This is the only place an address enters `newsletter_signups`, which is what
 * makes the claim "every address on our list confirmed it themselves" true by
 * construction rather than by policy.
 *
 * Three cases, all ending in the same stored state:
 *
 * - new address → inserted;
 * - already there and active → nothing to do, reported as success, because
 *   from the reader's point of view they are subscribed either way;
 * - already there but unsubscribed → `unsubscribed_at` is cleared. Somebody who
 *   left and came back has just given fresh consent, and refusing to honour
 *   that would leave them permanently unable to re-subscribe.
 *
 * The welcome email is sent in the background so a slow Resend call never
 * leaves the reader looking at a spinner after they have already been added.
 */
export async function POST(req: Request) {
  const caller = await resolveCaller(req);
  // Guessing a signature is infeasible; this exists so trying is not free.
  if (!checkLimit('newsletter-confirm', caller.id, 10, 10 * 60_000).ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }

  let token = '';
  try {
    const body = (await req.json()) as { token?: unknown };
    token = String(body.token ?? '').slice(0, 600);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }

  const read = readMailToken('confirm', token);
  if (!read.ok || !read.email) {
    // `expired` is told apart from the rest so the page can offer to re-send
    // rather than show a dead end for a link that was legitimate last week.
    const expired = read.reason === 'expired';
    return NextResponse.json(
      { ok: false, error: expired ? 'expired' : 'bad-token' },
      { status: expired ? 410 : 400 },
    );
  }
  if (!adminDbEnabled()) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }

  const email = read.email;
  const inserted = await adminInsert<{ email: string }>(
    'newsletter_signups',
    { email, source: 'footer' },
    { ignoreDuplicates: true },
  );
  if (!inserted) {
    return NextResponse.json({ ok: false, error: 'store-failed' }, { status: 502 });
  }

  if (inserted.length > 0) {
    // Counted here rather than at the form: only a confirmed address is a
    // subscriber, and counting the form would count strangers' typos too.
    void adminRpc('bump_event', { p_day: dayKey(), p_kind: 'newsletter' });
  } else {
    // Already on the list. Clearing `unsubscribed_at` is what makes coming back possible.
    await adminUpdate('newsletter_signups', eq('email', email), { unsubscribed_at: null });
  }

  const unsubscribe = createMailToken('unsubscribe', email);
  if (unsubscribe) {
    sendMailInBackground({
      to: email,
      template: 'newsletter-welcome',
      vars: {
        UNSUBSCRIBE_URL: `${canonical('/newsletter/unsubscribe')}?token=${encodeURIComponent(unsubscribe)}`,
      },
    });
  }

  return NextResponse.json({ ok: true, email });
}
