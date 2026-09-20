import { randomBytes, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from '@/lib/seo/site';

/**
 * The TikTok OAuth connect flow, server side.
 *
 * ## What this is for
 *
 * The publishing bot that posts to @tiyulplus lives on a different machine.
 * TikTok's app review requires the registered redirect URI to be a real page
 * on the registered domain, and it was not served at all - a reviewer
 * following it got the site's 404. These two routes are that page.
 *
 * ## Verified against the docs, not against a summary
 *
 * Checked at developers.tiktok.com before implementing, and two things differ
 * from the brief this was written from:
 *
 * 1. **`state` is required**, not optional.
 * 2. **The callback returns `scopes` (plural)** on success, alongside `code`
 *    and `state`. The token response separately carries `scope` (singular).
 *    Both matter: the plural one lets the success page name what was granted
 *    even before the exchange completes.
 *
 * Also from the docs, and easy to get wrong: the authorization code arrives
 * URL-encoded and **must be decoded before the exchange**. Next already
 * decodes `searchParams`, so the value handed on from the callback is the
 * decoded one and must not be decoded twice.
 *
 * ## Why this file holds no client secret
 *
 * The token exchange happens on the bot's VPS, not here - see the module doc
 * in TIKTOK-BOT-CONTRACT.md for the reasoning and the wire format. This
 * server therefore never sees `TIKTOK_CLIENT_SECRET`, never holds an access
 * token, and has nothing to leak if it is compromised.
 */

/** Exactly the value registered in the TikTok developer portal - www, no trailing slash. */
export const TIKTOK_REDIRECT_URI = `${SITE_URL}/tiktok/callback`;

/** Comma-separated, per the docs. Publishing needs both. */
export const TIKTOK_SCOPES = 'user.info.basic,video.publish';

export const TIKTOK_AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';

/** The cookie that proves the callback belongs to a connect we started. */
export const STATE_COOKIE = 'tiktok_oauth_state';
export const STATE_TTL_SECONDS = 600;

export interface TikTokConfig {
  clientKey: string;
  botUrl: string;
  botSecret: string;
}

/**
 * Configuration, or a list of what is missing.
 *
 * Returned rather than thrown so the pages can say which variable is unset
 * instead of rendering a stack trace - the brief is explicit that these
 * screens are on camera.
 */
export function tiktokConfig(): { ok: true; config: TikTokConfig } | { ok: false; missing: string[] } {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const botUrl = process.env.TIKTOK_BOT_URL?.trim();
  const botSecret = process.env.TIKTOK_BOT_SECRET?.trim();
  const missing = [
    !clientKey && 'TIKTOK_CLIENT_KEY',
    !botUrl && 'TIKTOK_BOT_URL',
    !botSecret && 'TIKTOK_BOT_SECRET',
  ].filter((v): v is string => Boolean(v));
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, config: { clientKey: clientKey!, botUrl: botUrl!, botSecret: botSecret! } };
}

/** 32 random bytes, url-safe. */
export function newState(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Constant-time comparison of the returned state against the cookie.
 *
 * Length is compared first because timingSafeEqual throws on a length
 * mismatch, and an attacker controls the length of what comes back.
 */
export function stateMatches(fromCookie: string | undefined, fromQuery: string | undefined): boolean {
  if (!fromCookie || !fromQuery) return false;
  const a = Buffer.from(fromCookie);
  const b = Buffer.from(fromQuery);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildAuthorizeUrl(clientKey: string, state: string): string {
  /*
    URLSearchParams rather than string concatenation: the redirect URI and the
    scope list both contain characters that must be encoded, and the registered
    URI has to match byte for byte after TikTok decodes it.
  */
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: TIKTOK_SCOPES,
    response_type: 'code',
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
  });
  return `${TIKTOK_AUTHORIZE_URL}?${params.toString()}`;
}

/** What the bot tells us after it has exchanged the code. No tokens here, by design. */
export interface BotConnectResult {
  ok: boolean;
  open_id?: string;
  /** Granted scopes as TikTok returned them in the token response. */
  scope?: string;
  /** Seconds until the access token expires, for display only. */
  expires_in?: number;
  /** Optional, if the bot also called user.info - lets the page name the account. */
  username?: string;
  display_name?: string;
  error?: string;
}

export type ForwardOutcome =
  | { kind: 'ok'; result: BotConnectResult }
  | { kind: 'bot-error'; status: number; error: string }
  | { kind: 'unreachable'; error: string };

/**
 * Hand the authorization code to the bot, which owns the client secret and
 * performs the exchange.
 *
 * The code is short-lived and single-use, so this is done once, server side,
 * immediately - not queued and not retried. A retry would present a code
 * TikTok has already consumed and would fail in a way that looks like a
 * different bug.
 */
export async function forwardCodeToBot(
  config: TikTokConfig,
  body: { code: string; scopes: string; redirect_uri: string },
): Promise<ForwardOutcome> {
  try {
    const res = await fetch(config.botUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.botSecret}`,
      },
      body: JSON.stringify(body),
      // The code expires in minutes; a hung bot must fail fast enough that the
      // page can tell the user to try again while the code is still usable.
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as BotConnectResult | null;
    if (!res.ok || !data || data.ok !== true) {
      return {
        kind: 'bot-error',
        status: res.status,
        // The bot's own message if it gave one, never its response body verbatim.
        error: data?.error ?? `HTTP ${res.status}`,
      };
    }
    return { kind: 'ok', result: data };
  } catch (err) {
    return { kind: 'unreachable', error: err instanceof Error ? err.name : 'fetch failed' };
  }
}
