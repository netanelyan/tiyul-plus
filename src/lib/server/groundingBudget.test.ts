/**
 * The prompt has to fit in the context window, and this is the test that says so.
 *
 * Measured 2026-09-20 with Anthropic's own tokenizer: the worst case - the six
 * cities with the largest detail blocks, a history at its full 50,000-char
 * budget, kosher on - came to **207,822 input tokens against a 200,000 window.**
 * Over, before a single output token, on a prompt nobody had measured since the
 * catalog doubled.
 *
 * That is the failure the session log's entry (e) describes, and its shape is
 * the reason this test exists rather than a note: history only grows, so the
 * first turn that crosses the line makes every later turn in that conversation
 * fail identically and permanently. It cannot be noticed gradually.
 *
 * The assertions here are in **characters**, because a test may not call a paid
 * API. The conversion was measured rather than assumed (0.483 tokens/char on the
 * real worst-case mix), and `CHAR_CEILING` is derived from it with margin. If the
 * catalog grows into this, the right response is to lower `MAX_DETAIL_CHARS` or
 * shrink the index - not to raise the number here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_DETAIL_CHARS, buildGroundingDetail, buildGroundingIndex } from './grounding.ts';
import { destinations } from '@/data/destinations';
import { MAX_HISTORY_CHARS } from './chatMessages.ts';

/**
 * The measured budget. 200,000 tokens at the measured 0.483 tokens/char is
 * ~414,000 chars; this leaves ~10% for the reply and for the ratio being worse
 * on an unusually Hebrew-heavy conversation.
 */
const CHAR_CEILING = 375_000;

/** The six cities whose detail blocks are largest - the real worst case. */
function worstCities(n = 6): string[] {
  return destinations
    .map((d) => ({ slug: d.slug, size: buildGroundingDetail([d.slug], true).length }))
    .sort((a, b) => b.size - a.size)
    .slice(0, n)
    .map((x) => x.slug);
}

test('the detail block cannot exceed its size budget, whichever cities are asked for', () => {
  const detail = buildGroundingDetail(worstCities(), true);
  assert.ok(
    detail.length <= MAX_DETAIL_CHARS,
    `detail is ${detail.length} chars against a ${MAX_DETAIL_CHARS} budget`,
  );
});

test('asking for every destination at once still respects the budget', () => {
  // `relevantCitySlugs` caps the list, but the budget must not depend on that -
  // the whole point is that the guarantee lives where the text is produced.
  const all = destinations.map((d) => d.slug);
  const detail = buildGroundingDetail(all, true);
  assert.ok(
    detail.length <= MAX_DETAIL_CHARS,
    `detail for all ${all.length} destinations is ${detail.length} chars`,
  );
});

test('one city over budget on its own is still sent rather than dropped', () => {
  // A detail block about nothing is worse than a large one, and the index still
  // carries every id and name for whatever was cut.
  const biggest = worstCities(1);
  const detail = buildGroundingDetail(biggest, true);
  assert.ok(detail.includes(biggest[0]), `${biggest[0]} was dropped entirely`);
});

test('trip cities are kept and passing mentions are what gets cut', () => {
  const [big1, big2] = worstCities(2);
  const small = destinations
    .map((d) => ({ slug: d.slug, size: buildGroundingDetail([d.slug], true).length }))
    .sort((a, b) => a.size - b.size)[0].slug;
  // Caller order carries the priority; the first entries must survive.
  const detail = buildGroundingDetail([small, big1, big2], true);
  assert.ok(detail.includes(`"slug":"${small}"`), 'the first city was dropped');
});

test('the whole worst-case prompt fits the context window', () => {
  const index = buildGroundingIndex(true).length;
  const detail = buildGroundingDetail(worstCities(), true).length;
  const trip = 6_000; // a large serialized trip
  const total = index + detail + MAX_HISTORY_CHARS + trip;
  assert.ok(
    total <= CHAR_CEILING,
    `worst-case prompt is ${total.toLocaleString()} chars (index ${index.toLocaleString()}, ` +
      `detail ${detail.toLocaleString()}, history ${MAX_HISTORY_CHARS.toLocaleString()}) ` +
      `against a ${CHAR_CEILING.toLocaleString()} ceiling - lower MAX_DETAIL_CHARS or shrink the index`,
  );
});
