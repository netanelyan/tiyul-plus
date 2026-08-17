import { PLAN_LIMITS } from '@/lib/plans';
import { gte, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { requireRole, denied, ok } from '@/lib/server/admin';
import { adminSelect, countAuthUsers } from '@/lib/server/supabaseAdmin';

/**
 * The status board: what the agent costs, and who is getting stuck.
 *
 * Everything is derived from `usage_daily`, which is already collected for the
 * quotas - there is no new collection here and no new personal data. The
 * identities there are `user:<uuid>` or `ip:<addr>`, so the numbers distinguish
 * signed-in from anonymous without identifying anyone.
 *
 * "Who is near the quota" is the only actionable datum here: it is what shows
 * who will get a blocking message today, before they open a support ticket.
 */
export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

  const rows = await adminSelect<{ identity: string; day: string; units: number }>(
    'usage_daily',
    pgQuery(gte('day', weekAgo), pgSelect(['identity', 'day', 'units']), pgOrder('units', 'desc'), pgLimit(2000)),
  );
  const profiles = await adminSelect<{ plan?: string; plan_until?: string | null; role?: string }>(
    'profiles',
    'select=plan,plan_until,role&limit=5000',
  );
  // **Accounts are counted from auth.users, not from profiles.** A profiles row
  // is created only when someone saves a profile, so the previous count showed
  // "1" when there were several family-member accounts that simply never touched
  // the account area.
  const users = await countAuthUsers();

  /*
    **null is not zero.** A failed read (table doesn't exist, wrong key) used to
    return a zero here that looked exactly like "nobody used it" - and that is
    what the board displayed while calls were actually being made. Now it is
    stated.
  */
  const tracked = rows !== null;
  const todayRows = (rows ?? []).filter((r) => r.day === today);
  const byDay = new Map<string, number>();
  for (const r of rows ?? []) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.units);

  const freeCap = PLAN_LIMITS.free.aiUnitsPerDay;
  const nearCap = todayRows.filter((r) => r.units >= freeCap * 0.8).length;
  const atCap = todayRows.filter((r) => r.units >= freeCap).length;

  return ok({
    tracked,
    today: {
      identities: todayRows.length,
      loggedIn: todayRows.filter((r) => r.identity.startsWith('user:')).length,
      /*
        Anything that is not `user:` is anonymous. The previous count looked for
        `ip:` only, and since the anonymous quota moved to a browser identifier
        (`anon:<id>`) most visitors were counted on neither side - "users today"
        showed zero while there were some.
      */
      anonymous: todayRows.filter((r) => !r.identity.startsWith('user:')).length,
      units: todayRows.reduce((n, r) => n + r.units, 0),
      nearCap,
      atCap,
      top: todayRows.slice(0, 8).map((r) => ({
        kind: r.identity.startsWith('user:') ? 'user' : 'anon',
        units: r.units,
      })),
    },
    week: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, units]) => ({ day, units })),
    accounts: {
      total: users?.total ?? profiles?.length ?? 0,
      capped: users?.capped ?? false,
      /** Of those, saved a profile - the difference is who signed in and never touched the account area */
      withProfile: profiles?.length ?? 0,
      premium: (profiles ?? []).filter(
        (p) => p.plan === 'premium' && (!p.plan_until || Date.parse(p.plan_until) > Date.now()),
      ).length,
      admins: (profiles ?? []).filter((p) => p.role === 'admin' || p.role === 'owner').length,
    },
    freeCap,
  });
}
