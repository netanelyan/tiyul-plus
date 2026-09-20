# Email templates

Generated files. **Do not edit the HTML here** - edit `scripts/build-emails.mjs`
and run `node scripts/build-emails.mjs`. The shell (header, card, footer) lives
once in the script so twelve emails cannot drift apart.

## Who sends what

| file | sent by | trigger | placeholders |
|---|---|---|---|
| `auth-magic-link.html` | **Supabase Auth** (paste into dashboard) | login code requested | `{{ .Token }}`, `{{ .ConfirmationURL }}` |
| `welcome.html` | app | first login (when `terms_accepted_at` is first written) | - |
| `check-receipt.html` | app | `/api/checks/capture` succeeds | `TRIP_NAME`, `PHOTO_URL`, `ORDER_ID`, `AMOUNT`, `DATE`, `TRIP_URL` |
| `subscription-activated.html` | app | PayPal webhook `ACTIVATED` | `PLAN_NAME`, `PRICE`, `NEXT_BILLING_DATE` |
| `subscription-ended.html` | app | PayPal webhook `CANCELLED` / `EXPIRED` | `PLAN_NAME`, `END_DATE` |
| `payment-failed.html` | app | PayPal webhook `PAYMENT.FAILED` | `PLAN_NAME`, `RETRY_DATE` |
| `agent-enquiry-ack.html` | app | `/api/agent-enquiry` - to the business | `NAME`, `BUSINESS` |
| `agent-enquiry-alert.html` | app | `/api/agent-enquiry` - **internal, to the owner** | `NAME`, `BUSINESS`, `CONTACT`, `DATE`, `MESSAGE`, `ADMIN_URL` |
| `trip-reminder.html` | app (cron) - **not wired** | 7 days before `Trip.startDate`, **opt-in only** | `TRIP_NAME`, `PHOTO_URL`, `DAYS_HE`, `START_DATE`, `TRIP_URL`, `UNSUBSCRIBE_URL` |
| `group-digest.html` | app - **not wired** | activity on a group trip - **organizer only** | `TRIP_NAME`, `PHOTO_URL`, `SUMMARY`, `SUGGESTIONS`, `VOTES`, `COMMENTS`, `ANSWERS`, `TRIP_URL`, `UNSUBSCRIBE_URL` |
| `newsletter-confirm.html` | app - **not wired** | `/api/newsletter` signup (double opt-in) | `CONFIRM_URL` |
| `newsletter-welcome.html` | app - **not wired** | confirmation link clicked | `UNSUBSCRIBE_URL` |

`subjects.json` carries the subject line for each file, so subject and body are
maintained together.

## Supabase setup for the login code

1. Authentication → Email Templates → **Magic Link**: paste `auth-magic-link.html`
   as the body, subject `קוד ההתחברות: {{ .Token }}`.
2. Authentication → SMTP settings: sender name `טיול+`, sender `login@tiyulplus.com`.
3. Resend → Domains: confirm SPF, DKIM **and a `_dmarc` TXT record** exist -
   Gmail junks mail from domains without DMARC.

## The sender: `src/lib/server/mail.ts` + `mailEvents.ts`

The server imports `emailTemplatesGenerated.ts` (also written by the build
script) rather than reading this folder - Vercel bundles only what it can
trace. `mail.test.ts` asserts the two never drift. Wired today: receipt,
subscription activated/ended/payment-failed (`processCheckWebhook.ts`), the
two enquiry emails (`/api/agent-enquiry`), welcome (`/api/account/welcome`,
called once from the first sign-in). Rate limits live in the mailer itself:
5/hour and 12/day per recipient, 150/hour and 800/day site-wide, all
overridable by env - see `.env.example`.

## Rules the sender follows (enforced in `mail.ts`, listed here for the reader)

- **HTML-escape every placeholder value.** Trip names, business names and
  enquiry messages are user-typed. `MESSAGE` in the internal alert is the one
  place an attacker can put arbitrary text in front of the owner's mail client.
- `AMOUNT` / `PRICE` come from `PRICE_ILS` / `PREMIUM_PRICE_ILS` / `PRO_PRICE_ILS`
  in `src/lib/plans.ts` - never typed into a template.
- `DAYS_HE` comes from `daysHe()` - it is `יום אחד` / `יומיים` / `N ימים`, and a
  bare `${n} ימים` is the bug entry (xx) in CLAUDE.md fixed site-wide.
- Any placeholder that follows a prefix letter (`ל{{TRIP_NAME}}`, `ל{{BUSINESS}}`)
  must be built with `hePrefix()` from `src/lib/hebrew.ts` - a name starting with
  a vav doubles it (Vienna, Venice, Warsaw), the bug entry (uu) fixed in 14 places.
  Simplest: the sender substitutes the whole `ל{{X}}` pair, not just `{{X}}`.
- `PHOTO_URL` is the trip's first city's `photo` (or `iconicLandmark.photo`) from
  the catalog, **exactly as stored** - never a widened Wikimedia thumb (entry (k))
  and never a stock image. A city with no photo: send the email without the
  hero row rather than with a broken one.
- `DATE` / `START_DATE` / `END_DATE` come from the Hebrew formatter in
  `src/lib/trip/dates.ts` (local noon, never `new Date('YYYY-MM-DD')`).
- Resend is one `POST https://api.resend.com/emails` with a bearer key -
  no SDK needed (hard rule 6). Send from `hello@tiyulplus.com` with
  `reply_to` set to an inbox somebody reads; the OTP stays on `login@`.

## Consent, in one line each

- Transactional (receipt, subscription, enquiry ack, welcome): no consent needed.
- Trip reminder: only if the traveler ticked "remind me" on that trip.
- Group digest: organizer only. **Never** email people who joined through a link.
- Newsletter: double opt-in; every mail carries an unsubscribe link (Israeli
  spam law, section 30A of the Communications Law).

## Client constraints already handled in the shell

Tables not flex · inline styles only · Arial (Heebo will not load) · PNG logo
(Gmail strips SVG) · `dir="rtl"` on every text cell · the code box forced
`dir="ltr"` so digits cannot reorder · an RLM (`&#8207;`) after every `+` in the
brand name so it stays on the correct side of the line.
