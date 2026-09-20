/**
 * Server only - the project's mailer. Resend over its REST API, no SDK.
 *
 * ## What this is and is not
 *
 * Every email the app sends goes through `sendMail()`. It fills one of the
 * templates in `emailTemplatesGenerated.ts` (built from `scripts/build-emails.mjs`,
 * previewable as `emails/*.html`) and POSTs it to Resend. It exists for
 * transactional mail - a receipt, a subscription change, an enquiry
 * acknowledgement. It is not a marketing sender: there is no list, no
 * scheduling and no unsubscribe machinery here, and a template that carries an
 * `UNSUBSCRIBE_URL` placeholder is waiting for that machinery, not bypassing it.
 *
 * ## Three rules, each enforced here rather than at the call site
 *
 * 1. **A failed email never fails the thing that triggered it.** `sendMail`
 *    never throws and `sendMailInBackground` does not even wait. A receipt that
 *    could not be sent is a log line; a purchase that was refunded because the
 *    mailer was down would be a bug nobody could explain to the customer.
 * 2. **Every placeholder value is HTML-escaped.** Trip names, business names and
 *    enquiry text are user-typed. The internal lead alert lands in the owner's
 *    mail client, which is exactly where an unescaped `<script>` would matter.
 * 3. **An unfilled placeholder aborts the send.** A customer receiving a receipt
 *    that reads `{{ORDER_ID}}` has been told, in effect, that nobody looked. The
 *    stray token is logged with the template name so the call site can be fixed.
 *
 * ## Hebrew prefix letters
 *
 * A template may write the prefix letter lamed glued to `{{TRIP_NAME}}` ("to
 * <trip>"). The prefix letter and the value are
 * joined through `hePrefix`, so a trip named after Vienna renders with the
 * doubled vav the unpointed spelling requires - the bug entry (uu) in CLAUDE.md
 * fixed in fourteen places, kept out of a fifteenth by construction.
 *
 * ## Rate limits, at the mailer and not only at the routes
 *
 * Two caps, both in memory (`limits.ts` - per instance, the same caveat as
 * every other limit in this codebase, and enough against the loop they exist
 * to stop):
 *
 * - **Per recipient**: `MAIL_PER_RECIPIENT_HOUR` / `MAIL_PER_RECIPIENT_DAY`
 *   (5 / 12). The enquiry form acknowledges whatever address was typed into
 *   it, so without this cap the form is a tool for flooding somebody else's
 *   inbox with our name on it. A real person never receives more than a
 *   handful of transactional emails in a day.
 * - **Global**: `MAIL_PER_HOUR` / `MAIL_PER_DAY` (150 / 800). A bug that sends
 *   in a loop, or a burst of fake enquiries from many addresses, hits this
 *   before it hits Resend's quota or their abuse team. Sized so a genuinely
 *   busy day never touches it.
 *
 * A limited send is a result (`error: 'rate-limited'`) and a log line, never
 * an exception, and the count is taken BEFORE rendering so an attacker cannot
 * spend CPU on templates either. The OTP email is Supabase's and is not
 * counted here.
 *
 * ## Unconfigured
 *
 * With no `RESEND_API_KEY` nothing is sent and every call reports
 * `configured: false`. The call sites are written so this is safe: the code
 * ships before the key exists, and the key turns it on with no deploy.
 */
import { hePrefix } from '@/lib/hebrew';
import { EMAIL_TEMPLATES, type EmailTemplateName } from './emailTemplatesGenerated';
import { checkLimit } from './limits';

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8_000;
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const MAIL_LIMITS = {
  perRecipientHour: () => envInt('MAIL_PER_RECIPIENT_HOUR', 5),
  perRecipientDay: () => envInt('MAIL_PER_RECIPIENT_DAY', 12),
  globalHour: () => envInt('MAIL_PER_HOUR', 150),
  globalDay: () => envInt('MAIL_PER_DAY', 800),
};

/**
 * Consumes one send against every cap. Returns which cap refused, or null.
 * Per-recipient is keyed on the normalised address so `A@x.com` and `a@x.com`
 * are one inbox.
 */
export function takeMailQuota(to: string): 'recipient-hour' | 'recipient-day' | 'global-hour' | 'global-day' | null {
  const who = to.trim().toLowerCase();
  if (!checkLimit('mail-rcpt-hour', who, MAIL_LIMITS.perRecipientHour(), HOUR).ok) return 'recipient-hour';
  if (!checkLimit('mail-rcpt-day', who, MAIL_LIMITS.perRecipientDay(), DAY).ok) return 'recipient-day';
  if (!checkLimit('mail-global-hour', 'all', MAIL_LIMITS.globalHour(), HOUR).ok) return 'global-hour';
  if (!checkLimit('mail-global-day', 'all', MAIL_LIMITS.globalDay(), DAY).ok) return 'global-day';
  return null;
}

/** Placeholders the sender fills. Every value is escaped before it lands in HTML. */
export type MailVars = Record<string, string | number | null | undefined>;

export interface MailResult {
  configured: boolean;
  ok: boolean;
  /** A short machine reason on failure - never user-facing */
  error?: string;
  /** Resend's id on success - useful in the logs, not stored anywhere */
  id?: string;
}

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** The sender identity. Resend requires the domain to be verified; `tiyulplus.com` is. */
export const mailFrom = () => process.env.MAIL_FROM || 'טיול+ <hello@tiyulplus.com>';
export const mailReplyTo = () => process.env.MAIL_REPLY_TO || undefined;
/** Where internal alerts (a new lead) go. Unset means the alert is not sent, and says so. */
export const mailOwner = () => process.env.MAIL_OWNER || undefined;

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
/**
 * A single Hebrew prefix letter glued to a placeholder (`L{{TRIP_NAME}}`), or
 * with a tag in between (`L<strong>{{TRIP_NAME}}</strong>`) - opening tags between the letter and the
 * value are allowed, because that is how a template emphasises a name, and the
 * first test of this rule found exactly that case rendering the wrong Hebrew.
 * The letter must stand alone (start of text, after whitespace or a tag), so
 * the last letter of an ordinary word can never be mistaken for a prefix.
 */
const PREFIXED = /(^|[\s>(])([בלכמשהו])((?:<[a-z]+>)*)\{\{([A-Z][A-Z0-9_]*)\}\}/g;
const HERO = /<!--hero-->[\s\S]*?<!--\/hero-->/g;

export interface Rendered {
  subject: string;
  html: string;
}

/**
 * Fills a template. Returns `null` - and logs which token - when a placeholder
 * is left unfilled, so the caller cannot send a half-rendered email by accident.
 *
 * `PHOTO_URL` is special: an empty or missing value removes the whole hero row
 * instead of leaving a broken image at the top of the email.
 */
export function renderTemplate(name: EmailTemplateName, vars: MailVars): Rendered | null {
  const t = EMAIL_TEMPLATES[name];
  let html: string = t.html;
  let subject: string = t.subject;

  const photo = vars.PHOTO_URL;
  if (!photo) html = html.replace(HERO, '');

  const fill = (text: string) =>
    text
      .replace(PREFIXED, (m, before: string, prefix: string, tags: string, key: string) => {
        const v = vars[key];
        if (v === undefined || v === null) return m;
        // The prefix letter stays outside the tag; the word as spelled under it
        // (doubled vav included) is what gets emphasised: "l<strong>vvina</strong>"
        const joined = hePrefix(prefix, String(v));
        return before + escapeHtml(prefix) + tags + escapeHtml(joined.slice(prefix.length));
      })
      .replace(PLACEHOLDER, (m, key: string) => {
        const v = vars[key];
        if (v === undefined || v === null) return m;
        return escapeHtml(String(v));
      });

  html = fill(html);
  subject = fill(subject);

  const left = subject.match(PLACEHOLDER) ?? html.match(PLACEHOLDER);
  if (left) {
    console.warn(`[mail] template "${name}" has an unfilled placeholder ${left[0]} - not sent`);
    return null;
  }
  return { subject, html };
}

export interface SendInput {
  to: string;
  template: EmailTemplateName;
  vars?: MailVars;
  /** Override the default reply-to for this one message */
  replyTo?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends one email. Never throws. With no API key it returns
 * `{configured:false, ok:false}` and logs one line.
 */
export async function sendMail(input: SendInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[mail] not configured - would send "${input.template}" to ${maskEmail(input.to)}`);
    return { configured: false, ok: false, error: 'not-configured' };
  }
  if (!EMAIL_RE.test(input.to)) return { configured: true, ok: false, error: 'bad-recipient' };

  const limited = takeMailQuota(input.to);
  if (limited) {
    console.warn(`[mail] rate-limited (${limited}) "${input.template}" to ${maskEmail(input.to)}`);
    return { configured: true, ok: false, error: 'rate-limited' };
  }

  const rendered = renderTemplate(input.template, input.vars ?? {});
  if (!rendered) return { configured: true, ok: false, error: 'unfilled-placeholder' };

  const replyTo = input.replyTo ?? mailReplyTo();
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: mailFrom(),
        to: [input.to],
        subject: rendered.subject,
        html: rendered.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 300);
      console.warn(`[mail] resend ${res.status} sending "${input.template}" to ${maskEmail(input.to)}: ${body}`);
      return { configured: true, ok: false, error: `resend_http_${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { configured: true, ok: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[mail] send failed "${input.template}" to ${maskEmail(input.to)}: ${msg}`);
    return { configured: true, ok: false, error: msg.slice(0, 120) };
  }
}

/**
 * Fire-and-forget. The request that triggered the email must not wait on
 * Resend - a webhook handler in particular should answer PayPal quickly, and a
 * receipt arriving two seconds later is not something anybody notices.
 */
export function sendMailInBackground(input: SendInput): void {
  void sendMail(input);
}

/** `n***@example.com` - enough to recognise in a log, not enough to be personal data in one. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}
