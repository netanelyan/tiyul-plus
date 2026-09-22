import { requestIp } from '@/lib/server/identity';
import { checkLimit } from '@/lib/server/limits';
import { sameOriginOk } from '@/lib/server/chatGuards';
import { cleanLine, reportError, type ErrorKind } from '@/lib/server/errorAlert';

/**
 * The browser's half of "will you know immediately if something fails?".
 *
 * `instrumentation.ts` catches every failure on the server. It cannot see a
 * failure that happens **in the visitor's browser** - a component that throws
 * on hydration, a bad state update on an interaction - and those are the ones
 * the user actually stares at. The two error boundaries (`app/error.tsx` and
 * `app/global-error.tsx`) post here exactly once per failure.
 *
 * ## This endpoint accepts attacker-controlled text that lands in a human's
 * chat client, so it is treated as such
 *
 * 1. **Same-origin only.** A browser sends `Origin` on every POST, so this
 *    costs nothing for the real caller and closes the endpoint to anything
 *    calling it directly.
 * 2. **Three narrow fields**, each shape-checked and length-capped. `kind` is
 *    a closed set; `digest` must look like a digest; `path` must look like a
 *    path. Only `message` is free text, and it goes through `cleanLine`.
 * 3. **Rate limited twice** - per address, and globally, because the thing
 *    being protected is not our CPU, it is the alert channel. One flooded
 *    channel is one muted channel.
 * 4. **The reporter dedupes** by fingerprint, so even a genuine bug that
 *    breaks the page for every visitor produces one message an hour.
 *
 * ## It always answers 204
 *
 * Including when rate-limited or rejected. This is telemetry: the browser has
 * nothing useful to do with a failure here, and an error response would invite
 * a retry loop from a page that is already broken.
 */

const KINDS: ErrorKind[] = ['client', 'client-fatal'];
const DIGEST = /^[A-Za-z0-9_-]{1,64}$/;
const PATH = /^\/[\w\-/[\]%.@]{0,200}$/;

/** A global ceiling on top of the per-address one: the channel is the scarce thing. */
const GLOBAL_MAX_PER_HOUR = 60;

const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  if (!sameOriginOk(request)) return noContent();

  const ip = requestIp(request);
  if (!checkLimit('client-error-ip', ip, 5, 60_000).ok) return noContent();
  if (!checkLimit('client-error-ip-day', ip, 40, 24 * 60 * 60_000).ok) return noContent();
  if (!checkLimit('client-error-all', 'global', GLOBAL_MAX_PER_HOUR, 60 * 60_000).ok) {
    return noContent();
  }

  // A body this small cannot be a legitimate report if it is large.
  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > 4000) return noContent();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const kind = KINDS.includes(body.kind as ErrorKind) ? (body.kind as ErrorKind) : 'client';
  const message = cleanLine(body.message ?? '', 300);
  if (!message) return noContent();

  const digest = typeof body.digest === 'string' && DIGEST.test(body.digest) ? body.digest : undefined;
  const path = typeof body.path === 'string' && PATH.test(body.path) ? body.path : undefined;

  reportError({ kind, message, path, digest });
  return noContent();
}
