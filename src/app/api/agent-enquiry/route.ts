import { NextResponse } from 'next/server';
import { adminDbEnabled, adminInsert } from '@/lib/server/supabaseAdmin';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';
import { sendLeadEmails } from '@/lib/server/mailEvents';

/**
 * POST { name, business, contact, tripsPerYear?, needs? } -> { ok }
 *
 * The travel-agent / trip-organiser enquiry from the pricing page. Stored in
 * `agent_leads` in the same Supabase project as everything else (see
 * `sql/supabase-agent-leads.sql`) and read only in /admin - the table is
 * closed to both browser roles, so the insert happens here with the service
 * role rather than straight from the form.
 *
 * Three decisions, each of which the newsletter route already earned:
 *
 * - **With no key configured we answer 503, never "thanks".** A form that
 *   paints a checkmark and drops the enquiry on the floor is the worst
 *   outcome available here - worse than an error, because the person walks
 *   away believing they made contact.
 * - **Two emails, after the row is safely stored, and neither can fail the
 *   request.** An acknowledgement to the business when they left an email
 *   address, and the internal alert to `MAIL_OWNER` - the one that matters,
 *   because a lead that sits unread in /admin is a lost customer. Both go
 *   through `mailEvents`, which never throws; with no `RESEND_API_KEY` they
 *   are a log line and the lead is still in the dashboard. The form's copy
 *   promises only that we get back to them, which stays true either way.
 * - **Rate limited hard**, because it is publicly open, unauthenticated and
 *   writes a row. Three an hour is far above anyone with a real enquiry and
 *   far below anything worth doing on purpose.
 */

/** Shape only - a real address is proved by a reply landing, not by a regex */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
/**
 * Israeli-ish phone: digits, spaces, dashes, an optional +, 9-15 digits.
 * Deliberately loose - rejecting a valid number here costs a lead, and the
 * only thing that actually matters is that it is short and digit-shaped.
 */
const PHONE = /^\+?[\d\s-]{9,20}$/;

export async function POST(req: Request) {
  const caller = await resolveCaller(req);
  const burst = checkLimit('agent-lead-burst', caller.id, 3, 60 * 60_000);
  const daily = checkLimit('agent-lead-day', caller.id, 6, 24 * 60 * 60_000);
  if (!burst.ok || !daily.ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }

  let name = '';
  let business = '';
  let contact = '';
  let tripsPerYear = '';
  let needs = '';
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    name = str(body.name, 80);
    business = str(body.business, 120);
    contact = str(body.contact, 120);
    tripsPerYear = str(body.tripsPerYear, 40);
    needs = str(body.needs, 2000);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-request' }, { status: 400 });
  }

  if (!name || !business) {
    return NextResponse.json({ ok: false, error: 'missing-fields' }, { status: 400 });
  }

  /*
    One contact field, two accepted shapes. The kind is derived here rather
    than asked for: making somebody choose "email or phone" from a dropdown
    before typing it is a question a regex can answer.
  */
  const isEmail = EMAIL.test(contact);
  const isPhone = PHONE.test(contact);
  if (!isEmail && !isPhone) {
    return NextResponse.json({ ok: false, error: 'bad-contact' }, { status: 400 });
  }

  /*
    Per contact address as well as per caller: the IP limits above are what an
    attacker rotates, and the acknowledgement goes to whatever address was
    typed. Three a day per inbox is far above any real enquirer and stops the
    form being pointed at somebody. The mailer has its own per-recipient cap
    underneath this; two layers, because the row is written before the email.
  */
  const perContact = checkLimit('agent-lead-contact', contact.toLowerCase(), 3, 24 * 60 * 60_000);
  if (!perContact.ok) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 });
  }

  if (!adminDbEnabled()) {
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 503 });
  }

  const saved = await adminInsert('agent_leads', {
    name,
    business,
    contact: isEmail ? contact.toLowerCase() : contact,
    contact_kind: isEmail ? 'email' : 'phone',
    trips_per_year: tripsPerYear || null,
    needs: needs || null,
    // From the verified token when there is one, never from the body
    user_id: caller.userId ?? null,
  });
  if (!saved) {
    return NextResponse.json({ ok: false, error: 'store-failed' }, { status: 502 });
  }
  sendLeadEmails({
    name,
    business,
    contact: isEmail ? contact.toLowerCase() : contact,
    contactIsEmail: isEmail,
    tripsPerYear,
    needs,
  });
  return NextResponse.json({ ok: true });
}
