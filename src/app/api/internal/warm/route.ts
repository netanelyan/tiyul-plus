import {
  CACHE_TTL,
  agentModel,
  anthropicBase,
  cachedPrefix,
  cachedTools,
  warmDecision,
} from '@/lib/server/agentPrefix';
import { budgetFor, lastHeavyCallAt, measuredCost, recordSpend } from '@/lib/server/budget';
import type { TokenUsage } from '@/lib/server/aiCost';

/**
 * **Keeping the catalog prefix warm - and only when nobody keeps it warm
 * for us.**
 *
 * ## Why this exists
 *
 * The difference between a cold call and a warm one is measured:
 * **$0.447 vs $0.063**, all of it the index's cache write. A cache read
 * **extends the TTL for free**, so a real visitor warms the prefix for
 * the next one without paying anything for it.
 *
 * ## The conditions, each of which is a refusal to spend money
 *
 * The route sends a minimal request **only** if all of these hold:
 *
 * 1. **There was quiet** - no heavy call in the last `QUIET_MS`. If one
 *    happened, the cache was already refreshed for free and warming is a
 *    net waste. **The busier the site, the less this route acts - under
 *    steady traffic it does not act at all.**
 * 2. **The cache is still alive** - the last touch is within `STALE_MS`.
 *    Once the TTL expires, warming pays a full **write** for nobody; at
 *    that point it is better to let the next real visitor pay it anyway.
 *    This is also what keeps the route from burning money on a day with
 *    no visitors at all.
 * 3. **There is somebody to warm for** - a real human's call happened in
 *    the last 3 hours. Without this condition the route perpetuates
 *    itself: it records a spend, that spend is "the last touch", and it
 *    keeps re-warming a site with no visitors.
 * 4. **There is budget** - the daily ceiling is checked like on any other
 *    call.
 *
 * ## One variant only
 *
 * Only the index **without the kosher layer** is warmed - the more common
 * of the two. Warming both variants doubles the cost for the rarer one.
 *
 * ## Security
 *
 * The route costs money, so it is **off as long as `CRON_SECRET` is not
 * set**, and anyone without the secret gets 404 - the same answer a
 * nonexistent route gives.
 */

const notFound = () =>
  new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

const skip = (why: string) =>
  new Response(JSON.stringify({ warmed: false, why }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret means the feature is off, not "open to everyone"
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return notFound();
  if (!process.env.ANTHROPIC_API_KEY) return skip('no_key');

  /*
    The decision itself lives in `agentPrefix.ts` as a pure function,
    because it is the thing worth testing: three of its four answers are a
    refusal to spend money.
  */
  const [lastTouch, lastReal] = await Promise.all([
    lastHeavyCallAt(), // any touch, including our own warms - decides if the cache is still alive
    lastHeavyCallAt(true), // humans only - decides if there is anyone to warm for
  ]);
  const decision = warmDecision(lastTouch, Date.now(), CACHE_TTL, lastReal);
  if (decision !== 'warm') return skip(decision);

  // Budget: the same check as any other call, with its own system identity
  const budget = await budgetFor('system:warm');
  if (budget.exceeded) return skip(`budget_${budget.reason}`);

  const model = agentModel();
  const res = await fetch(`${anthropicBase()}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      max_tokens: 1,
      /*
        **Exactly the same tools and the same blocks as the chat**, from
        `agentPrefix.ts`. One short message after the cache breakpoint - it
        is not part of the prefix, so its content does not matter.
      */
      tools: cachedTools(),
      system: cachedPrefix(false),
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });

  if (!res.ok) {
    console.error('[warm] failed', res.status, (await res.text().catch(() => '')).slice(0, 200));
    return skip(`api_${res.status}`);
  }

  const data = (await res.json()) as { usage?: TokenUsage };
  const usage = data.usage ?? {};
  const usd = measuredCost(model, usage);
  /*
    Recorded like any other spend - both so it counts against the ceiling,
    and because this record **is** the last-touch marker: the next warm run
    will see it and not warm again.
  */
  recordSpend({
    identity: 'system:warm',
    userId: null,
    tripId: null,
    route: 'chat',
    model,
    usage,
  });

  const wrote = (usage.cache_creation_input_tokens ?? 0) > 0;
  if (wrote) {
    // A write means the cache was cold - i.e. the window above was not accurate
    console.warn('[warm] paid a cache WRITE, not a read - check QUIET/STALE window');
  }
  return new Response(
    JSON.stringify({
      warmed: true,
      usd,
      read: usage.cache_read_input_tokens ?? 0,
      wrote: usage.cache_creation_input_tokens ?? 0,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

export const GET = handle;
export const POST = handle;
