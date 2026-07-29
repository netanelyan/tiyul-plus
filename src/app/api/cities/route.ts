import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { buildCityOptions } from '@/lib/citySearch';

/**
 * דאטת הערים לפי דרישה - הנתיב שמחליף את "להוריד את כל הקטלוג".
 *
 * **למה זה קיים.** מסך הטיול (`TripWorkspace`) מייבא עד היום את
 * `src/data/destinations.ts` כולו: 2MB, 492kB דחוס, כ-60% מכל ה-JS
 * באתר - כדי לצייר טיול שנוגע בעיר אחת עד שש. עכשיו הדפדפן מבקש רק
 * את הערים שבטיול, וזה כ-7kB לעיר.
 *
 * **הספק נשמר (חוק קשיח 4).** הבקשה עוברת דרך `getProvider()`, כך
 * שספק חיצוני שמעשיר את הדאטה ממשיך להעשיר גם כאן - זה בדיוק המקום
 * שבו ההפשטה אמורה לעבוד.
 *
 * שני מצבים:
 *   `?slugs=rome,venice` → היעדים המלאים.
 *   `?options=1`         → רשימת כל הערים לבורר (slug/שם/מדינה/דגל).
 *                          קטנה, ונטענת רק כשפותחים את הבורר.
 *
 * קריאה בלבד על דאטה ציבורית וסטטית, ולכן אין כאן מכסה - אותה החלטה
 * שנרשמה על `/t/<code>` - אבל **יש תקרה על מספר ה-slugs**, כדי
 * שבקשה אחת לא תוכל לבקש את כל הקטלוג ולעקוף את כל הפואנטה.
 */
const MAX_SLUGS = 24;

/** דאטה סטטית לכל deploy: מותר למטמון לשמור אותה בשמחה */
const CACHE = 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get('options') === '1') {
    return NextResponse.json(
      { options: buildCityOptions(destinations, countries) },
      { headers: { 'Cache-Control': CACHE } },
    );
  }

  const slugs = (url.searchParams.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SLUGS);
  if (slugs.length === 0) return NextResponse.json({ cities: [] }, { headers: { 'Cache-Control': CACHE } });

  const provider = getProvider();
  const found = await Promise.all(slugs.map((s) => provider.getDestination(s)));
  return NextResponse.json(
    { cities: found.filter((d) => d !== null) },
    { headers: { 'Cache-Control': CACHE } },
  );
}
