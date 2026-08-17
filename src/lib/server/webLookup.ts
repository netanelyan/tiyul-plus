import { LOOKUP_ANCHOR } from '@/lib/priceGuard';
import type { ChatMessage } from '@/lib/server/chatMessages';

/**
 * Server-only - live lookup for factual, time-sensitive questions our
 * catalog cannot answer: opening hours, admission price, whether a place
 * still exists / is still open.
 *
 * ## Why this is a separate file and not another `if` in route.ts
 *
 * Three decisions live here rather than in the agent loop: **when it is
 * allowed at all** (a deterministic classifier, not the model), **how many
 * times per conversation** (derived from the message history, no server
 * state - the same pattern as `relevantCitySlugs`), and **what has already
 * been asked** (a simple cache keyed by identical text). All three need
 * their own tests.
 *
 * ## Why kashrut never passes through here in any form
 *
 * `wantsLookup` in route.ts calls `kosherIntentText` **before** it even
 * asks this question, and returns `false` for any message that sounds like
 * a kashrut question - regardless of whether it is also factual ("is this
 * kosher restaurant still open?" is both, and kashrut wins). This is not a
 * guideline that can be forgotten: when that condition is false,
 * `LOOKUP_TOOL` simply never enters the tools array on that API call - a
 * tool that is not sent does not exist for the model, the exact same
 * principle as `modelRoute.ts`. The second layer, entirely independent of
 * this one, is `priceGuard.ts`'s `kosher-claim`: even if the model writes a
 * kashrut claim from its own memory (with no connection to search at all),
 * it does not go out unless it names a real place from the catalog. The
 * two layers are deliberately independent of each other - one blocks the
 * action, the other blocks the output.
 */

/** The search tool itself - Anthropic's server runs it, not us. */
export const LOOKUP_TOOL = {
  type: 'web_search_20260209' as const,
  name: 'web_search' as const,
  /** Cap within a single API call - a factual question needs no more than two searches */
  max_uses: 2,
};

/**
 * Deterministic classifier: hours / admission-price / does-it-still-exist.
 * **Not** general questions (like "what's worth seeing") and **not**
 * ordinary conversation - only the narrow question our catalog genuinely
 * cannot answer.
 */
/*
  The optional definite-article prefix group sits next to every noun in
  this regex - the standard Hebrew wording uses the definite article ("the
  opening hours" / "the admission fee"), not the article-less form. The
  exact same trap caught TICKET_CONTEXT in priceGuard.ts, and both were
  only caught because the tests are written in standard Hebrew rather than
  in "regex-official" Hebrew.
*/
const LOOKUP_INTENT =
  /שעות\s*ה?(פתיחה|פעילות)|פתוח(ה)?\s*(עכשיו|היום|בשעה)|סגור(ה)?\s*(עכשיו|היום)|עדיין\s*(פתוח|קיים|פועל|קיימת|פועלת)|כבר לא (קיים|פועל)|האם.{0,20}(נסגר|עדיין קיים|עדיין פועל|עדיין פתוח)|כמה עולה\s*ה?(כניסה|כרטיס)|מחיר\s*ה?כניסה|דמי\s*ה?כניסה|עלות\s*ה?כניסה|כרטיס\s*ה?כניסה|opening hours|admission (fee|price)|entrance fee|ticket price|is (it |the .+ )?still (open|there)|does (it|.+) still exist|has .+ closed/i;

export function lookupEligible(text: string): boolean {
  return LOOKUP_INTENT.test(text ?? '');
}

/** Per-conversation cap - counted from the history itself, no server state */
const MAX_LOOKUPS_PER_CONVERSATION = 3;

/**
 * How many lookups have already been "sealed" in the conversation - counted
 * via `LOOKUP_ANCHOR` in the agent's own replies. The same principle as
 * counting tokens from the history: instead of keeping a counter on the
 * server (which does not survive a restart and does not sync between
 * instances), we read what has already been sent to the user. A reply the
 * model wrote with one or more citations counts as one lookup used - even
 * if it actually searched twice within the same API call, because
 * `max_uses` on the tool already stops that.
 */
export function lookupsUsedSoFar(messages: ChatMessage[]): number {
  let n = 0;
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    if (LOOKUP_ANCHOR.test(m.content)) n += 1;
  }
  return n;
}

export function lookupBudgetLeft(messages: ChatMessage[]): boolean {
  return lookupsUsedSoFar(messages) < MAX_LOOKUPS_PER_CONVERSATION;
}

/**
 * Today's date, as a fact supplied to the model rather than computed by
 * it - the exact same principle as trip dates ("Never compute a date
 * yourself"). Locked once per call so all retries/iterations of the same
 * turn see the same date.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ---------- Simple cache: the same question twice = one search ----------
 *
 * Not a pre-call cache of a raw search result - `web_search` is a server
 * tool that runs automatically inside the API call itself, and there is no
 * point at which we can intercept "the model is about to search for X" and
 * hand it a ready answer without calling the API at all. What we can do,
 * and it is all this cache does: recognize that an **identical** question
 * has already been answered, and skip sending `LOOKUP_TOOL` at all on this
 * turn - the model receives the previous answer as a ready fact in the
 * detail block, with no additional search.
 *
 * This is process memory only (per-instance), in exactly the same style as
 * `checkLimit` in limits.ts - it does not survive a restart and does not
 * sync between instances, and that is fine: it is a cost optimization, not
 * a safety mechanism.
 */
interface CachedLookup {
  reply: string;
  at: number;
}

const CACHE_TTL_MS = 12 * 60 * 60_000;
/** Coarse memory guard, the same pattern as `budget.ts`'s callers.size */
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, CachedLookup>();

function normalizeLookupKey(text: string): string {
  return (text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCachedLookup(userText: string): string | null {
  const key = normalizeLookupKey(userText);
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.reply;
}

export function rememberLookup(userText: string, reply: string): void {
  const key = normalizeLookupKey(userText);
  if (!key || !reply) return;
  if (cache.size > CACHE_MAX_ENTRIES) cache.clear();
  cache.set(key, { reply, at: Date.now() });
}

/** For tests only */
export function resetLookupCacheForTest(): void {
  cache.clear();
}
