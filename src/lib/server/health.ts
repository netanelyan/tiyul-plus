/**
 * Server only - the liveness checks behind `/api/health`.
 *
 * ## What "healthy" is allowed to mean here
 *
 * Only things that can be established **cheaply and without side effects**.
 * A health check that costs money or writes a row is one nobody can afford to
 * poll, and an uptime monitor that polls once a minute is the entire point.
 *
 * So: the database is reached for real (one request, no table, no row), and
 * everything else is a configuration question answered from the environment.
 * The AI is deliberately NOT called - a model call costs $0.06-$0.45 and a
 * monitor would spend hundreds of dollars a month proving the key works.
 *
 * ## Degraded is not down
 *
 * `down` is reserved for the database, because without it nobody can sign in,
 * no trip syncs and no payment records. That is an outage worth waking
 * somebody for. A missing mail key or AI key is `off` - the site still plans
 * trips - and it must not page anyone at three in the morning.
 */
import { serviceHeaders } from '@/lib/server/supabaseAdmin';

export type CheckState = 'ok' | 'down' | 'off';
export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthChecks {
  db: CheckState;
  ai: CheckState;
  mail: CheckState;
  alerts: CheckState;
}

export interface HealthResult {
  status: HealthStatus;
  checks: HealthChecks;
  /** Milliseconds the database probe took, for spotting a slow-but-up database. */
  dbMs: number | null;
}

/** How long a result is reused. A monitor polling every 30s must not add load. */
export const HEALTH_CACHE_MS = 20_000;

let cached: { at: number; result: HealthResult } | null = null;

const supabaseUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * One request to PostgREST's root, which answers with the API schema.
 *
 * Deliberately not a `select` on a table: a table can be empty, renamed or
 * closed by RLS, and any of those would report "down" for a database that is
 * perfectly alive. The root answers as long as PostgREST is serving, which is
 * the thing being asked.
 */
export async function probeDb(
  fetchImpl: typeof fetch = fetch,
): Promise<{ state: CheckState; ms: number | null }> {
  const base = supabaseUrl();
  if (!base || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { state: 'off', ms: null };
  const started = Date.now();
  try {
    const res = await fetchImpl(`${base}/rest/v1/`, {
      headers: serviceHeaders(),
      signal: AbortSignal.timeout(4000),
    });
    const ms = Date.now() - started;
    /*
      A 4xx here still proves the service is answering - it is an auth or
      schema answer, not a dead host. Only a 5xx or a thrown fetch is "down".
      Reporting a bad key as an outage would wake somebody for a config
      problem, and reporting an outage as fine is worse; this splits them.
    */
    return { state: res.status >= 500 ? 'down' : 'ok', ms };
  } catch {
    return { state: 'down', ms: Date.now() - started };
  }
}

export function configChecks(): Omit<HealthChecks, 'db'> {
  return {
    ai: process.env.ANTHROPIC_API_KEY ? 'ok' : 'off',
    mail: process.env.RESEND_API_KEY ? 'ok' : 'off',
    alerts:
      process.env.PURCHASE_ALERT_WEBHOOK || process.env.AI_BUDGET_ALERT_WEBHOOK ? 'ok' : 'off',
  };
}

export function statusFrom(checks: HealthChecks): HealthStatus {
  if (checks.db === 'down') return 'down';
  /*
    `off` on the database means no key is configured at all. That is a real
    misconfiguration in production and should not read as healthy - but it is
    not an outage either, because it is the documented state of a deployment
    that has not been given its keys yet.
  */
  if (Object.values(checks).some((c) => c !== 'ok')) return 'degraded';
  return 'ok';
}

export async function runHealth(now = Date.now(), fetchImpl?: typeof fetch): Promise<HealthResult> {
  if (cached && now - cached.at < HEALTH_CACHE_MS) return cached.result;
  const db = await probeDb(fetchImpl);
  const checks: HealthChecks = { db: db.state, ...configChecks() };
  const result: HealthResult = { status: statusFrom(checks), checks, dbMs: db.ms };
  cached = { at: now, result };
  return result;
}

/** Test seam. */
export function resetHealthCacheForTest(): void {
  cached = null;
}
