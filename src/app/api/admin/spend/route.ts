import { requireRole, denied, ok } from '@/lib/server/admin';
import { adminSelect } from '@/lib/server/supabaseAdmin';
import { gte, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { ALERT_AT, budgetState } from '@/lib/server/budget';
import { MODEL_PRICES } from '@/lib/server/aiCost';

/**
 * מה ה-AI עולה, בכסף.
 *
 * נתנאל ניסח את הצורך במדויק: *"אני צריך לדעת כמה טיול רגיל באמת עולה
 * לפני שאני קובע מגבלות אמיתיות, וכרגע אני מנחש."* לכן הנתון המרכזי
 * כאן הוא **עלות לטיול** ולא סכום יומי - סכום יומי אומר כמה שילמנו,
 * עלות לטיול אומרת כמה עולה מטייל.
 *
 * הכול נגזר מ-`ai_spend`, שנכתב ממילא בכל קריאת מודל. אין כאן איסוף
 * חדש ואין טקסט של משתמשים - מזהים, טוקנים ומספרים.
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

/** סכום + ספירה לפי מפתח, ממוין מהיקר לזול */
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

  const state = await budgetState();
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

  const trips = group(todayRows, (r) => r.trip_id);
  const allTrips = group(rows, (r) => r.trip_id);
  // חציון ולא ממוצע: טיול חריג אחד מזיז ממוצע, והשאלה כאן היא מה
  // המחיר של מטייל **טיפוסי**.
  const median = (xs: number[]) =>
    xs.length === 0 ? 0 : [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

  return ok({
    budget: {
      limit: state.budget,
      spent: state.spent,
      ratio: state.ratio,
      exceeded: state.exceeded,
      alertAt: ALERT_AT,
      /** מאיפה התקרה הגיעה - כדי שיהיה ברור מה לשנות */
      source: state.budget === Number(process.env.AI_DAILY_BUDGET_USD) ? 'env' : 'flag',
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
    /** מטייל טיפוסי - הנתון שנתנאל ביקש כדי להפסיק לנחש */
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
    /** בלי הטבלאות אין היסטוריה - נאמר במפורש ולא מוצג כאפס */
    stored: rows.length > 0 || null,
  });
}
