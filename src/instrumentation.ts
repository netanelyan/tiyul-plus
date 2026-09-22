/**
 * Next's server instrumentation - the one hook that sees **every** server-side
 * failure: a throw inside a route handler, a React server render that blows
 * up, a `generateMetadata` that rejects. Before this file existed, all of
 * those ended as a `console.error` in the Vercel log, and a log is a place you
 * look after somebody tells you.
 *
 * ## Why here rather than in each route
 *
 * There are 38 API routes and ~300 rendered pages. Wrapping each one in a
 * try/catch would be 338 chances to forget, and the ones that get forgotten
 * are the new ones - exactly where a fresh bug lives. `onRequestError` cannot
 * be forgotten, because nobody has to remember it.
 *
 * ## It is not allowed to make things worse
 *
 * This runs while a request is already failing. Everything is inside a
 * try/catch and `reportError` has its own; a reporter that throws would turn a
 * 500 into a 500 plus an unhandled rejection, and would hide the original
 * error behind its own.
 *
 * Nothing is awaited either. The alert is fire-and-forget (`postAlert` does
 * not await its own fetch) so a slow or dead webhook cannot add latency to the
 * error response the visitor is waiting for.
 */
import type { Instrumentation } from 'next';

export function register(): void {
  // Nothing to set up. The export is required for Next to load this file at all.
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  try {
    /*
      Development throws constantly and on purpose - a typo in a component, a
      half-written route. Alerting on those trains you to ignore the channel,
      which is the one thing it must not become.
    */
    if (process.env.NODE_ENV !== 'production') return;

    const err = error as { message?: string; digest?: string };
    /*
      `routePath` is the route *pattern* ("/destinations/[slug]"), not the URL
      the visitor typed. That is the right thing to send: it groups every
      instance of one broken page together instead of producing a different
      alert per city, and it carries no user-supplied string.
    */
    const path = context?.routePath || request?.path || undefined;

    // Imported lazily so this file stays loadable in any runtime Next uses it from.
    void import('@/lib/server/errorAlert').then(({ reportError }) => {
      reportError({
        kind: 'server',
        message: err?.message ?? String(error),
        path,
        digest: err?.digest,
      });
    });
  } catch {
    // Deliberately silent: we are already inside a failure.
  }
};
