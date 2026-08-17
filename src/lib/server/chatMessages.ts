/**
 * Sanitizing the message history the client sends to /api/chat.
 *
 * Separated from `api/chat/route.ts` because an App Router route handler may
 * not export anything that is not an HTTP method, and this logic must have
 * tests - it took down real conversations in production.
 *
 * ## The bug this file was born from
 *
 * A traveler attached a screenshot of a hotel booking confirmation **with no
 * text**, so the message was stored with `content: ''` and an image. Images
 * are sent to the model only on the last two messages (they are expensive,
 * and the whole history is resent every turn), so after two more turns this
 * message was sent **with no image and no text**. The Anthropic API rejects
 * the entire request:
 *
 *   400 invalid_request_error - "messages.2: user messages must have
 *   non-empty content"
 *
 * 400 is a permanent error, not a transient one, so every retry failed the
 * same way - the traveler tapped the same chip twice and got the generic
 * "something went wrong" message twice. This is also what killed the
 * original turn that looked like amnesia, before the error message was
 * fixed.
 *
 * ## What was tested against the real API (not assumed)
 *
 * - An empty or whitespace-only user message → 400. **This is what broke.**
 * - An empty assistant message → 200. Allowed, but useless.
 * - Two consecutive user messages → 200. There is no role-alternation
 *   requirement.
 *
 * The third check is what enables the fix: an empty message can simply be
 * **dropped** without stitching fake text in its place, because the
 * resulting sequence is legal.
 *
 * ## Why omission and not filler text
 *
 * We could have written "I attached an image" in its place. But once the
 * image is no longer sent, that is an invitation for the model to discuss a
 * document it cannot see and invent details from it - exactly what hard
 * rule 2 forbids. The agent's reply from that turn stays in the history, so
 * whatever it genuinely read off the image is preserved **in its own words**
 * without pretending to re-view the document.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** An image the user attached (downscaled data URL) - see lib/trip/imageAttach.ts */
  image?: string;
}

/** Only formats the model supports, and only base64 - no external URL */
export const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
/** Same ceiling as on the client side - the server does not trust the client */
export const MAX_IMAGE_CHARS = 1_400_000;
/** How many images are allowed per request (the history is resent every turn) */
export const MAX_IMAGES_PER_REQUEST = 2;

/**
 * A character budget for the entire conversation history.
 *
 * ## Why this exists, and what it fixed
 *
 * Until now the history was capped by **message count** (40) and by the
 * length of a single message (8,000 chars), i.e. up to 320,000 chars. That
 * looks reasonable under the English assumption of ~4 chars per token. But
 * the conversation here is dense Hebrew, **and in Hebrew a token is roughly
 * one character**.
 *
 * This number is not guessed - it is derived from a real production log:
 *
 *   400 invalid_request_error - "prompt is too long: 408754 tokens
 *   > 200000 maximum"
 *
 * The constant parts (the grounding index ~45k tokens, the prompt, the
 * detail block, the trip) explain ~70k. So the history alone contributed
 * ~337k tokens on at most 320,000 chars - a ratio of more than a token per
 * character.
 *
 * **And this is a persistent failure, not a one-off:** history only grows,
 * so the moment a conversation crosses the ceiling **every further turn in
 * it fails with the identical 400 forever**. That explains why a real
 * traveler saw the same error over and over in one long thread, and why
 * other fixes changed nothing for them.
 *
 * 50,000 chars ≈ 50k tokens in Hebrew. With ~88k of constant parts in the
 * worst case that leaves a comfortable margin under 200k, including room
 * for output.
 */
const HISTORY_CHAR_BUDGET = 50_000;

/** A message with neither text nor image carries no information */
function carriesNothing(m: ChatMessage): boolean {
  return !m.image && m.content.trim().length === 0;
}

/**
 * Role and text only, and an image only if it is a valid data URL of a
 * reasonable size, only on a user message, and only on the last two
 * messages that carry an image. Messages left with no content at all are
 * dropped - see the explanation at the top of the file.
 */
export function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const msgs: ChatMessage[] = [];
  for (const item of raw.slice(-40)) {
    if (!item || typeof item !== 'object') continue;
    const m = item as { role?: unknown; content?: unknown; image?: unknown };
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.slice(0, 8000) : '';
    const image = typeof m.image === 'string' ? m.image : '';
    const okImage =
      role === 'user' && image.length > 0 && image.length <= MAX_IMAGE_CHARS && IMAGE_DATA_URL.test(image);
    msgs.push(okImage ? { role, content, image } : { role, content });
  }
  let kept = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (!msgs[i].image) continue;
    if (kept < MAX_IMAGES_PER_REQUEST) kept += 1;
    else msgs[i] = { role: msgs[i].role, content: msgs[i].content };
  }
  // Must run after the image removal: the removal is itself what empties a
  // message whose entire content was an image.
  const carrying = msgs.filter((m) => !carriesNothing(m));

  // The character budget - newest to oldest, because the relevant context is
  // the end of the conversation. The last message always gets in (it is the
  // current turn): if it alone exceeds the budget it is truncated rather
  // than dropped, otherwise the traveler sends something long and gets no
  // answer at all. Must run before the first-assistant rule, otherwise the
  // truncation itself can expose an assistant message at the head of the
  // array.
  const budgeted: ChatMessage[] = [];
  let used = 0;
  for (let i = carrying.length - 1; i >= 0; i--) {
    const m = carrying[i];
    const cost = m.content.length;
    if (budgeted.length === 0) {
      budgeted.unshift(cost > HISTORY_CHAR_BUDGET ? { ...m, content: m.content.slice(-HISTORY_CHAR_BUDGET) } : m);
      used += Math.min(cost, HISTORY_CHAR_BUDGET);
      continue;
    }
    if (used + cost > HISTORY_CHAR_BUDGET) break;
    budgeted.unshift(m);
    used += cost;
  }

  // The history must open with a user message. Two ways to end up in a state
  // where it does not:
  //
  // 1. **A regression created by the fix above.** A conversation that opened
  //    with an image and no text - the first message becomes empty once the
  //    image leaves the window, gets dropped here, and what remains first is
  //    the agent's reply. The API returns 400 for that, meaning the
  //    "empty content" fix traded one error for another. Found in
  //    production.
  // 2. **Predating that:** `raw.slice(-40)` can open the window on an
  //    assistant message in any conversation longer than 40 messages,
  //    regardless of images.
  //
  // Removal is the correct solution, not merely the legal one: an assistant
  // message at the start of the array has no user turn it is answering, so
  // it carries no useful context anyway.
  let firstUser = 0;
  while (firstUser < budgeted.length && budgeted[firstUser].role !== 'user') firstUser += 1;
  return firstUser === 0 ? budgeted : budgeted.slice(firstUser);
}
