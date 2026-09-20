/**
 * The mailer: what actually leaves for Resend, and the three rules `mail.ts`
 * promises - never throws, every value escaped, an unfilled placeholder aborts
 * the send. Plus a drift guard between the human-facing `emails/*.html` and
 * the generated module the server sends from.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EMAIL_TEMPLATES } from './emailTemplatesGenerated.ts';
import { renderTemplate, sendMail, escapeHtml, maskEmail, takeMailQuota, MAIL_LIMITS } from './mail.ts';
import { resetLimitsForTest } from './limits.ts';

const realFetch = globalThis.fetch;
const savedKey = process.env.RESEND_API_KEY;
const savedFrom = process.env.MAIL_FROM;
const savedReply = process.env.MAIL_REPLY_TO;

interface Sent {
  url: string;
  auth: string | undefined;
  body: { from: string; to: string[]; subject: string; html: string; reply_to?: string };
}
let sent: Sent[];
let respond: () => Response;

beforeEach(() => {
  resetLimitsForTest();
  sent = [];
  respond = () => new Response(JSON.stringify({ id: 're_123' }), { status: 200 });
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const h = init.headers as Record<string, string> | undefined;
    sent.push({ url: String(input), auth: h?.Authorization, body: JSON.parse(String(init.body)) });
    return respond();
  }) as typeof fetch;
  process.env.RESEND_API_KEY = 're_test_key';
  delete process.env.MAIL_FROM;
  delete process.env.MAIL_REPLY_TO;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedKey;
  if (savedFrom === undefined) delete process.env.MAIL_FROM;
  else process.env.MAIL_FROM = savedFrom;
  if (savedReply === undefined) delete process.env.MAIL_REPLY_TO;
  else process.env.MAIL_REPLY_TO = savedReply;
});

/* ---------- rendering ---------- */

test('a filled receipt carries the values, the subject and no leftover placeholder', () => {
  const r = renderTemplate('check-receipt', {
    TRIP_NAME: 'רומא במאי',
    PHOTO_URL: 'https://upload.wikimedia.org/x.jpg',
    ORDER_ID: '5O190127TN364715T',
    AMOUNT: '29.90 ₪',
    DATE: '20 בספטמבר 2026',
    TRIP_URL: 'https://www.tiyulplus.com/chat?trip=abc',
  });
  assert.ok(r);
  assert.equal(r.subject, 'קבלה: בדיקה לפני הנסיעה לרומא במאי');
  assert.match(r.html, /5O190127TN364715T/);
  assert.match(r.html, /29\.90 ₪/);
  assert.match(r.html, /src="https:\/\/upload\.wikimedia\.org\/x\.jpg"/);
  assert.doesNotMatch(r.html, /\{\{[A-Z_]+\}\}/);
});

test('**a user-typed value is HTML-escaped** - the internal alert is the owner’s mail client', () => {
  const r = renderTemplate('agent-enquiry-alert', {
    NAME: '<script>alert(1)</script>',
    BUSINESS: 'Tours & "Co"',
    CONTACT: 'x@y.com',
    DATE: 'today',
    MESSAGE: "a'b",
    ADMIN_URL: 'https://www.tiyulplus.com/admin',
  });
  assert.ok(r);
  assert.doesNotMatch(r.html, /<script>/);
  assert.match(r.html, /&lt;script&gt;/);
  assert.match(r.html, /Tours &amp; &quot;Co&quot;/);
  assert.match(r.html, /a&#39;b/);
});

test('**a prefix letter before a placeholder goes through hePrefix** - Vienna gets its doubled vav', () => {
  const r = renderTemplate('check-receipt', {
    TRIP_NAME: 'וינה',
    ORDER_ID: '1',
    AMOUNT: '1',
    DATE: '1',
    TRIP_URL: 'https://x',
  });
  assert.ok(r);
  assert.match(r.subject, /לווינה/);
  // In the body the name is emphasised: the tag sits between the prefix and the word
  assert.match(r.html, /ל<strong>ווינה<\/strong>/);
  assert.doesNotMatch(r.html, /לוינה|>וינה</);
});

test('no PHOTO_URL removes the whole hero row rather than leaving a broken image', () => {
  const vars = { TRIP_NAME: 'x', ORDER_ID: '1', AMOUNT: '1', DATE: '1', TRIP_URL: 'https://x' };
  const without = renderTemplate('check-receipt', vars);
  const withPhoto = renderTemplate('check-receipt', { ...vars, PHOTO_URL: 'https://p/1.jpg' });
  assert.ok(without && withPhoto);
  assert.doesNotMatch(without.html, /<!--hero-->/);
  assert.doesNotMatch(without.html, /<img src="\{\{PHOTO_URL\}\}"/);
  assert.doesNotMatch(without.html, /object-fit/);
  assert.match(withPhoto.html, /src="https:\/\/p\/1\.jpg"/);
});

test('**an unfilled placeholder aborts the render** - nobody receives {{ORDER_ID}}', () => {
  const r = renderTemplate('check-receipt', { TRIP_NAME: 'x', AMOUNT: '1', DATE: '1', TRIP_URL: 'https://x' });
  assert.equal(r, null);
});

test('welcome needs no placeholders and renders as-is', () => {
  const r = renderTemplate('welcome', {});
  assert.ok(r);
  assert.match(r.html, /tiyulplus\.com\/chat/);
});

/* ---------- sending ---------- */

test('the Resend call: bearer key, from, one recipient, rendered subject and html', async () => {
  const res = await sendMail({ to: 'dana@example.com', template: 'welcome' });
  assert.deepEqual(res, { configured: true, ok: true, id: 're_123' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.equal(sent[0].auth, 'Bearer re_test_key');
  assert.deepEqual(sent[0].body.to, ['dana@example.com']);
  assert.equal(sent[0].body.from, 'טיול+ <hello@tiyulplus.com>');
  assert.equal(sent[0].body.subject, EMAIL_TEMPLATES.welcome.subject);
  assert.match(sent[0].body.html, /<!DOCTYPE html>/);
  assert.equal(sent[0].body.reply_to, undefined);
});

test('MAIL_REPLY_TO and a per-message replyTo both reach Resend, the per-message one winning', async () => {
  process.env.MAIL_REPLY_TO = 'inbox@tiyulplus.com';
  await sendMail({ to: 'a@b.com', template: 'welcome' });
  assert.equal(sent[0].body.reply_to, 'inbox@tiyulplus.com');
  await sendMail({ to: 'a@b.com', template: 'welcome', replyTo: 'lead@agency.com' });
  assert.equal(sent[1].body.reply_to, 'lead@agency.com');
});

test('**no RESEND_API_KEY: nothing is sent, nothing throws, and the result says so**', async () => {
  delete process.env.RESEND_API_KEY;
  const res = await sendMail({ to: 'a@b.com', template: 'welcome' });
  assert.equal(res.configured, false);
  assert.equal(res.ok, false);
  assert.equal(sent.length, 0);
});

test('an unfilled placeholder is refused before any request leaves', async () => {
  const res = await sendMail({ to: 'a@b.com', template: 'check-receipt', vars: { TRIP_NAME: 'x' } });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'unfilled-placeholder');
  assert.equal(sent.length, 0);
});

test('a malformed recipient is refused before any request leaves', async () => {
  const res = await sendMail({ to: 'not-an-email', template: 'welcome' });
  assert.equal(res.error, 'bad-recipient');
  assert.equal(sent.length, 0);
});

test('**Resend answering 500 is a result, not an exception**', async () => {
  respond = () => new Response('boom', { status: 500 });
  const res = await sendMail({ to: 'a@b.com', template: 'welcome' });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'resend_http_500');
});

test('**a network failure is a result, not an exception**', async () => {
  globalThis.fetch = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  const res = await sendMail({ to: 'a@b.com', template: 'welcome' });
  assert.equal(res.ok, false);
  assert.match(String(res.error), /fetch failed/);
});

/* ---------- rate limits ---------- */

test('**one inbox cannot receive more than the hourly cap** - the enquiry form is not an email bomb', async () => {
  const cap = MAIL_LIMITS.perRecipientHour();
  for (let i = 0; i < cap; i++) {
    const r = await sendMail({ to: 'Victim@Example.com', template: 'welcome' });
    assert.equal(r.ok, true, `send ${i + 1} of ${cap} should pass`);
  }
  // Same inbox, different casing - still the same inbox
  const over = await sendMail({ to: 'victim@example.com', template: 'welcome' });
  assert.equal(over.ok, false);
  assert.equal(over.error, 'rate-limited');
  assert.equal(sent.length, cap, 'nothing left for Resend past the cap');
  // A different recipient is unaffected
  const other = await sendMail({ to: 'someone@else.com', template: 'welcome' });
  assert.equal(other.ok, true);
});

test('the global hourly cap stops a runaway loop across many recipients', async () => {
  process.env.MAIL_PER_HOUR = '3';
  try {
    assert.equal(takeMailQuota('a@x.com'), null);
    assert.equal(takeMailQuota('b@x.com'), null);
    assert.equal(takeMailQuota('c@x.com'), null);
    assert.equal(takeMailQuota('d@x.com'), 'global-hour');
  } finally {
    delete process.env.MAIL_PER_HOUR;
  }
});

test('the per-recipient cap is counted before rendering, so a limited send costs nothing', async () => {
  process.env.MAIL_PER_RECIPIENT_HOUR = '1';
  try {
    await sendMail({ to: 'a@x.com', template: 'welcome' });
    // Would be an unfilled-placeholder failure if it got as far as rendering
    const r = await sendMail({ to: 'a@x.com', template: 'check-receipt', vars: {} });
    assert.equal(r.error, 'rate-limited');
  } finally {
    delete process.env.MAIL_PER_RECIPIENT_HOUR;
  }
});

/* ---------- helpers ---------- */

test('escapeHtml covers the five characters and tolerates null', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

test('maskEmail keeps the first letter and the domain only', () => {
  assert.equal(maskEmail('natikyan153@gmail.com'), 'n***@gmail.com');
  assert.equal(maskEmail('garbage'), '***');
});

/* ---------- drift guard ---------- */

test('**emails/*.html and the generated module are the same templates** - regenerate, do not edit either', () => {
  const dir = join(process.cwd(), 'emails');
  const files = readdirSync(dir).filter((f) => f.endsWith('.html') && !f.startsWith('auth-'));
  assert.ok(files.length >= 10);
  const subjects = JSON.parse(readFileSync(join(dir, 'subjects.json'), 'utf8')) as { file: string; subject: string }[];
  for (const f of files) {
    const key = f.replace(/\.html$/, '') as keyof typeof EMAIL_TEMPLATES;
    const t = EMAIL_TEMPLATES[key];
    assert.ok(t, `${f} has no entry in emailTemplatesGenerated.ts`);
    assert.equal(readFileSync(join(dir, f), 'utf8'), t.html, `${f} differs from the generated module`);
    const subject = subjects.find((s) => s.file === f)?.subject;
    assert.equal(subject, t.subject, `${f} subject differs from subjects.json`);
  }
  // The auth template is Supabase's to fill and must never be in the app's send set
  assert.equal('auth-magic-link' in EMAIL_TEMPLATES, false);
});
