/**
 * The browser side of error reporting, shared by both error boundaries.
 *
 * Two boundaries needed the identical "tell the server, exactly once, and
 * never let the telling become the failure" logic, and two copies of that is
 * how they drift.
 */

/**
 * A short code the visitor can read out and support can search for.
 *
 * Next generates a `digest` for an error thrown on the **server** - it is in
 * the Vercel log next to the stack trace, which is what makes it worth
 * showing. A purely client-side error has no digest, so one is minted here:
 * it correlates the screen with the alert, which is still most of the value.
 */
export function referenceCode(digest?: string): string {
  if (digest) return digest.slice(0, 12);
  return `c${Math.random().toString(36).slice(2, 10)}`;
}

export interface ClientErrorReport {
  kind: 'client' | 'client-fatal';
  message: string;
  digest?: string;
  path?: string;
}

/**
 * **A digest means the server already told us, with better information.**
 *
 * Verified end to end rather than reasoned about: one deliberately throwing
 * page produced *two* alerts - `instrumentation.ts` reporting the real
 * exception ("deliberate failure for the error-boundary check"), and the
 * browser reporting React's production placeholder ("The specific message is
 * omitted in production builds..."). Two messages, one incident, and the
 * second one carries nothing the first does not.
 *
 * `digest` is present on exactly the errors that came from the server, so it
 * is the signal for "already reported". A purely client-side failure - a bad
 * state update, a component that throws on hydration - has no digest and
 * nothing else will ever see it, so those are reported.
 */
export function shouldReport(error: { digest?: string }): boolean {
  return !error.digest;
}

/**
 * Posts one report and swallows everything.
 *
 * `keepalive` so the report still leaves if the visitor closes the tab or
 * navigates away from the broken page - which is the most likely thing for
 * them to do, and would otherwise mean the worst failures are the ones we
 * never hear about.
 *
 * Every failure mode is ignored on purpose. This runs inside an error
 * boundary; a reporter that throws replaces a handled error with an unhandled
 * one, and a reporter that rejects unhandled shows up in the console as a
 * second, misleading error.
 */
export function reportClientError(report: ClientErrorReport): void {
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
