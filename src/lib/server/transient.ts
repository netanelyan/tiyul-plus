/**
 * Whether an agent-turn failure is likely to pass on a retry.
 *
 * This lives in a separate file rather than inside `api/chat/route.ts`
 * because an App Router route handler may not export anything that is not
 * an HTTP method, and logic that decides whether to retry must be covered
 * by a test.
 *
 * The history behind the function: the first version checked `err.status`
 * and, failing that, looked for words like overloaded/rate limit in the
 * text. But the error actually thrown was `new Error('anthropic 529')`,
 * with no `status` and none of the words - so real API overload was
 * classified as a permanent error, the second attempt never ran, and the
 * traveler got an error reply on a turn that would have passed. That is
 * why a status code is now read both from the object and from the text.
 */

/** 429 = rate limit, 408 = timeout, 5xx (incl. 529 "overloaded") = server side */
function statusIsTransient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const TRANSIENT_TEXT =
  /overloaded|rate.?limit|too many requests|timeout|timed out|aborted|econnreset|enotfound|eai_again|fetch failed|socket hang up|network|terminated/;

export function isTransient(err: unknown): boolean {
  const e = err as { status?: unknown; name?: unknown; message?: unknown } | null | undefined;

  // 1. A status code on the object - the precise path
  if (typeof e?.status === 'number' && Number.isFinite(e.status)) {
    return statusIsTransient(e.status);
  }

  // 2. AbortSignal.timeout throws a DOMException named TimeoutError; a
  //    cancellation like that is always transient as far as we're concerned.
  const name = typeof e?.name === 'string' ? e.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return true;

  // 3. A status code that survives only inside the text ("anthropic 529")
  const text = String(e?.message ?? err ?? '').toLowerCase();
  const fromText = text.match(/\b(4\d\d|5\d\d)\b/);
  if (fromText) return statusIsTransient(Number(fromText[1]));

  return TRANSIENT_TEXT.test(text);
}
