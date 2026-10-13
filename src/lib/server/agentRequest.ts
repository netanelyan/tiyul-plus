import type { SystemBlock } from '@/lib/server/agentPrefix';

/**
 * Server only - **how one agent request is laid out, so that it caches.**
 *
 * ## What this replaced, and what it cost
 *
 * Until 2026-10-13 only the catalog prefix (tools, system prompt, index) was
 * cached. Everything after it - the city detail block, the trip state, the
 * output rules and the whole conversation - sat in front of nothing that carried
 * a cache marker, so it was billed at the full input price **on every model call**:
 * every iteration of the tool loop, every turn. And it could not have been cached
 * where it was: the trip state lived in `system`, it changes whenever a tool
 * edits the trip, and a change in `system` invalidates every message after it.
 *
 * Measured with the token counter on the real catalog: the prefix is ~132k
 * tokens and reads for ~$0.04, while the tail was 5k-50k tokens at $3/MTok - so
 * in an ordinary multi-iteration turn the uncached tail cost as much as the
 * cached catalog, or more. The recorded live turn in chatGuards.test.ts shows the
 * same: 20,054 uncached tokens next to 202,134 cached.
 *
 * ## The layout now
 *
 *   tools                    never change (the lookup moved out - webLookup.ts)
 *   system  prompt + index   one-hour breakpoint(s), shared by every user
 *           detail, rules    stable for a conversation
 *   messages history         exactly what the client sends, never rewritten
 *            current message SERVER CONTEXT (trip, verdicts, lookup) + the text
 *            loop messages    tool calls, results, and the updated trip
 *
 * Per-turn state rides in the current user message, after the history, so the
 * history in front of it stays byte-identical from turn to turn. When a tool
 * changes the trip, the updated state is appended to that tool result rather
 * than rewritten anywhere earlier. Nothing before the newest message is ever
 * edited, which is the one property prompt caching needs.
 *
 * ## The breakpoints (the API allows four)
 *
 * 1. The prefix blocks carry their own one-hour markers (one, or two for the
 *    kosher layer) - see `cachedPrefix`.
 * 2. **The last message** (five minutes): every iteration of the loop reads
 *    everything the previous one wrote.
 * 3. **The end of the history** (five minutes): the next turn finds the
 *    conversation up to here already cached. Not the current message, because
 *    the client sends it back next turn without the server context, i.e. as
 *    different bytes.
 * 4. **The end of `system`**, when a slot is left: the detail block survives a
 *    turn whose history changed - the first turn after a trim, and turn two.
 *
 * Five minutes rather than an hour for 2-4: they are per-conversation, the loop
 * iterations are seconds apart, and an hour costs a 2x write instead of 1.25x
 * on content no other conversation will ever read.
 */

export type CacheControl = { type: 'ephemeral'; ttl?: '1h' };

export type ApiContentBlock =
  | { type: 'text'; text: string; cache_control?: CacheControl }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: string; data: string };
      cache_control?: CacheControl;
    }
  | { type: 'tool_use'; id: string; name: string; input: unknown; cache_control?: CacheControl }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
      cache_control?: CacheControl;
    };

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ApiContentBlock[];
}

/** The API's limit on `cache_control` markers in one request */
export const MAX_BREAKPOINTS = 4;

const CONVERSATION_CACHE: CacheControl = { type: 'ephemeral' };

/**
 * The static explanation of the server context, sent in `system` (so it is
 * cached) right before the output rules.
 */
export const SERVER_CONTEXT_NOTE =
  "SERVER CONTEXT: the traveller's latest message arrives together with a block headed SERVER CONTEXT. The app writes it, not the traveller. " +
  'It carries CURRENT TRIP - the live state of their trip at the start of this turn - and any facts the server computed about the message. ' +
  'Treat it as authoritative state and never quote it back as something the traveller said. ' +
  'When a tool result carries an updated CURRENT TRIP, that one replaces the earlier state.';

/** The heading the server context starts with - one place, so a test can find it */
export const SERVER_CONTEXT_HEADING = 'SERVER CONTEXT (written by the app, not by the traveller):';

/** The per-turn state, as one text block. Empty parts are left out. */
export function serverContextText(parts: string[]): string {
  return [SERVER_CONTEXT_HEADING, ...parts.filter((p) => p.trim().length > 0)].join('\n\n');
}

/** How an updated trip is appended to the tool results that changed it */
export function tripUpdateText(serializedTrip: string): string {
  return `CURRENT TRIP after these changes (replaces the earlier state):\n${serializedTrip}`;
}

const asBlocks = (content: ApiMessage['content']): ApiContentBlock[] =>
  typeof content === 'string' ? [{ type: 'text', text: content }] : content.map((b) => ({ ...b }));

function markLast(msg: ApiMessage): ApiMessage {
  const blocks = asBlocks(msg.content);
  if (blocks.length === 0) return msg;
  blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: CONVERSATION_CACHE };
  return { role: msg.role, content: blocks };
}

export interface AgentPromptInput {
  /** The cached prefix - `cachedPrefix(kosherOk)`, or the light route's - with its own markers */
  prefix: SystemBlock[];
  /** System text after the prefix that holds for the whole conversation: detail, rules */
  systemTail: string[];
  /**
   * Every message of the request: the history, then the current user message at
   * `currentIndex`, then whatever this turn's loop appended.
   */
  messages: ApiMessage[];
  currentIndex: number;
  /** This turn's state - `serverContextText(...)` - placed in the current user message */
  serverContext: string;
  /**
   * The pre-2026-10-13 layout: no conversation markers, and the caller puts the
   * turn's state into `systemTail` itself (see `chatCacheLayout`).
   */
  legacy?: boolean;
}

/**
 * `CHAT_CACHE_LAYOUT=legacy` restores the previous layout - the trip state back
 * in `system`, rebuilt every iteration, and nothing cached after the catalog -
 * with no deploy. The new layout was verified offline (agentRequest.test.ts) but
 * not against the live model when it shipped, so this is the way back if a real
 * conversation shows the model reading the moved state worse, and the way to
 * measure both layouts against the same traffic from the `[chat]` usage line.
 */
export function chatCacheLayout(): 'cached' | 'legacy' {
  return process.env.CHAT_CACHE_LAYOUT === 'legacy' ? 'legacy' : 'cached';
}

/**
 * The `system` and `messages` of one agent request. Pure: the caller's arrays are
 * not modified, which matters because the route snapshots and restores its own
 * message list when a light turn escalates.
 */
export function assemblePrompt(input: AgentPromptInput): {
  system: SystemBlock[];
  messages: ApiMessage[];
} {
  if (input.legacy) {
    return {
      system: [
        ...input.prefix,
        ...input.systemTail.filter((t) => t.length > 0).map((text) => ({ type: 'text' as const, text })),
      ],
      messages: input.messages,
    };
  }
  const used = input.prefix.filter((b) => b.cache_control).length;
  let free = MAX_BREAKPOINTS - used;

  // Every message goes out in block form. The cache key is the rendered prompt, so
  // this is about consistency rather than content: a message must look the same
  // in the turn that marks it and in the turn that reads it back.
  const messages: ApiMessage[] = input.messages.map((m, i) => {
    if (i !== input.currentIndex || !input.serverContext) return { role: m.role, content: asBlocks(m.content) };
    // The context goes first, the traveller's own words last.
    return {
      role: m.role,
      content: [{ type: 'text' as const, text: input.serverContext }, ...asBlocks(m.content)],
    };
  });

  const last = messages.length - 1;
  if (free > 0 && last >= 0) {
    messages[last] = markLast(messages[last]);
    free -= 1;
  }
  const historyEnd = input.currentIndex - 1;
  if (free > 0 && historyEnd >= 0 && historyEnd !== last) {
    messages[historyEnd] = markLast(messages[historyEnd]);
    free -= 1;
  }

  const system: SystemBlock[] = [
    ...input.prefix,
    ...input.systemTail.filter((t) => t.length > 0).map((text) => ({ type: 'text' as const, text })),
  ];
  const lastSystem = system.length - 1;
  if (free > 0 && lastSystem >= input.prefix.length) {
    system[lastSystem] = { ...system[lastSystem], cache_control: CONVERSATION_CACHE };
  }
  return { system, messages };
}

/**
 * The same request with every one-hour marker turned into a default one. Only
 * for the fallback in route.ts that retries when the API rejects the `ttl` field.
 */
export function withoutLongTtl<T extends { cache_control?: CacheControl }>(blocks: T[]): T[] {
  return blocks.map((b) => (b.cache_control?.ttl ? { ...b, cache_control: { type: 'ephemeral' } } : b));
}
