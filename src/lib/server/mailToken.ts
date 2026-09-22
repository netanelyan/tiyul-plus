/**
 * Server only - signed links that arrive in an email and are clicked days later.
 *
 * Two of them exist: confirming a mailing-list subscription and leaving it.
 * Both have to work from a click with no session, so the address has to travel
 * inside the link - and a link that carries an address is a link anybody can
 * edit. The signature is what stops `?email=someone.else@example.com` from
 * being a way to subscribe or unsubscribe a stranger.
 *
 * ## Why confirmation expires and unsubscribe does not
 *
 * A confirmation link is an offer, and an offer that is still live two years
 * later is a way to quietly subscribe somebody from an old inbox. It lasts 48
 * hours.
 *
 * **An unsubscribe link must never expire.** It sits in an email the recipient
 * keeps, and section 30A of the Communications Law gives them the right to opt
 * out at any time - a link that answers "this link is no longer valid" is, in
 * practice, no unsubscribe mechanism at all. So the unsubscribe token carries
 * no expiry and is verified on the signature alone.
 *
 * ## The secret
 *
 * `MAIL_LINK_SECRET` if set, otherwise the Supabase service role key, which is
 * server-only and already required for the mailing list to work at all. The
 * fallback is deliberate: it means the feature has no new environment variable
 * to forget, and the day it fails is the day it could not have worked anyway.
 *
 * **Rotating that key invalidates every unsubscribe link already sent**, which
 * is the one reason to set `MAIL_LINK_SECRET` explicitly before going wide.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export type MailTokenPurpose = 'confirm' | 'unsubscribe';

/** 48 hours. Long enough for "I'll do it tonight", short enough not to be an open door. */
const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.MAIL_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export const mailTokensConfigured = () => Boolean(secret());

/** base64url without padding - safe in a URL and in an email client that re-wraps lines. */
const b64 = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(payload: string, key: string): string {
  return b64(createHmac('sha256', key).update(payload).digest());
}

/**
 * `<purpose>.<email>.<expiry>.<signature>`. The purpose is inside the signed
 * payload, so a confirmation token cannot be replayed as an unsubscribe token
 * or the other way round.
 */
export function createMailToken(purpose: MailTokenPurpose, email: string): string | null {
  const key = secret();
  if (!key) return null;
  const address = email.trim().toLowerCase();
  const expiry = purpose === 'confirm' ? String(Date.now() + CONFIRM_TTL_MS) : '0';
  const payload = `${purpose}.${b64(address)}.${expiry}`;
  return `${payload}.${sign(payload, key)}`;
}

export interface MailTokenResult {
  ok: boolean;
  email?: string;
  reason?: 'not-configured' | 'malformed' | 'bad-signature' | 'expired' | 'wrong-purpose';
}

export function readMailToken(purpose: MailTokenPurpose, token: string): MailTokenResult {
  const key = secret();
  if (!key) return { ok: false, reason: 'not-configured' };

  const parts = String(token ?? '').split('.');
  if (parts.length !== 4) return { ok: false, reason: 'malformed' };
  const [got, encoded, expiry, signature] = parts;

  const payload = `${got}.${encoded}.${expiry}`;
  const expected = sign(payload, key);
  // Compare in constant time, and only after the lengths match - timingSafeEqual
  // throws on a length mismatch, which would itself be a signal.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };

  // Checked after the signature on purpose: before it, these read attacker-controlled text.
  if (got !== purpose) return { ok: false, reason: 'wrong-purpose' };
  if (expiry !== '0' && Number(expiry) < Date.now()) return { ok: false, reason: 'expired' };

  const email = unb64(encoded).toString('utf8');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, reason: 'malformed' };
  return { ok: true, email };
}
