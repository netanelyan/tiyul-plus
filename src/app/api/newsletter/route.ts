import { NextResponse } from 'next/server';
import { adminDbEnabled } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { createMailToken, mailTokensConfigured } from '@/lib/server/mailToken';
import { mailConfigured, sendMail } from '@/lib/server/mail';
import { canonical } from '@/lib/seo/site';

/**
 * POST { email } → { ok } · **requests** a mailing-list subscription.
 *
 * ## The address is not stored here, and that is the whole design
 *
 * This used to insert the address on submit. Anyone can type anyone's address
 * into a public form, so that meant a stranger could put somebody else on our
 * list, and we would then have had no way to show that the person we were
 * mailing had ever agreed to it.
 *
 * Section 30A of the Communications Law wants consent from the recipient, and
 * the only proof of that which survives an argument is **their own click**. So
 * the flow is confirmed opt-in:
 *
 *   1. here: validate, rate-limit, and email a signed confirmation link,
 *   2. `/api/newsletter/confirm`: the click, which is what writes the row.
 *
 * Nothing is written in step 1 - not even "pending". A stranger typing your
 * address into our footer leaves no trace of you in our database, which is a
 * better answer to "what do you have on me" than any retention policy.
 *
 * ## The response is the same whatever happened
 *
 * Signed up, already signed up, previously unsubscribed - one response. The
 * alternative turns the form into a way to test whether an address is on our
 * list, which is a leak about somebody else. The one thing that IS reported
 * differently is failure to send, because a form that paints a green tick and
 * does nothing is the worst outcome available here.
 */

/** Shape check only. The real verification is the click on the link we send. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  const caller = await resolveCaller(req);
  // A publicly open form: a narrow gate, since there is no legitimate reason for a high rate here
  const burst = checkLimit('newsletter-burst', caller.id, 3, 10 * 60_000);
  const daily = checkLimit('newsletter-day', caller.id, 10, 24 * 60 * 60 * 1000);
  if (!burst.ok || !daily.ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }

  let email = '';
  try {
    const body = (await req.json()) as { email?: unknown };
    email = String(body.email ?? '').trim().toLowerCase().slice(0, 254);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'bad-email' }, { status: 400 });
  }

  /*
    `mailConfigured` belongs in this list, and leaving it out produced a small
    but real lie. Signup is a confirmed opt-in, so it cannot complete without a
    mailer - and with no `RESEND_API_KEY` the send below merely failed, which
    the client reports as "we could not send it, try again". That invites a
    retry that can never succeed, on every attempt, forever.

    "Not available right now" is the honest answer to a missing key. "Try
    again" stays for a send that genuinely failed once.
  */
  if (!adminDbEnabled() || !mailTokensConfigured() || !mailConfigured()) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }

  const token = createMailToken('confirm', email);
  if (!token) return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });

  /*
    A second cap, on the address rather than on the sender. Without it the form
    is a way to drop a confirmation email into somebody else's inbox on repeat -
    the rate limits above are keyed on the browser, which is what an abuser
    rotates. `sendMail` has its own per-recipient cap too; this one exists so
    the refusal happens before we spend a Resend call on it.
  */
  if (!checkLimit('newsletter-to', email, 2, 24 * 60 * 60 * 1000).ok) {
    // Deliberately reported as success: "we already emailed you" is information
    // about that address, and this endpoint tells a stranger nothing.
    return NextResponse.json({ ok: true });
  }

  const sent = await sendMail({
    to: email,
    template: 'newsletter-confirm',
    vars: {
      CONFIRM_URL: `${canonical('/newsletter/confirm')}?token=${encodeURIComponent(token)}`,
    },
  });
  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: 'send-failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
