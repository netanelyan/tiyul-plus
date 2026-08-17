import { NextResponse } from 'next/server';
import { adminDbEnabled, adminInsert, adminRpc } from '@/lib/server/supabaseAdmin';
import { checkLimit, dayKey } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';

/**
 * POST { email } → { ok } · newsletter signup.
 *
 * The addresses are stored in `newsletter_signups` in the same Supabase
 * project that already runs the accounts (see `supabase-newsletter.sql`).
 * The table is closed to anon and unreadable from the browser, so the
 * insert happens here on the server with the service role - not directly
 * from the form.
 *
 * Two decisions that depend on each other:
 *
 * - **The response is identical for "you signed up" and "you were already
 *   signed up".** Otherwise the form becomes a tool for checking whether
 *   a given address is on our list, which is a leak of information about
 *   other people. `Prefer: resolution=merge-duplicates` turns a repeat
 *   signup into a quiet no-op.
 * - **With no key configured we return an explicit 503**, not "success".
 *   A form that paints a green checkmark and saves nothing is the worst
 *   possible thing here.
 */

/** Shape check only. Real verification is a sent email, and that is a different stage. */
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
  let source = 'footer';
  try {
    const body = (await req.json()) as { email?: unknown; source?: unknown };
    email = String(body.email ?? '').trim().toLowerCase().slice(0, 254);
    if (typeof body.source === 'string') source = body.source.slice(0, 40);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: 'bad-email' }, { status: 400 });
  }

  if (!adminDbEnabled()) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }

  /*
    ignore-duplicates rather than merge: a duplicate comes back as an
    empty array, which is what lets the dashboard count only **new**
    addresses - without changing the client's response, which stays
    identical for new and duplicate (so the form does not become an
    address checker). A welcome side effect: a repeat signup does not
    overwrite the original source and date.

    The event is counted **here on the server** and not in the browser,
    for a double reason: only the server can tell new from duplicate, and
    the /api/events route rejects this kind from clients - otherwise the
    counter could be inflated in a loop without registering a single
    address.
  */
  const saved = await adminInsert('newsletter_signups', { email, source }, { ignoreDuplicates: true });
  if (!saved) {
    return NextResponse.json({ ok: false, error: 'store-failed' }, { status: 502 });
  }
  if (saved.length > 0) {
    void adminRpc('bump_event', { p_day: dayKey(), p_kind: 'newsletter' });
  }
  return NextResponse.json({ ok: true });
}
