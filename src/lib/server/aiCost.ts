/**
 * Server-only - what a model call **really cost**, in dollars.
 *
 * Until now we counted "AI units" (`aiUnits`): a good internal measure for a
 * personal quota, but you cannot look at it and know whether the monthly
 * bill will be 5 dollars or 500. Netanel asked for a ceiling on **money**,
 * and money needs a price.
 *
 * The prices are current as of July 31, 2026 per Anthropic's pricing page.
 * They are not a "limit" and therefore live in code and not in a flag - a
 * limit changes when we decide, a price changes when the vendor decides,
 * and a price change deserves a commit that can be seen.
 *
 * **An unrecognized model is not estimated.** It falls to the most
 * conservative price in the table, because on a spending ceiling the safe
 * direction to be wrong is upward: pricing too high means stopping too
 * early, pricing too low means finding out from the invoice.
 */

export interface ModelPrice {
  /** Dollars per million tokens */
  input: number;
  output: number;
  /** Cache write with a 5-minute TTL - 1.25x the input rate */
  cacheWrite: number;
  /** Cache write with a 1-hour TTL - **2x the input rate**, and this is what we actually send */
  cacheWrite1h: number;
  cacheRead: number;
}

/**
 * Dollars per million tokens, per platform.claude.com/docs/en/about-claude/pricing
 *
 * **`cacheWrite1h` was added as a fix for under-pricing.** The table priced
 * every cache write at the 5-minute rate (1.25x), while `agentPrefix.ts`
 * has been sending `ttl: '1h'` since the long cache went in - and a
 * one-hour TTL costs **2x**. In other words every cold call was priced at
 * 62.5% of its real price.
 *
 * On a spending ceiling that is the error in the dangerous direction:
 * under-pricing means discovering the real number from the invoice. This
 * file already establishes that an unidentified model is priced at the most
 * expensive rate for exactly the same reason, and that simply had not been
 * applied to the TTL.
 */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-4-5': { input: 3, output: 15, cacheWrite: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
};

/** The most expensive rate we know - the default for an unidentified model */
const FALLBACK: ModelPrice = Object.values(MODEL_PRICES).reduce((a, b) =>
  a.output >= b.output ? a : b,
);

/**
 * $10 per 1,000 searches (Anthropic's price for `web_search_20260209`),
 * i.e. $0.01 per individual search. A fixed, model-independent cost -
 * counted separately from tokens.
 */
export const WEB_SEARCH_COST_USD = 0.01;

export function priceFor(model: string): ModelPrice {
  // Prefix match: "claude-sonnet-4-5-20260101" is the same price
  for (const [name, price] of Object.entries(MODEL_PRICES)) {
    if (model === name || model.startsWith(`${name}-`)) return price;
  }
  return FALLBACK;
}

export interface TokenUsage {
  input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
  /** How many web_search searches ran in this call - see webLookup.ts */
  web_search_requests?: number;
}

/**
 * The dollar cost of a single call.
 *
 * Anthropic's `input_tokens` is the input that did **not** come from the
 * cache - cache reads and writes are reported in separate fields, so there
 * is no double counting here. Searches are a fixed cost, counted
 * separately from tokens - see `WEB_SEARCH_COST_USD`.
 */
export function costUsd(model: string, u: TokenUsage): number {
  const p = priceFor(model);
  return (
    ((u.input_tokens ?? 0) * p.input +
      /*
        The rate is chosen by the TTL we **send**, not by what the response
        reports: `usage` does not distinguish the two write kinds in the
        field we read, and our own setting is known to us with certainty.
        `ANTHROPIC_CACHE_TTL=5m` also switches the pricing back to the short
        rate, so the two cannot fall out of sync.
      */
      (u.cache_creation_input_tokens ?? 0) *
        (process.env.ANTHROPIC_CACHE_TTL === '5m' ? p.cacheWrite : p.cacheWrite1h) +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      (u.output_tokens ?? 0) * p.output) /
      1_000_000 +
    (u.web_search_requests ?? 0) * WEB_SEARCH_COST_USD
  );
}

/** Short dollar display - four decimal places because a single turn costs pennies */
export const usd = (n: number): string => `$${n.toFixed(n < 1 ? 4 : 2)}`;
