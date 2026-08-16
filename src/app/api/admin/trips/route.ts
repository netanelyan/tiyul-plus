import { requireRole, denied, badRequest, ok, audit } from '@/lib/server/admin';
import { adminSelect, emailByUserId, emailsByUserIds, userByEmail } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgOrder, pgQuery, pgSelect } from '@/lib/server/pgrest';
import { checkLimit } from '@/lib/server/limits';
import { nameMatches, parseAdminQuery } from '@/lib/server/adminSearch';
import { summarize, tripView, type TripRow, type TripSummary } from '@/lib/server/tripStats';

/**
 * החיפוש הצר, והצפייה בטיול בודד.
 *
 * ## שלושה כללים שמחזיקים את הנתיב הזה
 *
 * 1. **הרשאה נבדקת בשרת, בכל בקשה.** `requireRole` קורא את התפקיד
 *    מהדאטהבייס לפי הטוקן. מי שאינו אדמין מקבל 404 - אותה תשובה
 *    בדיוק שמקבל מי שלא מחובר, כדי שלא יילמד שהאזור קיים.
 * 2. **המחרוזת של המשתמש לא נכנסת לשאילתה.** ראו `adminSearch.ts`:
 *    מייל הופך ל-uuid מ-GoTrue, יעד הופך ל-slug מרשימה סגורה, ושם
 *    טיול לא עוזב את הזיכרון בכלל.
 * 3. **קריאה בלבד.** אין כאן POST, PATCH או DELETE. עריכה או מחיקה
 *    של טיול של מישהו אחר לא קיימות בקוד, ולא רק "חסומות".
 *
 * ## מה נרשם ביומן
 *
 * **פתיחת טיול בודד** - כלומר הרגע שבו אדמין רואה תוכן של אדם מסוים.
 * חיפוש שמחזיר רשימה אינו נרשם: הוא מחזיר שמות טיולים בלי תוכן, ויומן
 * שמתמלא ברעש הוא יומן שאף אחד לא קורא.
 */

const MAX_ROWS = 5000;
const MAX_RESULTS = 40;

/** שורות + הסיכומים שלהן, פעם אחת לבקשה */
async function loadTrips(filter?: string): Promise<TripSummary[]> {
  const rows = await adminSelect<TripRow>(
    'user_trips',
    pgQuery(
      ...(filter ? [filter] : []),
      pgSelect(['user_id', 'id', 'updated_at', 'data']),
      pgOrder('updated_at', 'desc'),
      pgLimit(MAX_ROWS),
    ),
  );
  return (rows ?? []).map(summarize).filter((t): t is TripSummary => t !== null);
}

export async function GET(req: Request) {
  const actor = await requireRole(req, 'admin');
  if (!actor) return denied();

  /*
    מכסה גם לאדמין. לא מחוסר אמון אלא כי חשבון אדמין שנפרץ הוא בדיוק
    התרחיש שבו מישהו ירצה לסרוק את כל המיילים בלולאה.
  */
  const limit = checkLimit('admin-search', actor.userId, 60, 60_000);
  if (!limit.ok) return badRequest('rate_limited');

  const url = new URL(req.url);
  const tripId = url.searchParams.get('id');
  const userId = url.searchParams.get('user');

  /* ---------- צפייה בטיול בודד ---------- */
  if (tripId && userId) {
    /*
      שתי השורות האלה הן ההגנה: `eq` מקודד את הערכים, ו-`pgUuid`
      בתוך `emailByUserId` דוחה כל דבר שאינו uuid. מזהה טיול שאינו
      קיים פשוט לא מחזיר שורה.
    */
    const rows = await adminSelect<TripRow>(
      'user_trips',
      pgQuery(eq('user_id', userId), eq('id', tripId), pgSelect(['user_id', 'id', 'updated_at', 'data']), pgLimit(1)),
    );
    const row = rows?.[0];
    if (!row) return ok({ trip: null });

    const email = await emailByUserId(row.user_id);
    /*
      **היומן נכתב לפני שמחזירים את התוכן.** נתנאל: "אם יש לי את
      הכוח הזה, אני רוצה תיעוד של השימוש בו."
    */
    await audit(actor, 'view_trip', { userId: row.user_id, email }, { tripId: row.id });

    /*
      מוחזרת **תצוגה** ולא השורה הגולמית: השמות מפוענחים כאן מהקטלוג,
      כך שהדפדפן לא גורר 2MB כדי להציג "קתדרלת סנט סטפן" במקום
      `vie-stephansdom` - אותו שיקול כמו בדף הטיול המשותף.
    */
    return ok({
      id: row.id,
      view: tripView(row.data),
      owner: { userId: row.user_id, email },
      updatedAt: row.updated_at,
    });
  }

  /* ---------- חיפוש ---------- */
  const parsed = parseAdminQuery(url.searchParams.get('q'), url.searchParams.get('mode'));
  if (parsed.kind === 'invalid') return ok({ results: [], note: parsed.why });

  let found: TripSummary[] = [];
  let label = '';

  if (parsed.kind === 'email') {
    // התאמה מדויקת בלבד, ואז שאילתה לפי uuid - לא לפי מה שהוקלד
    const user = await userByEmail(parsed.email);
    if (!user) return ok({ results: [], note: 'אין חשבון עם הכתובת הזאת' });
    found = await loadTrips(eq('user_id', user.id));
    label = user.email;
  } else if (parsed.kind === 'place') {
    const slugs = new Set(parsed.slugs);
    found = (await loadTrips()).filter((t) => t.citySlugs.some((s) => slugs.has(s)));
    label = parsed.label;
  } else {
    // שם טיול: הסינון כאן, בזיכרון. שום דבר מזה לא הגיע לדאטהבייס.
    found = (await loadTrips()).filter((t) => nameMatches(t.name, parsed.needle));
    label = parsed.needle;
  }

  const page = found.slice(0, MAX_RESULTS);
  // המייל נשלף רק לתוצאות שמוצגות בפועל, ולא לכל מי שנסרק - ובמקביל,
  // לא בלולאת await טורית (דפוס ה-N+1 שהוסר מכל נתיבי האדמין)
  const emails = await emailsByUserIds(page.map((t) => t.userId));

  return ok({
    label,
    total: found.length,
    truncated: found.length > MAX_RESULTS,
    results: page.map((t) => ({
      userId: t.userId,
      id: t.id,
      name: t.name,
      email: emails.get(t.userId) ?? null,
      days: t.days,
      stops: t.stops,
      cities: t.citySlugs,
      updatedAt: t.updatedAt,
    })),
  });
}
