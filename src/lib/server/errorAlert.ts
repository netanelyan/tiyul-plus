/**
 * Server only - "will you know immediately if something fails?"
 *
 * Until now the only things that could reach Netanel were an AI budget
 * threshold and a purchase. **An exception - the thing that actually breaks a
 * product - reached nobody.** It was `console.error`d into the Vercel log,
 * which is a place you look after somebody tells you, and nobody tells you.
 *
 * This module is the one place a failure becomes a message. Two callers feed
 * it: `instrumentation.ts`'s `onRequestError` (every server-side throw,
 * including a route handler and a React server render) and
 * `/api/client-error` (the browser boundaries in `error.tsx` /
 * `global-error.tsx`).
 *
 * ## Why the dedupe is the load-bearing part
 *
 * A bad deploy does not break once. It breaks on every request, which is
 * hundreds of identical messages in a minute - and a channel that floods is a
 * channel that gets muted, which leaves us exactly where we started. So an
 * identical failure alerts **once per hour**, and the repeats are counted
 * rather than sent.
 *
 * The count matters on its own: "this happened 1,400 times" and "this happened
 * twice" are different incidents with the same text.
 *
 * ## What is deliberately NOT sent
 *
 * No request body, no message content, no email address, no token. The alert
 * carries the kind, the route, the error's own message and its digest - the
 * same information the log line has. A stack trace is not sent either: it is
 * long, it is in the log already, and the digest is what correlates the two.
 */
import { postAlert } from '@/lib/server/alert';

/** How long an identical failure stays quiet after its first alert. */
export const DEDUPE_MS = 60 * 60_000;

/** A ceiling on distinct fingerprints per window, so a random-message bug cannot flood. */
export const MAX_ALERTS_PER_WINDOW = 12;

export type ErrorKind = 'server' | 'client' | 'client-fatal';

export interface ErrorReport {
  kind: ErrorKind;
  message: string;
  /** Route or pathname the failure happened on. */
  path?: string;
  /** Next's own error digest where there is one - what ties this to the log line. */
  digest?: string;
  /** Present for a server request error. */
  statusCode?: number;
}

interface Seen {
  firstAt: number;
  count: number;
}

const seen = new Map<string, Seen>();
let windowStartedAt = 0;
let alertsThisWindow = 0;

/**
 * One line of free text, made safe to put in somebody's chat client.
 *
 * `postAlert` posts JSON to a webhook, so the risk here is not script
 * injection, it is a message that is unreadable or enormous. Control
 * characters go (a newline would split the line, a NUL breaks some clients)
 * and the length is capped. The client route validates its own input too -
 * this is the second layer, and it also covers the server path, where the text
 * is an exception message nobody wrote for display.
 */
export function cleanLine(value: unknown, max = 300): string {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const flat = Array.from(text)
    /*
      A code-point test rather than a control-character regex, deliberately: a
      literal control character inside a character class is invisible in every
      diff and in every review, and writing one here is exactly the mistake
      this comment exists to stop the next person repeating.
    */
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x20 || code === 0x7f ? ' ' : ch;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * What counts as "the same failure".
 *
 * The digest when there is one - Next derives it from the error itself, so it
 * is stable across requests and across instances. Otherwise the message with
 * anything request-shaped removed: a uuid, a long hex id or a bare number in
 * the text would make every occurrence unique and defeat the dedupe entirely,
 * which is the failure mode this whole module exists to prevent.
 */
export function fingerprint(r: ErrorReport): string {
  if (r.digest) return `d:${r.digest}`;
  const generic = r.message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\b[0-9a-f]{12,}\b/gi, '<hex>')
    .replace(/\b\d{3,}\b/g, '<n>');
  return `m:${r.kind}:${r.path ?? ''}:${generic}`.slice(0, 240);
}

export interface AlertOutcome {
  /** Whether a message was actually posted. */
  sent: boolean;
  /** Why not, when it was not. */
  reason?: 'duplicate' | 'window-full';
  /** How many times this fingerprint has been seen in the current window. */
  count: number;
}

/**
 * Records a failure and alerts if this one is new. Never throws - it is called
 * from an error handler, and a reporter that can itself fail is worse than no
 * reporter.
 */
export function reportError(report: ErrorReport, now = Date.now()): AlertOutcome {
  try {
    if (now - windowStartedAt >= DEDUPE_MS) {
      windowStartedAt = now;
      alertsThisWindow = 0;
      seen.clear();
    }

    const key = fingerprint(report);
    const prior = seen.get(key);
    if (prior) {
      prior.count += 1;
      // The repeat is counted, not sent.
      return { sent: false, reason: 'duplicate', count: prior.count };
    }

    seen.set(key, { firstAt: now, count: 1 });

    if (alertsThisWindow >= MAX_ALERTS_PER_WINDOW) {
      console.error('[error-alert] window full, suppressing', key);
      return { sent: false, reason: 'window-full', count: 1 };
    }
    alertsThisWindow += 1;

    const where = report.path ? ` ב-${report.path}` : '';
    const status = report.statusCode ? ` (${report.statusCode})` : '';
    const label =
      report.kind === 'server'
        ? 'שגיאת שרת'
        : report.kind === 'client-fatal'
          ? 'שגיאה שהפילה את כל הדף'
          : 'שגיאה בדפדפן';
    postAlert(`🔴 ${label}${where}${status}: ${cleanLine(report.message)}`, {
      kind: report.kind,
      path: report.path ?? null,
      digest: report.digest ?? null,
      statusCode: report.statusCode ?? null,
    });
    return { sent: true, count: 1 };
  } catch (err) {
    console.error('[error-alert] reporter itself failed', err);
    return { sent: false, count: 0 };
  }
}

/**
 * How many times a fingerprint has been seen in the current window. Exported
 * so the next window's alert can carry "and it happened N times" rather than
 * losing the count with the window.
 */
export function seenCount(report: ErrorReport): number {
  return seen.get(fingerprint(report))?.count ?? 0;
}

/** Test seam - the module keeps its dedupe state for the life of the instance. */
export function resetErrorAlertsForTest(): void {
  seen.clear();
  windowStartedAt = 0;
  alertsThisWindow = 0;
}

/** Test seam - how many distinct failures are being tracked right now. */
export function trackedFingerprints(): number {
  return seen.size;
}
