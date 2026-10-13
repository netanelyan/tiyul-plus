/**
 * Tests for webLookup.ts: when a search is allowed, how many times per conversation, and the cache.
 *
 * What is deliberately not tested here: the kashrut block. That is the responsibility of
 * `kosherIntentText` in grounding.ts (route.ts is what composes
 * `!kosherAsk && lookupEligible(...)`), and that is exactly why `kosherIntentText` is tested
 * there and not here - this file knows nothing at all about kashrut, and that is the point:
 * it has no path by which kashrut can reach a search in the first place.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citationDate,
  getCachedLookup,
  lookupBudgetLeft,
  lookupContext,
  lookupEligible,
  lookupNoteFor,
  lookupsUsedSoFar,
  modelVersion,
  rememberLookup,
  resetLookupCacheForTest,
  runLookup,
  todayIso,
  webSearchToolFor,
} from './webLookup.ts';
import { LOOKUP_ANCHOR } from '../priceGuard.ts';
import type { ChatMessage } from './chatMessages.ts';

const asst = (content: string): ChatMessage => ({ role: 'assistant', content });
const usr = (content: string): ChatMessage => ({ role: 'user', content });

test('lookupEligible תופסת שעות/מחיר-כניסה/קיום, ולא שיחה כללית', () => {
  for (const q of [
    'מה שעות הפתיחה של הקולוסיאום?',
    'כמה עולה כרטיס כניסה למוזיאון?',
    'האם המקום עדיין קיים?',
    'is it still open on sundays',
    'what are the opening hours',
  ]) {
    assert.equal(lookupEligible(q), true, q);
  }
  for (const q of [
    'מה כדאי לראות ברומא?',
    'תבנה לי מסלול של 4 ימים',
    'איפה כדאי לאכול?',
    '',
  ]) {
    assert.equal(lookupEligible(q), false, q);
  }
});

test('lookupsUsedSoFar סופרת ציטוטים בתשובות הסוכן בלבד, לא בהודעות המשתמש', () => {
  const messages = [
    usr('מה שעות הפתיחה?'),
    asst('פתוח בין 9:00 ל-19:00 (מקור: site.com, נבדק ב-1.1.2026).'),
    usr('נבדק ב-1.1.2026 - זה כתוב בהודעה שלי'), // not counted - this is not an agent reply
    asst('בלי ציטוט בכלל'),
  ];
  assert.equal(lookupsUsedSoFar(messages), 1);
});

test('lookupBudgetLeft נסגרת אחרי התקרה לשיחה', () => {
  const cited = asst('נבדק ב-1.1.2026 - עובדה כלשהי.');
  const under = Array.from({ length: 2 }, () => cited);
  const atCap = Array.from({ length: 3 }, () => cited);
  assert.equal(lookupBudgetLeft(under), true);
  assert.equal(lookupBudgetLeft(atCap), false);
});

test('מטמון: שאלה זהה פעם שנייה מחזירה את התשובה בלי לחפש שוב', () => {
  resetLookupCacheForTest();
  assert.equal(getCachedLookup('מה שעות הפתיחה של הקולוסיאום?'), null);
  rememberLookup('מה שעות הפתיחה של הקולוסיאום?', 'פתוח 9-19 (נבדק ב-1.1.2026).');
  assert.equal(
    getCachedLookup('  מה שעות הפתיחה של הקולוסיאום?  '), // whitespace and case do not change the key
    'פתוח 9-19 (נבדק ב-1.1.2026).',
  );
  assert.equal(getCachedLookup('שאלה אחרת לגמרי'), null);
});

test('todayIso מחזירה תאריך ISO אמיתי, לא מומצא', () => {
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
});

/* ---------- The lookup call (runLookup) - against a fake fetch, never the API ---------- */

type Captured = { body: Record<string, unknown> }[];

function fakeFetch(responses: { status?: number; json: unknown }[], seen: Captured): typeof fetch {
  let i = 0;
  return (async (_url: unknown, init?: { body?: string }) => {
    seen.push({ body: JSON.parse(init?.body ?? '{}') });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
  }) as typeof fetch;
}

const base = { context: '', model: 'claude-sonnet-4-5', date: '13.10.2026', base: 'http://mock' };

test('the citation date is the form the price guard accepts as a citation', () => {
  const d = citationDate(new Date('2026-10-13T10:00:00Z'));
  assert.equal(d, '13.10.2026');
  // The old prompt handed over an ISO date, which the anchor does not match
  assert.ok(LOOKUP_ANCHOR.test(`פתוח 9:00-19:00 (מקור: site.com) · נבדק ב-${d}.`));
  assert.ok(!LOOKUP_ANCHOR.test('פתוח 9:00-19:00 (מקור: site.com) · נבדק ב-2026-10-13.'));
});

test('the date follows Israel, not UTC, around midnight', () => {
  // 22:30 UTC on the 13th is already the 14th in Israel
  assert.equal(citationDate(new Date('2026-10-13T22:30:00Z')), '14.10.2026');
});

test('the search tool version follows the model', () => {
  assert.equal(modelVersion('claude-sonnet-4-5'), 4.5);
  assert.equal(modelVersion('claude-sonnet-4-5-20250929'), 4.5);
  assert.equal(modelVersion('claude-sonnet-4-20250514'), 4);
  assert.equal(modelVersion('claude-sonnet-5-5'), 5.5);
  assert.equal(modelVersion('claude-haiku-4-5'), 4.5);
  assert.equal(modelVersion('something-else'), 0);
  assert.equal(webSearchToolFor('claude-sonnet-4-5').type, 'web_search_20250305');
  assert.equal(webSearchToolFor('claude-sonnet-4-6').type, 'web_search_20260209');
  assert.equal(webSearchToolFor('claude-sonnet-5-5').type, 'web_search_20260209');
  assert.equal(webSearchToolFor('claude-sonnet-4-5').max_uses, 2);
});

test('runLookup returns the cited answer and counts every search', async () => {
  const seen: Captured = [];
  const answer = 'הקולוסיאום פתוח 9:00-19:00 (מקור: colosseo.it, https://colosseo.it) · נבדק ב-13.10.2026.';
  const out = await runLookup({
    ...base,
    question: 'מה שעות הפתיחה של הקולוסיאום?',
    fetchImpl: fakeFetch(
      [{ json: { stop_reason: 'end_turn', content: [{ type: 'text', text: answer }], usage: { input_tokens: 900, output_tokens: 80, server_tool_use: { web_search_requests: 1 } } } }],
      seen,
    ),
  });
  assert.equal(out.answer, answer);
  assert.equal(out.usage.web_search_requests, 1);
  assert.equal(out.usage.input_tokens, 900);
  const body = seen[0].body as { tools: { type: string }[]; messages: { content: string }[] };
  assert.equal(body.tools.length, 1, 'the search tool and nothing else');
  assert.equal(body.tools[0].type, 'web_search_20250305');
  assert.ok(body.messages[0].content.includes('DATE: 13.10.2026'));
});

test('nothing reliable, a refusal or an HTTP error is "no answer", never a throw', async () => {
  for (const r of [
    { json: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'NO_RELIABLE_ANSWER' }] } },
    { json: { stop_reason: 'refusal', content: [] } },
    { status: 400, json: { error: { message: 'bad' } } },
  ]) {
    const out = await runLookup({ ...base, question: 'q', fetchImpl: fakeFetch([r], []) });
    assert.equal(out.answer, null);
  }
});

test('a paused server-tool turn is continued with the paused content sent back unchanged', async () => {
  const seen: Captured = [];
  const paused = [{ type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } }];
  const out = await runLookup({
    ...base,
    question: 'q',
    fetchImpl: fakeFetch(
      [
        { json: { stop_reason: 'pause_turn', content: paused, usage: { input_tokens: 100, server_tool_use: { web_search_requests: 1 } } } },
        { json: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'תשובה · נבדק ב-13.10.2026.' }], usage: { input_tokens: 200, server_tool_use: { web_search_requests: 1 } } } },
      ],
      seen,
    ),
  });
  assert.equal(seen.length, 2);
  const second = seen[1].body as { messages: { role: string; content: unknown }[] };
  assert.deepEqual(second.messages[1], { role: 'assistant', content: paused });
  assert.equal(out.usage.input_tokens, 300, 'usage adds up across the continuation');
  assert.equal(out.usage.web_search_requests, 2);
  assert.ok(out.answer);
});

test('the lookup gets the recent conversation but not the question twice', () => {
  const ctx = lookupContext([usr('רומא'), asst('מה מעניין אתכם?'), usr('מתי פתוח הקולוסיאום?')], ['rome']);
  assert.ok(ctx.includes('rome'));
  assert.ok(ctx.includes('מה מעניין אתכם?'));
  assert.ok(!ctx.includes('מתי פתוח'), 'the question itself is sent separately');
});

test('the agent is told to copy fact and citation together, or to say nothing was found', () => {
  assert.ok(lookupNoteFor('X · נבדק ב-13.10.2026.').includes('SAME sentence'));
  assert.ok(lookupNoteFor(null).includes('found nothing reliable'));
});
