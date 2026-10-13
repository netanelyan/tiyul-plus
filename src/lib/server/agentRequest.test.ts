/**
 * The agent request layout, and the one property it exists for: **nothing that
 * was sent before is ever sent differently.** A cache is a prefix, so the claims
 * tested here are all of the form "request N is a byte-for-byte prefix of request
 * N+1", within a turn (the tool loop) and across turns (the conversation), plus
 * the API's own limits on the markers.
 *
 * These are offline checks of what we send. Whether the API then reports cache
 * reads is the live half, and it is visible in the `[chat]` usage line.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cachedPrefix } from './agentPrefix.ts';
import {
  MAX_BREAKPOINTS,
  SERVER_CONTEXT_HEADING,
  assemblePrompt,
  serverContextText,
  tripUpdateText,
  type ApiMessage,
} from './agentRequest.ts';

const DETAIL = 'DETAIL {"cities":[]}';
const RULES = 'OUTPUT DISCIPLINE';
const TRIP = '{"name":"וינה","totalDays":3}';

/** The request as the cache sees it: everything except the markers themselves */
const strip = (v: unknown): unknown => JSON.parse(JSON.stringify(v, (k, x) => (k === 'cache_control' ? undefined : x)));

function build(messages: ApiMessage[], currentIndex: number, kosherOk = false, trip = TRIP) {
  return assemblePrompt({
    prefix: cachedPrefix(kosherOk),
    systemTail: [DETAIL, RULES],
    messages,
    currentIndex,
    serverContext: serverContextText([`CURRENT TRIP (the user's active trip right now):\n${trip}`]),
  });
}

function markers(p: ReturnType<typeof build>) {
  const out: { ttl: string }[] = [];
  for (const b of p.system) if (b.cache_control) out.push({ ttl: b.cache_control.ttl ?? '5m' });
  for (const m of p.messages) {
    for (const b of m.content as { cache_control?: { ttl?: string } }[]) {
      if (b.cache_control) out.push({ ttl: b.cache_control.ttl ?? '5m' });
    }
  }
  return out;
}

const user = (content: string): ApiMessage => ({ role: 'user', content });
const assistant = (content: string): ApiMessage => ({ role: 'assistant', content });

test('within a turn, each iteration is the previous request plus what the loop appended', () => {
  const history = [user('שלום'), assistant('היי, לאן?'), user('3 ימים בווינה לזוג')];
  const it0 = build(history, 2);
  const looped: ApiMessage[] = [
    ...history,
    { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'create_trip_full', input: {} }] },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 't1', content: 'נבנה' },
        { type: 'text', text: tripUpdateText('{"name":"וינה","totalDays":3,"totalStops":9}') },
      ],
    },
  ];
  const it1 = build(looped, 2);
  assert.deepEqual(strip(it1.system), strip(it0.system), 'system must not change mid-turn');
  assert.deepEqual(strip(it1.messages.slice(0, it0.messages.length)), strip(it0.messages));
});

test('across turns, everything the last turn marked as history comes back unchanged', () => {
  // Turn 2: the history is [u1, a1], the current message is u2
  const turn2 = build([user('שלום'), assistant('היי'), user('3 ימים בווינה')], 2);
  // Turn 3: the client sends back u2 as plain text - without the server context - and the reply
  const turn3 = build(
    [user('שלום'), assistant('היי'), user('3 ימים בווינה'), assistant('בניתי'), user('תוסיף יום')],
    4,
    false,
    '{"name":"וינה","totalDays":4}', // the trip changed in between - it must not matter
  );
  assert.deepEqual(strip(turn3.system), strip(turn2.system), 'the trip state is not in system');
  // Turn 2 marked the end of its history at index 1; turn 3 reads up to there.
  const marked = turn2.messages.findIndex((m) =>
    (m.content as { cache_control?: unknown }[]).some((b) => b.cache_control),
  );
  assert.equal(marked, 1, 'the end of the history carries a marker');
  assert.deepEqual(strip(turn3.messages.slice(0, marked + 1)), strip(turn2.messages.slice(0, marked + 1)));
});

test('the server context rides in the current message only, before the traveller text', () => {
  const p = build([user('שלום'), assistant('היי'), user('תוסיף יום')], 2);
  const current = p.messages[2].content as { type: string; text?: string }[];
  assert.ok(current[0].text?.startsWith(SERVER_CONTEXT_HEADING));
  assert.ok(current[0].text?.includes(TRIP));
  assert.equal(current[current.length - 1].text, 'תוסיף יום', "the traveller's words come last");
  for (const m of p.messages.slice(0, 2)) {
    assert.ok(!JSON.stringify(m).includes(SERVER_CONTEXT_HEADING), 'history carries no context');
  }
  assert.ok(!p.system.some((blk) => blk.text.includes(TRIP)), 'the trip state never enters system');
});

test('never more than four markers, and every one-hour marker comes first', () => {
  const shapes: [ApiMessage[], number][] = [
    [[user('א')], 0],
    [[user('א'), assistant('ב'), user('ג')], 2],
    [[user('א'), assistant('ב'), user('ג'), assistant('ד'), user('ה')], 2],
  ];
  for (const kosherOk of [false, true]) {
    for (const [msgs, current] of shapes) {
      const m = markers(build(msgs, current, kosherOk));
      assert.ok(m.length <= MAX_BREAKPOINTS, `${m.length} markers`);
      const firstShort = m.findIndex((x) => x.ttl === '5m');
      const lastLong = m.map((x) => x.ttl).lastIndexOf('1h');
      assert.ok(firstShort === -1 || lastLong < firstShort, 'a 1h entry after a 5m entry is a 400');
      // The tail is always marked - it is what the next iteration reads
      const last = build(msgs, current, kosherOk).messages.at(-1)!.content as { cache_control?: unknown }[];
      assert.ok(last.at(-1)?.cache_control, 'the newest block carries a marker');
    }
  }
});

test('assembling does not modify the caller arrays', () => {
  // The route snapshots and restores its message list when a light turn escalates
  const msgs: ApiMessage[] = [user('א'), assistant('ב'), user('ג')];
  const before = JSON.stringify(msgs);
  build(msgs, 2);
  assert.equal(JSON.stringify(msgs), before);
});

test('the agent never carries a search tool - the lookup is its own call', () => {
  // A tool added on one turn changes the start of the prompt and rewrites the
  // ~118k-token catalog cache. See webLookup.ts.
  const src = readFileSync('src/app/api/chat/route.ts', 'utf8');
  assert.ok(!/web_search_20|webSearchToolFor|LOOKUP_TOOL/.test(src), 'route.ts must not attach a search tool');
});

test('the legacy layout is the old request: state in system, nothing marked after the catalog', () => {
  const msgs: ApiMessage[] = [user('א'), assistant('ב'), user('ג')];
  const p = assemblePrompt({
    prefix: cachedPrefix(false),
    systemTail: [DETAIL, `CURRENT TRIP (the user's active trip right now):\n${TRIP}`, RULES],
    messages: msgs,
    currentIndex: 2,
    serverContext: '',
    legacy: true,
  });
  assert.equal(p.messages, msgs, 'messages go out exactly as given');
  assert.ok(p.system.some((blk) => blk.text.includes(TRIP)), 'the state is in system');
  assert.equal(p.system.filter((b) => b.cache_control).length, 1, 'only the catalog marker');
});
