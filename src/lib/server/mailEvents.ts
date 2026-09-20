/**
 * Server only - one function per email the app sends, so a call site is a
 * single line and every value a template needs is assembled in one place.
 *
 * Each function resolves the recipient from the user id through GoTrue (never
 * from anything the client sent), fills the template from real data - prices
 * from `plans.ts`, dates through the Hebrew formatter, the trip's own city photo
 * from the catalog - and hands off to `sendMailInBackground`, which never
 * throws. A call site therefore cannot fail because of email, and cannot send
 * a value the template did not get from us.
 */
import { destinations } from '@/data/destinations';
import { daysHe } from '@/lib/duration';
import { PREMIUM_PRICE_ILS, PRO_PRICE_ILS, type PaidPlan } from '@/lib/plans';
import { formatHebrewDate, todayISO } from '@/lib/trip/dates';
import type { Trip } from '@/lib/trip/types';
import { emailByUserId } from './supabaseAdmin';
import { mailOwner, sendMail, sendMailInBackground, type MailResult } from './mail';

const SITE = 'https://www.tiyulplus.com';

export const PLAN_NAME_HE: Record<PaidPlan, string> = { premium: 'פרימיום', pro: 'פרו' };
const ils = (n: number) => `${n.toFixed(2)} ₪`;
const planPrice = (plan: PaidPlan) => ils(plan === 'pro' ? PRO_PRICE_ILS : PREMIUM_PRICE_ILS);
const today = () => formatHebrewDate(todayISO(), { year: true });

/**
 * The trip's own city, as a photo for the hero row. The stored catalog URL
 * exactly as it is - never widened (entry (k) in CLAUDE.md) - and undefined
 * when the city has none, which drops the row rather than showing a broken one.
 */
export function tripPhoto(trip: Pick<Trip, 'citySlugs'> | null | undefined): string | undefined {
  const slug = trip?.citySlugs?.[0];
  if (!slug) return undefined;
  const d = destinations.find((x) => x.slug === slug);
  return d?.photo ?? d?.iconicLandmark?.photo ?? undefined;
}

const tripUrl = (tripId: string) => `${SITE}/chat?trip=${encodeURIComponent(tripId)}`;

/**
 * A PayPal timestamp ("2026-10-03T10:00:00Z") as a Hebrew date, or a stated
 * fallback. The fallback carries the preposition because the template does not.
 */
function paypalDateHe(iso: string | undefined, fallback: string): string {
  const day = iso?.slice(0, 10);
  const formatted = day ? formatHebrewDate(day, { year: true }) : '';
  return formatted ? `ב-${formatted}` : fallback;
}

/* ---------- money ---------- */

export function sendCheckReceipt(input: {
  userId: string;
  tripId: string;
  tripName: string;
  trip: Pick<Trip, 'citySlugs'> | null;
  orderId: string;
  amount: number;
  currency: string;
}): void {
  void (async () => {
    const to = await emailByUserId(input.userId);
    if (!to) return;
    sendMailInBackground({
      to,
      template: 'check-receipt',
      vars: {
        TRIP_NAME: input.tripName,
        PHOTO_URL: tripPhoto(input.trip),
        ORDER_ID: input.orderId,
        AMOUNT: input.currency === 'ILS' ? ils(input.amount) : `${input.amount.toFixed(2)} ${input.currency}`,
        DATE: today(),
        TRIP_URL: tripUrl(input.tripId),
      },
    });
  })();
}

export function sendSubscriptionActivated(input: {
  userId: string;
  plan: PaidPlan;
  nextBillingTime?: string;
}): void {
  void (async () => {
    const to = await emailByUserId(input.userId);
    if (!to) return;
    sendMailInBackground({
      to,
      template: 'subscription-activated',
      vars: {
        PLAN_NAME: PLAN_NAME_HE[input.plan],
        PRICE: planPrice(input.plan),
        NEXT_BILLING_DATE: paypalDateHe(input.nextBillingTime, 'בעוד חודש').replace(/^ב-/, ''),
      },
    });
  })();
}

export function sendSubscriptionEnded(input: { userId: string; plan: PaidPlan }): void {
  void (async () => {
    const to = await emailByUserId(input.userId);
    if (!to) return;
    sendMailInBackground({
      to,
      template: 'subscription-ended',
      vars: { PLAN_NAME: PLAN_NAME_HE[input.plan], END_DATE: today() },
    });
  })();
}

export function sendPaymentFailed(input: { userId: string; plan: PaidPlan; retryTime?: string }): void {
  void (async () => {
    const to = await emailByUserId(input.userId);
    if (!to) return;
    sendMailInBackground({
      to,
      template: 'payment-failed',
      vars: {
        PLAN_NAME: PLAN_NAME_HE[input.plan],
        RETRY_DATE: paypalDateHe(input.retryTime, 'בימים הקרובים'),
      },
    });
  })();
}

/* ---------- leads ---------- */

export interface LeadInput {
  name: string;
  business: string;
  contact: string;
  contactIsEmail: boolean;
  tripsPerYear: string;
  needs: string;
}

/**
 * Two emails from one enquiry: an acknowledgement to the business (only when
 * they left an email - a phone number gets nothing automatic) and the internal
 * alert to the owner. The alert is the one that matters commercially: a lead
 * that sits unread in `/admin` for three days is a lost customer.
 */
export function sendLeadEmails(lead: LeadInput): void {
  if (lead.contactIsEmail) {
    sendMailInBackground({
      to: lead.contact,
      template: 'agent-enquiry-ack',
      vars: { NAME: lead.name, BUSINESS: lead.business },
    });
  }
  const owner = mailOwner();
  if (!owner) {
    console.info('[mail] MAIL_OWNER unset - lead alert not emailed (the lead is in /admin)');
    return;
  }
  const message = [lead.needs, lead.tripsPerYear ? `טיולים בשנה: ${lead.tripsPerYear}` : '']
    .filter(Boolean)
    .join('\n');
  sendMailInBackground({
    to: owner,
    template: 'agent-enquiry-alert',
    vars: {
      NAME: lead.name,
      BUSINESS: lead.business,
      CONTACT: lead.contact,
      DATE: today(),
      MESSAGE: message || '(לא נכתבה הודעה)',
      ADMIN_URL: `${SITE}/admin`,
    },
    // Replying to the alert should reach the lead, not our own inbox
    replyTo: lead.contactIsEmail ? lead.contact : undefined,
  });
}

/* ---------- account ---------- */

/** Awaited on purpose: the route reports whether it was sent, which is what the test asserts. */
export async function sendWelcome(userId: string): Promise<MailResult> {
  const to = await emailByUserId(userId);
  if (!to) return { configured: false, ok: false, error: 'no-email' };
  return sendMail({ to, template: 'welcome' });
}

/* ---------- not wired yet, kept here so the shape is decided ---------- */

/** The reminder needs a cron and an opt-in on the trip before it can be called. */
export function reminderVars(trip: Pick<Trip, 'id' | 'name' | 'citySlugs' | 'startDate'>, daysLeft: number) {
  return {
    TRIP_NAME: trip.name,
    PHOTO_URL: tripPhoto(trip),
    DAYS_HE: daysHe(daysLeft),
    START_DATE: trip.startDate ? formatHebrewDate(trip.startDate, { weekday: true, year: true }) : '',
    TRIP_URL: tripUrl(trip.id),
  };
}
