import { anthropicHeaders } from '@/lib/server/anthropicHeaders';
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
 * route.ts calls `kosherIntentText` **before** it even asks this question,
 * and refuses the lookup for any message that sounds like a kashrut question
 * - regardless of whether it is also factual ("is this kosher restaurant
 * still open?" is both, and kashrut wins). This is not a guideline that can
 * be forgotten: on such a turn `runLookup` is never called, and the agent
 * itself has no search tool on any turn - a tool that is not sent does not
 * exist for the model, the exact same principle as `modelRoute.ts`. The
 * second layer, entirely independent of
 * this one, is `priceGuard.ts`'s `kosher-claim`: even if the model writes a
 * kashrut claim from its own memory (with no connection to search at all),
 * it does not go out unless it names a real place from the catalog. The
 * two layers are deliberately independent of each other - one blocks the
 * action, the other blocks the output.
 */

/**
 * ---------- The lookup runs as its own small call, not inside the agent ----------
 *
 * Until 2026-10-13 the agent itself got `web_search` on eligible turns. That
 * cost far more than the search: the tool list is the very first thing in the
 * prompt, so adding a tool on one turn made every byte after it - the system
 * prompt and the ~118k-token catalog index - a different prefix, and the turn
 * paid a one-hour cache write of the whole catalog (~$0.79 on Sonnet 4.5)
 * instead of a read (~$0.04). The search results then also rode along, uncached,
 * on every later iteration of the agent loop.
 *
 * Now the agent's tools never change. When a turn is eligible, `runLookup`
 * makes one small separate request - a short prompt, the last few messages and
 * the question, with the search tool - and the agent receives its cited answer
 * as text (`lookupNote`), exactly the way it already received a cached answer.
 *
 * Kashrut is still structurally out of reach, and more firmly than before: the
 * agent has no search tool on any turn, and `runLookup` is only called on a turn
 * that `kosherIntentText` has cleared (see route.ts).
 */

/**
 * The search tool for a given model.
 *
 * `web_search_20260209` (dynamic filtering) needs a Claude 4.6 or later model;
 * older ones take the basic `web_search_20250305`. The agent's default is Sonnet
 * 4.5, so sending the newer version unconditionally - which is what the inline
 * tool did - was never verified to work on the model actually in use.
 */
export function webSearchToolFor(model: string) {
  return {
    type: modelVersion(model) >= 4.6 ? ('web_search_20260209' as const) : ('web_search_20250305' as const),
    name: 'web_search' as const,
    /** Cap within a single lookup - a factual question needs no more than two searches */
    max_uses: 2,
  };
}

/** "claude-sonnet-4-5-20250929" -> 4.5, "claude-sonnet-5" -> 5. Unknown -> 0 (the conservative side). */
export function modelVersion(model: string): number {
  const m = /claude-(?:opus|sonnet|haiku|fable|mythos)-(\d+)(?:-(\d{1,2}))?(?!\d)/.exec(model ?? '');
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0);
}

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
 * The date written into a citation: day.month.year in Israel's time zone
 * ("13.10.2026").
 *
 * Not `todayIso()`, which is what the prompt used to hand over: `LOOKUP_ANCHOR`
 * in priceGuard.ts only recognises the "checked on" marker followed by a
 * day.month date, so an ISO date (2026-10-13) did not count as a citation and the
 * guard stripped the very sentence the search was run to produce. This is also
 * the form Israeli readers write dates in.
 */
export function citationDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}.${get('month')}.${get('year')}`;
}

/* ---------- The lookup call ---------- */

/** Written in place of an answer when nothing reliable was found - see LOOKUP_SYSTEM */
const NOTHING_FOUND = 'NO_RELIABLE_ANSWER';

const LOOKUP_SYSTEM = `You check one narrow, time-sensitive fact for a Hebrew travel-planning app: the opening hours of a place, its admission price, or whether it still exists / still operates. The app's own travel agent will relay your answer to the traveller.

- Search (at most twice), then answer in Hebrew in one to three short sentences. No preamble, no offers, no advice beyond the fact.
- Every sentence that states a fact must carry its source and the check date in that SAME sentence, in exactly this form: "<the fact> (מקור: <site name>, <url>) · נבדק ב-<DATE>." Use the DATE you are given, verbatim.
- If sources disagree, or the page is unclear or outdated, say that plainly in one sentence instead of picking one.
- Use the recent conversation only to understand which place the question is about.
- Never say anything about kashrut, kosher status or supervision, even if a page mentions it.
- If you found nothing reliable, reply with exactly ${NOTHING_FOUND} and nothing else.`;

/** The few lines of conversation the lookup needs to know which place "it" is */
export function lookupContext(messages: ChatMessage[], citySlugsInTrip: string[] = []): string {
  const recent = messages
    .slice(-5, -1)
    .map((m) => `${m.role === 'user' ? 'traveller' : 'agent'}: ${m.content.slice(0, 600)}`)
    .join('\n');
  const trip = citySlugsInTrip.length > 0 ? `Cities in the traveller's trip: ${citySlugsInTrip.join(', ')}\n` : '';
  return `${trip}${recent ? `Recent conversation:\n${recent}\n` : ''}`;
}

export interface LookupUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
  web_search_requests?: number;
}

export interface LookupResult {
  /** The cited answer, or null when nothing reliable was found or the call failed */
  answer: string | null;
  usage: LookupUsage;
}

type ApiResponse = {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
  usage?: {
    input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens?: number;
    server_tool_use?: { web_search_requests?: number };
  };
};

/**
 * One lookup, as its own request. Never throws: a failure is reported as "no
 * answer", and the agent then tells the traveller honestly that it could not
 * check - which is better than the whole turn failing over a side question.
 *
 * `pause_turn` (a long server-tool turn the API paused) is continued by sending
 * the paused content back unchanged, at most twice.
 */
export async function runLookup(opts: {
  question: string;
  context: string;
  model: string;
  date: string;
  base: string;
  fetchImpl?: typeof fetch;
}): Promise<LookupResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const usage: LookupUsage = {};
  const add = (u: ApiResponse['usage']) => {
    if (!u) return;
    usage.input_tokens = (usage.input_tokens ?? 0) + (u.input_tokens ?? 0);
    usage.cache_creation_input_tokens = (usage.cache_creation_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    usage.cache_read_input_tokens = (usage.cache_read_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    usage.output_tokens = (usage.output_tokens ?? 0) + (u.output_tokens ?? 0);
    usage.web_search_requests = (usage.web_search_requests ?? 0) + (u.server_tool_use?.web_search_requests ?? 0);
  };
  const messages: { role: 'user' | 'assistant'; content: unknown }[] = [
    {
      role: 'user',
      content: `${opts.context}\nDATE: ${opts.date}\nQUESTION: ${opts.question}`,
    },
  ];
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await doFetch(`${opts.base}/v1/messages`, {
        method: 'POST',
        headers: anthropicHeaders(),
        signal: AbortSignal.timeout(40_000),
        body: JSON.stringify({
          model: opts.model,
          max_tokens: 1024,
          system: LOOKUP_SYSTEM,
          tools: [webSearchToolFor(opts.model)],
          messages,
        }),
      });
      if (!res.ok) {
        console.warn(`[lookup] api ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
        return { answer: null, usage };
      }
      const data = (await res.json()) as ApiResponse;
      add(data.usage);
      if (data.stop_reason === 'pause_turn' && data.content) {
        messages.push({ role: 'assistant', content: data.content });
        continue;
      }
      const text = (data.content ?? [])
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text)
        .join('')
        .trim();
      if (!text || text.includes(NOTHING_FOUND) || data.stop_reason === 'refusal') return { answer: null, usage };
      return { answer: text, usage };
    }
  } catch (err) {
    console.warn('[lookup] failed', err);
  }
  return { answer: null, usage };
}

/**
 * What the agent is told about the lookup, in the turn's server context.
 * The wording keeps the one rule the price guard enforces: fact and citation in
 * the same sentence.
 */
export function lookupNoteFor(answer: string | null): string {
  if (!answer) {
    return 'LIVE LOOKUP - the app searched the web for the traveller\'s question a moment ago and found nothing reliable. Say so honestly in one sentence and suggest checking with the venue directly. Do not guess an hour, a price or whether it is open.';
  }
  return `LIVE LOOKUP RESULT - the app searched the web for the traveller's question a moment ago. Answer from it: keep every fact together with its source and its "נבדק ב-" date in the SAME sentence, exactly as written here, and add no fact it does not contain.\n"""\n${answer}\n"""`;
}

/**
 * ---------- Simple cache: the same question twice = one search ----------
 *
 * It holds the cited answer `runLookup` produced for a question. When an
 * **identical** question comes again, the lookup call is skipped and the
 * agent receives the stored answer the same way it would have received a
 * fresh one, with no additional search.
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
