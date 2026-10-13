/**
 * Pricing a request that writes to two cache TTLs at once.
 *
 * The chat now sends the catalog prefix with a one-hour marker and the
 * conversation behind it with five-minute markers (agentRequest.ts). The API
 * reports the split in `usage.cache_creation`, and the two are priced 2x and
 * 1.25x the input rate. Pricing both at the one-hour rate would overstate every
 * turn; pricing both at the five-minute rate would understate a cold one, which
 * is the dangerous direction on a spending ceiling.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costUsd } from './aiCost.ts';

const M = 1_000_000;

test('writes are priced per TTL when the response says which is which', () => {
  delete process.env.ANTHROPIC_CACHE_TTL;
  const c = costUsd('claude-sonnet-4-5', {
    cache_creation_input_tokens: 2 * M,
    cache_creation: { ephemeral_5m_input_tokens: M, ephemeral_1h_input_tokens: M },
  });
  assert.equal(Number(c.toFixed(2)), 3.75 + 6);
});

test('a write the breakdown does not account for is priced at the one-hour rate', () => {
  delete process.env.ANTHROPIC_CACHE_TTL;
  // Old-shaped usage (no breakdown) is priced exactly as before
  assert.equal(Number(costUsd('claude-sonnet-4-5', { cache_creation_input_tokens: M }).toFixed(2)), 6);
  // A breakdown that covers part of the total: the rest errs upward
  const c = costUsd('claude-sonnet-4-5', {
    cache_creation_input_tokens: 2 * M,
    cache_creation: { ephemeral_5m_input_tokens: M },
  });
  assert.equal(Number(c.toFixed(2)), 3.75 + 6);
});
