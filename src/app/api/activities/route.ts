import { activitiesForCity } from '@/lib/server/viator';
import { browserGetOk } from '@/lib/server/chatGuards';
import { checkLimit } from '@/lib/server/limits';
import { resolveCaller } from '@/lib/server/identity';

/**
 * פעילויות להזמנה בעיר של הטיול, בשאילתה חיה מול Viator.
 *
 * **הנתיב הזה קיים כדי שהמפתח יישאר בשרת.** הדפדפן מקבל רק את מה שכבר
 * מסונן ומוכן להצגה, וכתובת ההזמנה מגיעה בנויה - כלומר גם מזהה השותף
 * שלנו נבנה כאן ולא שם.
 *
 * שלוש הגנות, כולן זולות:
 * 1. **מקור הבקשה** - `browserGetOk`, ולא `sameOriginOk`: ב-GET מאותו
 *    מקור דפדפן **לא** שולח `Origin`, אז הבדיקה של הצ׳אט הייתה דוחה כאן
 *    כל בקשה אמיתית. הסימן שכן קיים ב-GET הוא `Sec-Fetch-Site`.
 * 2. **מכסה לפי קורא**, מעל מד הקצב היוצא שב-`viator.ts`. המכסה נגזרת
 *    מהשכבה של הקורא כמו בכל נתיב אחר, כך שאי אפשר להשתמש בזה כדי
 *    להריץ בקשות על החשבון שלנו.
 * 3. **כישלון שקט** - כל מצב שאינו הצלחה מחזיר 200 עם רשימה ריקה וסיבה.
 *    מסך הטיול לא אמור לדעת ש-Viator קיימת, ובטח לא להציג שגיאה.
 */

const SLUG = /^[a-z0-9-]{1,60}$/;

const empty = (reason: string) =>
  new Response(JSON.stringify({ mode: 'off', offers: [], reason }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function GET(req: Request) {
  if (!browserGetOk(req)) return empty('origin');

  const city = new URL(req.url).searchParams.get('city') ?? '';
  if (!SLUG.test(city)) return empty('bad-city');

  const caller = await resolveCaller(req);
  /*
    תקרה יומית קבועה, **לא נגזרת מ-`exploresPerDay`**. עד שפרימיום עבר
    לחלון חודשי (`periodMsFor`) הגזירה הזאת הייתה סבירה; עכשיו
    `exploresPerDay` של פרימיום הוא מספר חודשי, וכפל אותו ב-3 והפעלתו
    כתקרה **יומית** היה נותן ~450/יום - בטעות, לא בכוונה. הנתיב הזה
    לא עולה לנו כלום (Viator, בלי קריאת AI), אז אין סיבה כלכלית
    לתקרה מורכבת - נדיבה וקבועה לכולם, קצת יותר לפרימיום.
  */
  const perDay = caller.plan === 'premium' ? 120 : 60;
  if (!checkLimit('activities', caller.id, perDay, 24 * 60 * 60_000).ok) return empty('quota');
  if (!checkLimit('activities-burst', caller.id, 10, 60_000).ok) return empty('quota');

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const result = await activitiesForCity(city, host);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // המטמון שלנו בזיכרון בלבד. שום דבר מ-Viator לא נשמר בדיסק או ב-CDN.
      'Cache-Control': 'no-store',
    },
  });
}
