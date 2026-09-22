import { NextResponse } from 'next/server';
import { adminDbEnabled, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq } from '@/lib/server/pgrest';
import { readMailToken } from '@/lib/server/mailToken';

/**
 * Leaving the mailing list. Section 30A of the Communications Law requires the
 * way out to be simple, free, and in the same channel the message arrived in -
 * so this is reachable from a link in every email, needs no account, no login
 * and no reason given.
 *
 * ## Why unsubscribing is a POST and the emailed link is a GET
 *
 * The link in the email lands on `/newsletter/unsubscribe`, a page, which then
 * POSTs here. The tempting shortcut - unsubscribe straight from the GET - is
 * wrong in a way that is invisible until it bites: **mail scanners and link
 * previewers fetch every URL in a message**, so a state-changing GET means some
 * recipients are silently unsubscribed by their own security software and never
 * hear from us again without ever having clicked anything.
 *
 * The page is therefore one button and no questions, which is as close to
 * one-click as it can honestly get - and Gmail's own Unsubscribe control still
 * works in a single click, because the email carries the RFC 8058 headers and
 * that POSTs here directly.
 *
 * ## Never says whether the address was on the list
 *
 * A valid token means its holder proved ownership of that address, so there is
 * no need to answer "were you subscribed?" - and answering would turn a link
 * somebody forwarded into a way to probe our list. Every valid token gets the
 * same success, whether a row was updated or not.
 */
async function unsubscribe(token: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const read = readMailToken('unsubscribe', token);
  if (!read.ok || !read.email) {
    return { status: 400, body: { ok: false, error: 'bad-token' } };
  }
  if (!adminDbEnabled()) {
    return { status: 503, body: { ok: false, error: 'not-configured' } };
  }

  const updated = await adminUpdate('newsletter_signups', eq('email', read.email), {
    unsubscribed_at: new Date().toISOString(),
  });
  // `null` is a failed request; an empty array is "no such row", which is a
  // perfectly good outcome here - they are not on the list, which is the goal.
  if (updated === null) {
    return { status: 502, body: { ok: false, error: 'store-failed' } };
  }
  return { status: 200, body: { ok: true, email: read.email } };
}

export async function POST(req: Request) {
  let token = '';
  try {
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const body = (await req.json()) as { token?: unknown };
      token = String(body.token ?? '');
    } else {
      // RFC 8058 one-click: Gmail and friends POST `List-Unsubscribe=One-Click`
      // as a form body, with the token carried in the URL we published.
      token = new URL(req.url).searchParams.get('token') ?? '';
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }

  const { status, body } = await unsubscribe(token.slice(0, 600));
  return NextResponse.json(body, { status });
}
