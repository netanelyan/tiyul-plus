import { NextResponse } from 'next/server';
import { requestIp, resolveCaller } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { sendWelcome } from '@/lib/server/mailEvents';

/**
 * POST -> sends the welcome email to the signed-in caller. { ok, sent }
 *
 * Why a route at all: the moment of "first login" is known on the client
 * (`AuthContext` records consent once, when `terms_accepted_at` is still null)
 * and the mailer is server-only, so the client tells the server "this was the
 * first time" and the server sends. The recipient is resolved from the verified
 * token, never from the body - the client cannot address this email to anyone
 * but itself.
 *
 * Abuse surface is one's own inbox: a caller can at most welcome themselves,
 * and the limit below stops even that from being a nuisance. A missing mail
 * key is `sent:false`, not an error - the login flow that calls this must
 * never see a failure from it.
 */
export async function POST(request: Request) {
  // Before the token check: a burst from one address must not cost a GoTrue round trip each
  if (!checkLimit('welcome-burst', requestIp(request), 10, 60_000).ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }
  const caller = await resolveCaller(request);
  if (!caller.userId) return NextResponse.json({ ok: false, error: 'auth-required' }, { status: 401 });
  const limit = checkLimit('welcome-mail', caller.userId, 2, 24 * 60 * 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true, sent: false, reason: 'rate-limited' });

  const result = await sendWelcome(caller.userId);
  return NextResponse.json({ ok: true, sent: result.ok });
}
