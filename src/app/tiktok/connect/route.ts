import { NextResponse } from 'next/server';
import {
  STATE_COOKIE,
  STATE_TTL_SECONDS,
  buildAuthorizeUrl,
  newState,
  tiktokConfig,
} from '@/lib/server/tiktok';

/**
 * GET /tiktok/connect - start the TikTok authorization.
 *
 * Generates a fresh `state`, puts it in an httpOnly cookie, and 302s to
 * TikTok. The callback compares the two.
 *
 * ## Why the cookie is the store
 *
 * The brief offered "server-side or a signed, short-lived httpOnly cookie".
 * This is the first of those in effect: the value is 32 random bytes that
 * only ever get compared with themselves, so there is nothing for a signature
 * to protect - an HMAC would prove the cookie came from us, which equality
 * with a value we generated already proves. What does the work is httpOnly
 * (script cannot read it), Secure (it cannot cross plain HTTP), SameSite=Lax
 * (it does not ride a cross-site POST), and a ten-minute lifetime.
 *
 * Say the word if you would rather it were signed anyway and I will add a
 * secret for it.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cfg = tiktokConfig();
  if (!cfg.ok) {
    /*
      Never redirect somewhere that will fail confusingly - send them back to
      the connect page, which says what is unset. The names of the missing
      variables are not secrets; their values are, and none is printed.

      Built from request.url rather than a constant so this also works when
      the site is served from localhost during testing.
    */
    const back = new URL('/tiktok', request.url);
    back.searchParams.set('error', 'config');
    back.searchParams.set('missing', cfg.missing.join(','));
    return NextResponse.redirect(back, 302);
  }

  const state = newState();
  const res = NextResponse.redirect(buildAuthorizeUrl(cfg.config.clientKey, state), 302);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/tiktok',
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
