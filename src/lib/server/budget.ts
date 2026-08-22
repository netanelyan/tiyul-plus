import { dayKey } from '@/lib/server/limits';
import { eq, neq, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { allFlags } from '@/lib/server/flags';
import { costUsd, type TokenUsage } from '@/lib/server/aiCost';
import { serviceHeaders } from '@/lib/server/supabaseAdmin';
import { SUBSCRIBER_CAP_USD, SUBSCRIBER_MONTHLY_CAP_USD, type PaidPlan } from '@/lib/plans';

/**
 * Server only - **the AI spending ceiling**, with two wallets and a per-caller cap.
 *
 * ## What changed, and why it is structural
 *
 * The first version was a single wallet. Netanel pointed out the flaw: one
 * anonymous visitor can burn a large share of the ceiling, and a handful of
 * them switch the agent off **for everyone** until midnight. That turns a
 * cost problem into an outage, which is worse.
 *
 * Two protections, both of them:
 *
 * 1. **Two wallets.** Anonymous traffic has its own budget - `anonShare()` of
 *    the day, tunable without a deploy from /admin (see there). Signed-in
 *    users draw from "everything anonymous traffic has not spent", so they
 *    **always** keep at least `1 - anonShare()` of the day, and there is no
 *    path by which an anonymous caller can switch them off - regardless of
 *    the value of anonShare() at that moment.
 * 2. **A per-caller cap.** No identity - signed in or not - can exceed a small
 *    fraction of the day. Even ten abusers cannot switch off the product,
 *    they only switch off themselves.
 *
 * ## Why signed-in users do not get a hard wallet of their own
 *
 * Two hard wallets would create the mirror problem: on a quiet day for
 * anonymous traffic, signed-in users would be blocked at their fixed share
 * while the anonymous share sits unused. The formula here gives signed-in
 * users everything unused, while still guaranteeing them a floor - see the
 * test "on a quiet day for anonymous traffic, signed-in users get the whole
 * budget".
 *
 * ## How spending is measured - a question Netanel asked explicitly
 *
 * **From real reporting, not from estimation.** The numbers come from
 * Anthropic's own `usage`: `message_start` carries the input and cache
 * counts, `message_delta` the final output. We do not count tokens ourselves.
 *
 * Three paths where the number **can drift downward**, each handled:
 *
 * 1. **A call cut off mid-stream** - `message_delta` never arrived, so there
 *    is no `output_tokens`. Those tokens were already billed. `costUsd` gets
 *    a conservative estimate from the length of the text that was actually
 *    streamed, instead of zero.
 * 2. **A database write that fails** - the local count is still correct for
 *    this instance, and the next sync pulls the maximum.
 * 3. **The database being unreachable at all** - and that is the real hole:
 *    without a shared total each instance counts alone, and the effective
 *    ceiling multiplies by the number of instances. **Here the system fails
 *    closed**: if persistence is configured and we could not read the daily
 *    total for `FAIL_CLOSED_MS`, the agent stops accepting requests. Being
 *    down for a few minutes beats spending without knowing how much.
 */

/**
 * The default, in dollars per day, for all users combined.
 *
 * ## **These numbers were derived from measurement, after the previous estimate was wrong**
 *
 * The first version assumed "a turn costs $0.01-$0.13". Two real measurements
 * (July 31): **first call of a session $0.447, the call after it $0.063.**
 * The difference is the cache write of the catalog prefix (~80k tokens).
 * Which means:
 *
 * - **Our cost is per cold session, not per message.**
 * - And therefore the cost per visitor **falls as traffic rises** - when the
 *   cache is warm, the next visitor's first call is a cache read too.
 *
 * A full anonymous planning session (25 messages, the tier's ceiling) costs,
 * per these measurements, about $2.1 typically and about $2.7 at worst.
 * **The per-caller cap must sit comfortably above that number**, otherwise
 * exactly what happened to Netanel happens to every visitor: blocked after
 * four messages.
 *
 * ## **The per-caller cap was decoupled from the daily ceiling, and that is what brought the day down to $10**
 *
 * The previous version derived the per-caller cap as a percentage of the day
 * (12%). That chained the two numbers together in the wrong direction: for a
 * person to get $3 - i.e. enough to complete a ~$2.1 planning session - **the
 * day had to be $25**, which is $750/month of exposure in the extreme case.
 * Netanel phrased it precisely: we do not want $750/month of exposure to
 * protect a $2 session.
 *
 * Now the per-caller cap is an **absolute number** (`CALLER_CAP_USD`), and
 * the day is a separate number. The day can be lowered without cutting
 * anyone off mid-planning.
 *
 * $10/day is **$300/month** in the extreme case, and single dollars in
 * practice. And one text field in /admin changes it without a deploy, once
 * traffic justifies it.
 */
export const DEFAULT_DAILY_BUDGET_USD = 10;

/**
 * The default for anonymous traffic's share of the daily budget, when no
 * flag and no environment variable set a different value. **Read
 * `anonShare()` at runtime - this constant is only the fallback.**
 *
 * **55%, i.e. more than half - and not by accident.** On the eve of launch
 * almost all traffic (organic and ads) comes from logged-out visitors, and
 * signed-in users barely exist - so the expensive block is of an anonymous
 * visitor, not a signed-in one. At 40% the anonymous wallet was $4, i.e. one
 * full session and a bit; at 55% it is $5.50 - two cold sessions, and with a
 * warm cache three to four.
 *
 * **This is still only a default.** Netanel tunes the ratio itself from
 * /admin without a deploy (`ai_anon_share`, see `anonShare()`) based on what
 * actually shows up at launch - so no number here, including 55%, should be
 * treated as the permanently "correct value". The signed-in floor is
 * `1 - anonShare()`, and on days quiet for anonymous traffic they get
 * everything (see `budgetFor`).
 */
export const DEFAULT_ANON_SHARE = 0.55;

/**
 * **The ceiling one identity can spend per day, in dollars. An absolute number.**
 *
 * This is the number that used to be a percentage of the day, and that is
 * the whole point: it is derived from **what a session costs**, not from
 * what we are willing to spend in total. Those two things are unrelated,
 * and as long as they were tied together, the day could not be lowered
 * without cutting people off mid-session.
 *
 * Measured: a full planning session is ~$2.1 typical and ~$2.7 at worst, on
 * a cold cache. $3.00 sits comfortably above both.
 *
 * The practical meaning of the decoupling: if the daily ceiling is lowered
 * to $5, nobody gets blocked mid-session - fewer people simply get in that
 * day. That is the correct behavior, and in the previous version it was
 * inverted.
 */
export const CALLER_CAP_USD = 3.0;

/**
 * Anonymous and signed-in callers get **the same per-caller cap**, and that
 * is an explicit instruction from the session where this was fixed: this
 * used to be a percentage of the anonymous wallet, i.e. $0.225 - less than
 * one cold call measured at $0.447 - and an anonymous visitor was blocked
 * after a message or two. That is exactly what happened to Netanel.
 *
 * What it means now: a single anonymous caller can take up to $3 out of an
 * anonymous wallet sized `budget * anonShare()` (by default, $10 * 55% =
 * $5.50). This is a deliberate trade - "one visitor who completes a session"
 * beats "three visitors who all get blocked midway", and anyone genuinely
 * abusing hits the daily message quota and the burst limit long before the
 * money cap.
 */
export const ANON_CALLER_CAP_USD = CALLER_CAP_USD;

/**
 * How many times higher the IP cap is than a single person's cap.
 *
 * The IP is not a quota but a **safety net**: an Israeli mobile carrier puts
 * tens of thousands of devices behind one address, so a tight cap there
 * blocks people who have never visited the site. 25x means a shared address
 * only hits it if twenty-five distinct visitors each exhausted their
 * personal quota on the same day from the same address - and in practice the
 * anonymous wallet runs out long before that, so this net only touches a
 * single machine cycling identifiers in a loop.
 */
export const IP_BACKSTOP_MULTIPLE = 25;

/** Above this fraction of the day a general alert is sent, once per day */
export const ALERT_AT = 0.9;

/**
 * An **immediate and separate** alert about a single source.
 *
 * Sent when one identity has passed 60% of its personal cap - i.e. **before**
 * it gets blocked, which is the only moment anything can be done about it.
 * This is the alert Netanel asked to be woken up for; the general one is
 * just "a busy day".
 */
export const CALLER_ALERT_AT = 0.6;

/**
 * How long we may go without a shared total before locking.
 *
 * Five minutes: enough to absorb a momentary database hiccup without taking
 * the product down, and short enough that we do not spend much blindly.
 */
const FAIL_CLOSED_MS = 5 * 60_000;

/** The cost attributed to a call that reported no numbers at all. Conservative on purpose. */
const UNMEASURED_CALL_USD = 0.05;

const supaUrl = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const persistent = () => Boolean(supaUrl() && serviceKey());

/*
  Via `supabaseAdmin` and not a local copy: an `sb_secret_` key is not a JWT,
  and PostgREST rejects a `Bearer` that is not a JWT. The copy that used to
  live here always sent one, meaning on a project with the new key format
  every write from here was rejected - silently.
*/
const headers = () => serviceHeaders();

interface DayState {
  day: string;
  /** Total for the day */
  usd: number;
  /** Of that - anonymous traffic */
  anonUsd: number;
  syncedAt: number;
  /** When a sync last succeeded - the basis for failing closed */
  lastOk: number;
  /** Spend per identity, today */
  callers: Map<string, number>;
  /** Identities an alert has already been sent about */
  alertedCallers: Set<string>;
  alerted: boolean;
}

const fresh = (day: string): DayState => ({
  day,
  usd: 0,
  anonUsd: 0,
  syncedAt: 0,
  lastOk: Date.now(),
  callers: new Map(),
  alertedCallers: new Set(),
  alerted: false,
});

let state: DayState = fresh(dayKey());
const SYNC_MS = 20_000;

function today(): DayState {
  const day = dayKey();
  if (state.day !== day) state = fresh(day);
  return state;
}

/** Whether the identity is anonymous (per the key set in identity.ts) */
export const isAnonIdentity = (id: string): boolean => !id.startsWith('user:');

/* ---------- The ceiling ---------- */

async function flagNumber(key: string): Promise<number | null> {
  const flags = await allFlags().catch(() => ({}) as Record<string, unknown>);
  const raw = flags[key];
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** The total daily ceiling */
export async function dailyBudgetUsd(): Promise<number> {
  const fromFlag = await flagNumber('ai_daily_budget_usd');
  if (fromFlag !== null) return fromFlag;
  const fromEnv = Number(process.env.AI_DAILY_BUDGET_USD);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return DEFAULT_DAILY_BUDGET_USD;
}

/** A valid fraction - 0..1. A corrupt value (e.g. via a hand-written DB row) falls through. */
const clampShare = (n: number): number | null => (Number.isFinite(n) && n >= 0 && n <= 1 ? n : null);

/**
 * Anonymous traffic's share of the daily budget - **tunable at runtime, like
 * `dailyBudgetUsd`, in exactly the same priority order**: flag (`/admin`,
 * no deploy) → environment variable → `DEFAULT_ANON_SHARE`.
 *
 * The signed-in floor (`1 - anonShare()`) is never eroded by this value
 * alone - see the `min` in `budgetFor`, which is the actual protection.
 */
export async function anonShare(): Promise<number> {
  const fromFlag = clampShare((await flagNumber('ai_anon_share')) ?? NaN);
  if (fromFlag !== null) return fromFlag;
  const fromEnv = clampShare(Number(process.env.AI_ANON_SHARE));
  if (fromEnv !== null) return fromEnv;
  return DEFAULT_ANON_SHARE;
}

/* ---------- Reading the state ---------- */

async function sync(s: DayState): Promise<void> {
  if (!persistent() || Date.now() - s.syncedAt <= SYNC_MS) return;
  s.syncedAt = Date.now();
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/ai_spend_daily?${pgQuery(eq('day', s.day), pgSelect(['usd', 'anon_usd']))}`,
      { headers: headers(), signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return;
    const rows = (await res.json()) as { usd?: number | string; anon_usd?: number | string }[];
    const total = Number(rows[0]?.usd ?? 0);
    const anon = Number(rows[0]?.anon_usd ?? 0);
    // max, not assignment: last-moment writes are not necessarily there yet
    if (Number.isFinite(total) && total > s.usd) s.usd = total;
    if (Number.isFinite(anon) && anon > s.anonUsd) s.anonUsd = anon;
    s.lastOk = Date.now();
  } catch {
    /* We keep the local count; if this persists - we fail closed below */
  }
}

/** One identity's spend today. Merges from storage the first time each day. */
async function callerSpend(s: DayState, identity: string): Promise<number> {
  const local = s.callers.get(identity);
  if (local !== undefined || !persistent()) return local ?? 0;
  s.callers.set(identity, 0); // marker for "already tried" - best effort, once
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/ai_spend_caller?${pgQuery(eq('day', s.day), eq('identity', identity), pgSelect(['usd']))}`,
      { headers: headers(), signal: AbortSignal.timeout(3000) },
    );
    if (res.ok) {
      const rows = (await res.json()) as { usd?: number | string }[];
      const remote = Number(rows[0]?.usd ?? 0);
      if (Number.isFinite(remote) && remote > 0) s.callers.set(identity, remote);
    }
  } catch {
    /* The local memory keeps protecting */
  }
  return s.callers.get(identity) ?? 0;
}

export type BlockReason = 'anon-pool' | 'caller' | 'total' | 'unmeasured' | null;

export interface BudgetState {
  /** The total daily ceiling */
  budget: number;
  spent: number;
  anonSpent: number;
  /** The budget remaining for this caller, per their wallet */
  poolBudget: number;
  poolSpent: number;
  callerSpent: number;
  callerBudget: number;
  exceeded: boolean;
  reason: BlockReason;
  ratio: number;
  /** Fraction of the per-caller cap - the basis for the single-source alert */
  callerRatio: number;
}

/**
 * The state for a specific caller. **This is the function the gates call.**
 */
export async function budgetFor(identity: string): Promise<BudgetState> {
  const s = today();
  const budget = await dailyBudgetUsd();
  const share = await anonShare();
  await sync(s);
  const anon = isAnonIdentity(identity);
  const callerSpent = await callerSpend(s, identity);

  /*
    The caller's wallet.

    Anonymous: a fixed share of the day (`anonShare()`), and nothing more.
    Signed-in: everything anonymous traffic did not spend - i.e. at least
    `1 - anonShare()` and always more when they are quiet. There is no path
    by which an anonymous caller lowers the floor, **regardless of the value
    of anonShare() at that moment** - that is what the min below enforces.
  */
  /*
    The `min` is not decoration. The cap check happens **before** the call,
    so an anonymous caller's last call can overshoot their wallet slightly -
    and without this bound, the overshoot would be subtracted from the
    signed-in floor. The test caught exactly this: 11 visitors spent $1.65
    out of a $1.50 wallet, and the signed-in floor dropped from $3.50 to
    $3.35. A guarantee that erodes is not a guarantee.
  */
  const anonDraw = Math.min(s.anonUsd, budget * share);
  const poolBudget = anon ? budget * share : budget - anonDraw;
  const poolSpent = anon ? s.anonUsd : Math.max(0, s.usd - s.anonUsd);
  /*
    **An absolute number, not a percentage of the day.**

    The `min` against the day is the only guard left: if someone lowers the
    daily ceiling in /admin to $1, a $3 per-caller cap would be larger than
    the whole day and lose all meaning. Beyond that the two numbers are
    fully independent - which is exactly what allows lowering the day
    without touching any session.
  */
  const callerBudget = Math.min(anon ? ANON_CALLER_CAP_USD : CALLER_CAP_USD, budget);

  let reason: BlockReason = null;
  if (budget <= 0) reason = 'total';
  else if (persistent() && Date.now() - s.lastOk > FAIL_CLOSED_MS) reason = 'unmeasured';
  else if (callerSpent >= callerBudget) reason = 'caller';
  else if (poolSpent >= poolBudget) reason = anon ? 'anon-pool' : 'total';

  return {
    budget,
    spent: s.usd,
    anonSpent: s.anonUsd,
    poolBudget,
    poolSpent,
    callerSpent,
    callerBudget,
    exceeded: reason !== null,
    reason,
    ratio: budget > 0 ? s.usd / budget : 1,
    callerRatio: callerBudget > 0 ? callerSpent / callerBudget : 1,
  };
}

/**
 * When a **real** heavy call last touched the prefix - i.e. when the cache
 * was last refreshed, including warm-ups (they are recorded like any other
 * spend).
 *
 * `null` = impossible to know (no persistence, or a failed read). The
 * warm-up path interprets that as "do not warm": when in doubt, the safe
 * direction is to not spend money.
 */
export const WARM_IDENTITY = 'system:warm';

/**
 * @param realOnly ignore our own warm-ups and look only at human traffic.
 *
 * **Without this flag the warm-up would perpetuate itself.** The path
 * records its own spend like any other call - and that is correct, it
 * really costs money - but then that record is itself "the last touch", so
 * 40 minutes later it warms again, and again. On a site with zero visitors
 * it would keep a warm cache for nobody, forever.
 */
export async function lastHeavyCallAt(realOnly = false): Promise<number | null> {
  if (!persistent()) return null;
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/ai_spend?${pgQuery(
        eq('route', 'chat'),
        ...(realOnly ? [neq('identity', WARM_IDENTITY)] : []),
        pgSelect(['at']),
        'order=at.desc',
        'limit=1',
      )}`,
      { headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { at?: string }[];
    const at = rows[0]?.at ? Date.parse(rows[0].at) : NaN;
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

/** A general state for display only (the admin area) - no caller context */
export async function budgetOverview(): Promise<{
  budget: number;
  spent: number;
  anonSpent: number;
  userSpent: number;
  ratio: number;
  stale: boolean;
}> {
  const s = today();
  const budget = await dailyBudgetUsd();
  await sync(s);
  return {
    budget,
    spent: s.usd,
    anonSpent: s.anonUsd,
    userSpent: Math.max(0, s.usd - s.anonUsd),
    ratio: budget > 0 ? s.usd / budget : 1,
    stale: persistent() && Date.now() - s.lastOk > FAIL_CLOSED_MS,
  };
}

/* ---------- The premium wallet, fully isolated from the two above ---------- */

/**
 * **The third wallet, and why it is not "another part" of the `budgetFor` formula.**
 *
 * Anonymous and free-signed-in share one daily budget, split by
 * `anonShare()`. A premium subscriber **does not enter that formula at
 * all** - not as a third wallet inside it and not as an addition to
 * "signed-in". Two reasons, and this is the explicit requirement: anonymous
 * traffic that exhausts its day **must not** block a paying subscriber
 * (they never check against `budgetFor` at all - see below), and a premium
 * subscriber who abuses **must not** subtract from the budget the free
 * tiers share (`recordSpend` skips `bump_ai_spend` for them - see there).
 * Both directions, simultaneously, by making the two mechanisms simply
 * never touch the same numbers.
 *
 * The cap itself is **monthly and personal**: `SUBSCRIBER_MONTHLY_CAP_USD`
 * (in the shared file `lib/plans.ts`, because it is also displayed on the
 * premium page) per user_id, measured from `subscriber_spend_monthly` (see
 * `supabase-premium-budget.sql`) - a separate rollup table, not a sum over
 * raw ai_spend before every request, for exactly the same reason
 * `ai_spend_daily` exists.
 */

/** A month key in UTC - 'YYYY-MM', consistent across instances like `dayKey`. */
export const monthKey = (d = new Date()): string => d.toISOString().slice(0, 7);

interface MonthState {
  month: string;
  /** Spend per subscriber, this month - exactly the same pattern as `DayState.callers` */
  subscribers: Map<string, number>;
}

const freshMonth = (month: string): MonthState => ({ month, subscribers: new Map() });
let monthState: MonthState = freshMonth(monthKey());

function thisMonth(): MonthState {
  const month = monthKey();
  if (monthState.month !== month) monthState = freshMonth(month);
  return monthState;
}

/** One subscriber's spend this month. Merges from remote storage on the first read. */
async function subscriberSpend(m: MonthState, userId: string): Promise<number> {
  const local = m.subscribers.get(userId);
  if (local !== undefined || !persistent()) return local ?? 0;
  m.subscribers.set(userId, 0); // marker for "already tried" - best effort, once
  try {
    const res = await fetch(
      `${supaUrl()}/rest/v1/subscriber_spend_monthly?${pgQuery(
        eq('user_id', userId),
        eq('month', m.month),
        pgSelect(['usd']),
      )}`,
      { headers: headers(), signal: AbortSignal.timeout(3000) },
    );
    if (res.ok) {
      const rows = (await res.json()) as { usd?: number | string }[];
      const remote = Number(rows[0]?.usd ?? 0);
      if (Number.isFinite(remote) && remote > 0) m.subscribers.set(userId, remote);
    }
  } catch {
    /* The local memory keeps protecting */
  }
  return m.subscribers.get(userId) ?? 0;
}

export interface PremiumBudgetState {
  budget: number;
  spent: number;
  exceeded: boolean;
  ratio: number;
}

/**
 * The state for one premium subscriber. **This is the function `/api/chat`
 * calls instead of `budgetFor` when the caller is premium** - not in
 * addition to it.
 */
export async function premiumBudgetFor(
  userId: string,
  plan: PaidPlan = 'premium',
): Promise<PremiumBudgetState> {
  const m = thisMonth();
  const spent = await subscriberSpend(m, userId);
  /*
    The cap is **per plan**, and the caller has to say which - the spend rollup
    is keyed on user_id alone and knows nothing about what anyone pays. The
    default is the cheaper cap on purpose: if a call site is ever added that
    forgets to pass the plan, it under-serves a subscriber (visible, they
    complain) rather than over-spending against a cap they never bought.
  */
  const budget = SUBSCRIBER_CAP_USD[plan];
  return {
    budget,
    spent,
    exceeded: spent >= budget,
    ratio: budget > 0 ? spent / budget : 1,
  };
}

/**
 * The subscribers' real money, **for the admin area only** - Netanel: "on
 * the dashboard I still want to see the real money, per subscriber and in
 * total. That's for me, not for them." No part of this reaches any user
 * surface.
 *
 * One read of up to 1,000 rows for the current month (subscribers are
 * counted in dozens, not thousands - and if we reach a thousand paying
 * subscribers, truncated will say so instead of presenting a partial sum as
 * if it were complete).
 */
export interface PremiumSpendOverview {
  month: string;
  totalUsd: number;
  subscribers: number;
  /**
   * Premium's personal cap, under its old name.
   *
   * **It is not "the" cap any more and the admin card must not print it as
   * one** - the rollup table is keyed on user_id and carries no plan, so a row
   * here cannot be compared to a single ceiling. `caps` carries both and the
   * card shows both; this field stays only so an older reader of the endpoint
   * does not break.
   */
  capUsd: number;
  caps: Record<PaidPlan, number>;
  top: { userId: string; usd: number; requests: number }[];
  truncated: boolean;
  /** false = no persistence or the read failed - display "not collected", not zero */
  stored: boolean;
}

export async function premiumSpendOverview(topN = 10): Promise<PremiumSpendOverview> {
  const month = monthKey();
  const base: PremiumSpendOverview = {
    month,
    totalUsd: 0,
    subscribers: 0,
    capUsd: SUBSCRIBER_MONTHLY_CAP_USD,
    caps: SUBSCRIBER_CAP_USD,
    top: [],
    truncated: false,
    stored: false,
  };
  if (!persistent()) return base;
  try {
    const MAX_ROWS = 1000;
    const res = await fetch(
      `${supaUrl()}/rest/v1/subscriber_spend_monthly?${pgQuery(
        eq('month', month),
        pgSelect(['user_id', 'usd', 'requests']),
        pgOrder('usd', 'desc'),
        pgLimit(MAX_ROWS),
      )}`,
      { headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return base;
    const rows = (await res.json()) as { user_id: string; usd: number | string; requests?: number }[];
    const parsed = rows
      .map((r) => ({ userId: r.user_id, usd: Number(r.usd) || 0, requests: r.requests ?? 0 }))
      .filter((r) => r.userId);
    return {
      month,
      totalUsd: parsed.reduce((n, r) => n + r.usd, 0),
      subscribers: parsed.length,
      capUsd: SUBSCRIBER_MONTHLY_CAP_USD,
    caps: SUBSCRIBER_CAP_USD,
      top: parsed.slice(0, topN),
      truncated: rows.length >= MAX_ROWS,
      stored: true,
    };
  } catch {
    return base;
  }
}

/** Above this fraction of the personal monthly cap - an immediate alert, once per month per subscriber */
export const PREMIUM_ALERT_AT = 0.8;
const premiumAlerted = new Set<string>(); // 'userId|month', resets on its own when the month in the key changes

/**
 * An alert about a subscriber approaching their cap. **Before** they get
 * blocked, like the single-source alert above - this is the moment when it
 * is still possible to check whether it is real usage (worth considering
 * raising the cap) or abuse.
 */
export function maybeAlertPremium(s: PremiumBudgetState, userId: string, month: string): void {
  if (s.ratio < PREMIUM_ALERT_AT) return;
  const key = `${userId}|${month}`;
  if (premiumAlerted.has(key)) return;
  premiumAlerted.add(key);
  if (premiumAlerted.size > 20_000) premiumAlerted.clear(); // crude memory protection
  void post(
    `טיול+ · מנוי פרימיום הוציא $${s.spent.toFixed(2)} החודש - ${Math.round(
      s.ratio * 100,
    )}% מהתקרה האישית שלו ($${s.budget.toFixed(2)}). לא ישפיע על אף אחד אחר - שווה מבט אם זה שימוש אמיתי.`,
    { kind: 'premium-subscriber', userId: userId.slice(0, 40), usd: s.spent },
  );
}

/* ---------- Recording ---------- */

/**
 * The cost of one call, including handling of missing reporting.
 *
 * `streamedChars` is the length of the text actually streamed. It is used
 * **only** when there is no `output_tokens` - i.e. when the reply was cut
 * off before `message_delta` - and then a conservative estimate beats zero:
 * those tokens were already billed.
 */
export function measuredCost(model: string, u: TokenUsage, streamedChars = 0): number {
  const reported = costUsd(model, u);
  const nothingReported =
    !u.input_tokens && !u.cache_creation_input_tokens && !u.cache_read_input_tokens;

  if (u.output_tokens === undefined && streamedChars > 0) {
    // Hebrew is roughly one token per one-to-two characters; half the
    // character count is a cautious, not generous, estimate
    const est = { ...u, output_tokens: Math.ceil(streamedChars / 2) };
    return costUsd(model, est);
  }
  if (nothingReported && !u.output_tokens) {
    // A call that reported nothing - we do not count it as free
    return reported > 0 ? reported : UNMEASURED_CALL_USD;
  }
  return reported;
}

export function recordSpend(entry: {
  identity: string;
  userId: string | null;
  tripId: string | null;
  route: 'chat' | 'generate-trip';
  model: string;
  usage: TokenUsage;
  /** The length of the streamed text - for the estimate when reporting is missing */
  streamedChars?: number;
  /**
   * Premium subscriber? - decides which wallet this spend is charged to.
   * `true` requires `userId` (premium is by definition always signed in) -
   * otherwise treated as non-premium, because there is nobody to charge a
   * personal monthly spend to.
   */
  premium?: boolean;
}): number {
  const amount = measuredCost(entry.model, entry.usage, entry.streamedChars ?? 0);
  if (!(amount > 0)) return 0;
  const isPremium = Boolean(entry.premium && entry.userId);

  /*
    **The split happens here, not a line earlier.** The raw ai_spend row
    (below) is written identically for everyone - it is only bookkeeping.
    What differs is which rollup gets updated: premium updates only
    `subscriber_spend_monthly` (monthly, personal), non-premium updates only
    `ai_spend_daily`/`ai_spend_caller` (daily, shared) - never both for the
    same spend. This is the actual enforcement of "both directions": premium
    is not counted against the budget the free tiers share, and vice versa.
  */
  if (isPremium) {
    const m = thisMonth();
    m.subscribers.set(entry.userId!, (m.subscribers.get(entry.userId!) ?? 0) + amount);
    if (m.subscribers.size > 20_000) m.subscribers.clear(); // crude memory protection
  } else {
    const s = today();
    const anon = isAnonIdentity(entry.identity);
    s.usd += amount;
    if (anon) s.anonUsd += amount;
    s.callers.set(entry.identity, (s.callers.get(entry.identity) ?? 0) + amount);
    if (s.callers.size > 20_000) s.callers.clear(); // crude memory protection
  }

  if (!persistent()) return amount;

  const usdRounded = Number(amount.toFixed(6));
  const day = dayKey();
  // The raw bookkeeping row - for everyone, premium included. No blocking
  // relies on this table (see the note above about ai_spend_daily), reports only.
  fetch(`${supaUrl()}/rest/v1/ai_spend`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      day,
      identity: entry.identity,
      user_id: entry.userId,
      trip_id: entry.tripId,
      route: entry.route,
      model: entry.model,
      in_tokens: entry.usage.input_tokens ?? 0,
      cached_tokens: entry.usage.cache_read_input_tokens ?? 0,
      write_tokens: entry.usage.cache_creation_input_tokens ?? 0,
      out_tokens: entry.usage.output_tokens ?? 0,
      usd: usdRounded,
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});

  if (isPremium) {
    fetch(`${supaUrl()}/rest/v1/rpc/bump_subscriber_spend`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ p_user: entry.userId, p_month: monthKey(), p_usd: usdRounded }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  } else {
    fetch(`${supaUrl()}/rest/v1/rpc/bump_ai_spend`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        p_day: day,
        p_usd: usdRounded,
        p_anon: isAnonIdentity(entry.identity),
        p_identity: entry.identity,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }

  return amount;
}

/* ---------- Alerts ---------- */

export interface AlertPostResult {
  /** Whether any webhook address is configured at all */
  configured: boolean;
  /** The fetch succeeded (2xx status) */
  ok: boolean;
  /** Why it failed, if it failed - for the UI and the log */
  error?: string;
}

/**
 * Actually sends, and **returns whether it worked** - not just
 * fire-and-forget.
 *
 * The previous version swallowed every failure: `.catch(() => {})` without
 * even a log. A wrong webhook URL or a service going down would leave no
 * trace at all, and the alert that is supposed to "wake Netanel up" would
 * vanish exactly when it is needed most. Now every failure is written to
 * `console.warn` (visible in the Vercel logs) even on the regular path, and
 * returned explicitly when someone awaits it - see `sendTestAlert`.
 */
async function post(text: string, extra: Record<string, unknown>): Promise<AlertPostResult> {
  console.warn(`[budget] ALERT ${text}`);
  const hook = process.env.AI_BUDGET_ALERT_WEBHOOK;
  if (!hook) {
    console.warn('[budget] ALERT not sent: AI_BUDGET_ALERT_WEBHOOK is not configured');
    return { configured: false, ok: false, error: 'no_webhook_configured' };
  }
  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `text` for Slack, `content` for Discord - same message, no new dependency
      body: JSON.stringify({ text, content: text, ...extra }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const error = `webhook_http_${res.status}`;
      console.warn(`[budget] ALERT delivery failed: ${error}`);
      return { configured: true, ok: false, error };
    }
    return { configured: true, ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'webhook_fetch_failed';
    console.warn(`[budget] ALERT delivery failed: ${error}`);
    return { configured: true, ok: false, error };
  }
}

/**
 * Two different alerts, and that is the whole point.
 *
 * Netanel: *"Tell me which situation I'm in - lots of ordinary people, or
 * one source behaving strangely. The second one is what should wake me up."*
 *
 * 1. **Single source** - immediate, the moment one identity has passed 60%
 *    of its own cap, i.e. **before** it gets blocked. Once per identity per
 *    day.
 * 2. **A busy day** - at 90% of the ceiling, with a classification: how many
 *    identities were active today and how much of the day the heaviest one
 *    took. That is the distinction between "a good day" and "someone is
 *    sitting on us".
 */
export async function maybeAlert(s: BudgetState, identity: string): Promise<void> {
  const day = today();

  // ---- 1. Single source, immediate ----
  if (s.callerRatio >= CALLER_ALERT_AT && !day.alertedCallers.has(identity)) {
    day.alertedCallers.add(identity);
    const kind = isAnonIdentity(identity) ? 'אנונימי' : 'מחובר';
    void post(
      `טיול+ · מקור בודד (${kind}) הוציא $${s.callerSpent.toFixed(2)} היום - ${Math.round(
        s.callerRatio * 100,
      )}% מהתקרה האישית שלו. הוא ייחסם ב-$${s.callerBudget.toFixed(2)} ולא ישפיע על אחרים. שווה מבט.`,
      { kind: 'single-source', identity: identity.slice(0, 40), usd: s.callerSpent },
    );
  }

  // ---- 2. The day approaching the ceiling ----
  if (s.ratio < ALERT_AT || s.budget <= 0 || day.alerted) return;

  const callers = [...day.callers.entries()].sort((a, b) => b[1] - a[1]);
  const topShare = day.usd > 0 ? (callers[0]?.[1] ?? 0) / day.usd : 0;
  const active = callers.filter(([, v]) => v > 0).length;
  /*
    The classification. One source that took more than a quarter of the day
    is concentration; dozens of identities with small shares are simply a
    busy day - and that is the thing nobody should be woken up for.
  */
  const concentrated = topShare >= 0.25;

  if (persistent()) {
    try {
      const res = await fetch(`${supaUrl()}/rest/v1/rpc/claim_ai_spend_alert`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ p_day: day.day }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok || (await res.json()) !== true) return; // another instance already alerted
    } catch {
      return;
    }
  }
  day.alerted = true;

  void post(
    concentrated
      ? `טיול+ · ${Math.round(s.ratio * 100)}% מהתקרה היומית ($${day.usd.toFixed(2)} מתוך $${s.budget.toFixed(2)}) - **וזה מרוכז**: המקור הכבד ביותר לקח ${Math.round(topShare * 100)}% מהיום, מתוך ${active} זהויות פעילות. כדאי להסתכל.`
      : `טיול+ · ${Math.round(s.ratio * 100)}% מהתקרה היומית ($${day.usd.toFixed(2)} מתוך $${s.budget.toFixed(2)}) - תנועה מפוזרת על ${active} זהויות, הכבד ביותר ${Math.round(topShare * 100)}%. נראה כמו יום עמוס אמיתי.`,
    { kind: concentrated ? 'concentrated' : 'broad', active, topShare, usd: day.usd },
  );
}

/**
 * Sends a **real** test alert to the configured channel, and waits for the
 * answer - that is what turns "probably configured correctly" into "I
 * checked, and it worked". Calls `post` directly and not through
 * `maybeAlert`: no dependency on actually reaching 90%/60%, and no
 * dedup (`alertedCallers`/`day.alerted`) that would block a repeat send -
 * a test needs to work at any moment, not just once a day.
 *
 * Called only from `/api/admin/alert-test`, i.e. only by someone who has
 * already passed the admin permission gate.
 */
export async function sendTestAlert(): Promise<AlertPostResult> {
  return post(
    'טיול+ · 🧪 בדיקת התראה - אם ההודעה הזאת הגיעה, ערוץ ההתראות מחובר ועובד.',
    { kind: 'test' },
  );
}

/** For tests only */
export function resetBudgetForTest(init?: Partial<DayState>): void {
  state = { ...fresh(dayKey()), ...init };
  monthState = freshMonth(monthKey());
  premiumAlerted.clear();
}
