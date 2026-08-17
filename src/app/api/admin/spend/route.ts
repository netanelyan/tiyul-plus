import { requireRole, denied, ok } from '@/lib/server/admin';
import { adminSelect, emailsByUserIds } from '@/lib/server/supabaseAdmin';
import { gte, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import {
  ALERT_AT,
  CALLER_CAP_USD,
  anonShare,
  budgetOverview,
  premiumSpendOverview,
} from '@/lib/server/budget';
import { MODEL_PRICES } from '@/lib/server/aiCost';

/**
 * What the AI costs, in money.
 *
 * Netanel put the need precisely: *"I need to know what a normal trip actually costs
 * before I set any real limits, and right now I'm guessing."* So the central figure
 * here is **cost per trip** and not a daily total - a daily total says how much we
 * paid, cost per trip says how much a traveller costs.
 *
 * Everything is derived from `ai_spend`, which is written on every model call anyway.
 * There is no new collection here and no user text - identifiers, tokens and numbers.
 */

interface Row {
  day: string;
  identity: string;
  user_id: string | null;
  trip_id: string | null;
  route: string;
  model: string;
  usd: number | string;
  out_tokens: number;
}

const num = (v: number | string) => (typeof v === 'number' ? v : Number(v) || 0);

/** Sum + count by key, sorted from most to least expensive */
function group(rows: Row[], key: (r: Row) => string | null) {
  const m = new Map<string, { usd: number; requests: number }>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    const e = m.get(k) ?? { usd: 0, requests: 0 };
    e.usd += num(r.usd);
    e.requests += 1;
    m.set(k, e);
  }
  return [...m.entries()]
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.usd - a.usd);
}

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const state = await budgetOverview();
  const share = await anonShare();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);

  const rows =
    (await adminSelect<Row>(
      'ai_spend',
      pgQuery(
        gte('day', weekAgo),
        pgSelect(['day', 'identity', 'user_id', 'trip_id', 'route', 'model', 'usd', 'out_tokens']),
        pgOrder('id', 'desc'),
        pgLimit(20_000),
      ),
    )) ?? [];

  const todayRows = rows.filter((r) => r.day === today);
  const byDay = group(rows, (r) => r.day).sort((a, b) => a.key.localeCompare(b.key));

  /*
    The subscribers' real money - **here and only here, for Netanel**. No user-facing
    surface sees dollars; a subscriber sees counts (trips, chats). The email is fetched
    only for the rows actually displayed, not for everyone scanned - the same rule as in
    /api/admin/trips.
  */
  const premium = await premiumSpendOverview(10);
  // In parallel and not in a serial await loop - the same N+1 fix as in the other admin routes
  const premiumEmails = await emailsByUserIds(premium.top.map((t) => t.userId));
  const premiumTop = premium.top.map((t) => ({ ...t, email: premiumEmails.get(t.userId) ?? null }));

  const trips = group(todayRows, (r) => r.trip_id);
  const allTrips = group(rows, (r) => r.trip_id);
  // A median and not a mean: one outlier trip moves a mean, and the question here is
  // what a **typical** traveller costs.
  const median = (xs: number[]) =>
    xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

  return ok({
    budget: {
      limit: state.budget,
      spent: state.spent,
      ratio: state.ratio,
      exceeded: state.ratio >= 1,
      alertAt: ALERT_AT,
      /** The two wallets - what stops an anonymous visitor switching the agent off for signed-in users */
      anonSpent: state.anonSpent,
      anonLimit: state.budget * share,
      userSpent: state.userSpent,
      userLimit: state.budget - state.anonSpent,
      callerLimit: Math.min(CALLER_CAP_USD, state.budget),
      /** No shared total - the ceiling locks until it comes back */
      stale: state.stale,
      /** Where the ceiling came from - so it is clear what to change */
      source: state.budget === Number(process.env.AI_DAILY_BUDGET_USD) ? 'env' : 'flag',
      /** Anonymous traffic's share - the field that makes this tunable from /admin */
      anonShare: share,
    },
    today: {
      usd: todayRows.reduce((n, r) => n + num(r.usd), 0),
      requests: todayRows.length,
      chat: todayRows.filter((r) => r.route === 'chat').length,
      anonymous: todayRows.filter((r) => r.identity.startsWith('ip:')).length,
      loggedIn: todayRows.filter((r) => r.identity.startsWith('user:')).length,
      trips: trips.length,
    },
    days: byDay.map((d) => ({ day: d.key, usd: d.usd, requests: d.requests })),
    /** A typical traveller - the figure Netanel asked for so he could stop guessing */
    perTrip: {
      median: median(allTrips.map((t) => t.usd)),
      max: allTrips[0]?.usd ?? 0,
      counted: allTrips.length,
    },
    topUsers: group(rows, (r) => r.identity)
      .slice(0, 10)
      .map((u) => ({
        kind: u.key.startsWith('user:') ? 'user' : 'anon',
        usd: u.usd,
        requests: u.requests,
      })),
    topTrips: allTrips.slice(0, 10).map((t) => ({ usd: t.usd, requests: t.requests })),
    models: group(rows, (r) => r.model).map((m) => ({ model: m.key, usd: m.usd, requests: m.requests })),
    prices: MODEL_PRICES,
    /** The subscribers' separate wallet: the month's total + a breakdown per subscriber */
    premium: { ...premium, top: premiumTop },
    /** Without the tables there is no history - said explicitly rather than shown as a zero */
    stored: rows.length > 0 || null,
  });
}
