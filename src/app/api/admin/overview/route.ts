import { requireRole, denied, ok } from '@/lib/server/admin';
import { adminSelect, countAuthUsers } from '@/lib/server/supabaseAdmin';
import { gte, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { aggregate, summarize, type TripRow } from '@/lib/server/tripStats';
import { budgetOverview } from '@/lib/server/budget';

/**
 * התצוגה המצטברת - **המסך הראשי, ובכוונה בלי אף אדם בתוכו**.
 *
 * נתנאל: *"התצוגה הראשית היא מצטברת, לא אישית."* לכן שום שדה כאן לא
 * מזהה מישהו: אין מיילים, אין שמות, אין מזהי טיולים. גם "מטיילים
 * פעילים" הוא ספירה של מזהים ייחודיים ולא רשימה שלהם.
 *
 * **מה הלוח לא רואה, ונאמר במפורש בממשק:** טיולים של מבקרים שלא
 * נרשמו. הם חיים ב-localStorage ולא מסונכרנים לשרת - וזו התוצאה
 * הישירה של לא לעקוב אחרי מי שלא נרשם.
 */

/** תקרת שורות. מוצגת בממשק כשהיא נוגעת - חיתוך שקט קורא כמו "זה הכול". */
const MAX_ROWS = 5000;
const WINDOW_DAYS = 30;

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  const since = new Date(Date.now() - (WINDOW_DAYS - 1) * 86_400_000).toISOString();
  const sinceDay = since.slice(0, 10);

  const [tripRows, shares, events, users, budget] = await Promise.all([
    adminSelect<TripRow>(
      'user_trips',
      pgQuery(pgSelect(['user_id', 'id', 'updated_at', 'data']), pgOrder('updated_at', 'desc'), pgLimit(MAX_ROWS)),
    ),
    adminSelect<{ created_at: string }>(
      'shared_trips',
      pgQuery(gte('created_at', since), pgSelect(['created_at']), pgLimit(MAX_ROWS)),
    ),
    adminSelect<{ day: string; kind: string; count: number }>(
      'app_events',
      pgQuery(gte('day', sinceDay), pgSelect(['day', 'kind', 'count']), pgLimit(1000)),
    ),
    countAuthUsers(),
    budgetOverview(),
  ]);

  const summaries = (tripRows ?? []).map(summarize).filter((t): t is NonNullable<typeof t> => t !== null);
  const stats = aggregate(summaries, WINDOW_DAYS);

  const sharesPerDay = new Map<string, number>();
  for (const s of shares ?? []) {
    const d = s.created_at.slice(0, 10);
    sharesPerDay.set(d, (sharesPerDay.get(d) ?? 0) + 1);
  }

  const exportsByKind = new Map<string, number>();
  for (const e of events ?? []) {
    exportsByKind.set(e.kind, (exportsByKind.get(e.kind) ?? 0) + e.count);
  }

  return ok({
    windowDays: WINDOW_DAYS,
    trips: {
      total: stats.trips,
      travelers: stats.travelers,
      withStops: stats.withStops,
      medianDays: stats.medianDays,
      medianStops: stats.medianStops,
      perDay: stats.perDay,
      truncated: (tripRows?.length ?? 0) >= MAX_ROWS,
    },
    places: { cities: stats.topCities, countries: stats.topCountries },
    sharing: {
      shares: shares?.length ?? 0,
      perDay: stats.perDay.map((d) => ({ day: d.day, shares: sharesPerDay.get(d.day) ?? 0 })),
      exports: [...exportsByKind.entries()].map(([kind, count]) => ({ kind, count })),
      /** null = הטבלה לא קיימת עדיין (ה-SQL לא רץ). לא אפס. */
      exportsTracked: events !== null,
    },
    accounts: { total: users?.total ?? 0, capped: users?.capped ?? false },
    ai: budget,
    /** בלי זה המספרים נקראים כאילו הם כל העולם, והם לא */
    scope: 'טיולים של משתמשים מחוברים בלבד - טיול של מבקר שלא נרשם נשמר במכשיר שלו ולא אצלנו',
  });
}
