/**
 * Server only - system flags, i.e. a kill switch with no deploy.
 *
 * Why this exists: the agent is the product's largest expense. If something breaks - a
 * campaign bringing hundreds of people at once, a bug producing a loop, a leaked key -
 * the way to stop must be faster than a deploy. `agent_enabled=false` drops `/api/chat`
 * to the rule-based replies that already exist for the keyless mode, so the site keeps
 * working and the spend stops immediately.
 *
 * A 30-second cache: short enough that the switch feels immediate, and long enough not to
 * add a database read to every message.
 */

import { adminSelect, adminDbEnabled } from '@/lib/server/supabaseAdmin';

const TTL = 30_000;
let cache: { at: number; flags: Record<string, unknown> } | null = null;

async function load(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < TTL) return cache.flags;
  if (!adminDbEnabled()) return {};
  const rows = await adminSelect<{ key: string; value: unknown }>('app_flags', 'select=key,value');
  // A failed read does not trip the switch: the default is "the agent is running",
  // otherwise a momentary database glitch would silence the whole product.
  if (!rows) return cache?.flags ?? {};
  const flags: Record<string, unknown> = {};
  for (const r of rows) flags[r.key] = r.value;
  cache = { at: Date.now(), flags };
  return flags;
}

/** Whether the smart agent is active. The default, in any case of doubt: yes. */
export async function agentEnabled(): Promise<boolean> {
  const flags = await load();
  return flags.agent_enabled === false ? false : true;
}

export async function allFlags(): Promise<Record<string, unknown>> {
  return load();
}

/**
 * Whether the trip pass can be sold - **an interlock, and the default is NO.**
 *
 * This is the opposite default from `agentEnabled` above, deliberately. There the
 * failure of a database read must not silence the product, because the cost of a false
 * "off" is a working feature going dark. Here the cost of a false "on" is **taking ₪49
 * and giving nothing**, because the grant writes `plan_source = 'trip_pass'` and the
 * CHECK constraint rejects that until `sql/supabase-trip-pass.sql` has run.
 *
 * So the flag is set by that migration itself, as its last statement. No migration, no
 * flag, no sale - and the route answers `not-configured`, which the UI already renders
 * as "the purchase opens very soon". A payment that cannot be honoured is refused
 * before the money moves rather than alerted after it.
 *
 * The alternative was to deploy and rely on remembering to run the SQL first. That is
 * exactly the kind of manual precondition this project has repeatedly found unrun -
 * `supabase-consent.sql` sat unrun for weeks while the login promised a record.
 */
export async function tripPassSellable(): Promise<boolean> {
  const flags = await load();
  return flags.trip_pass_ready === true;
}

/** After a write - so the switch does not wait 30 seconds */
export function invalidateFlags() {
  cache = null;
}
