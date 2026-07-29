import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { isEating, isKosher, kosherStatusOf } from '@/lib/categories';
import type { Destination } from '@/lib/types';
import type { Trip } from '@/lib/trip/types';
import type { ChatMessage } from '@/lib/server/chatMessages';

/**
 * ה-grounding בנוי בשתי שכבות, כי הקטלוג גדל ל-47 ערים ו-500+ מקומות:
 *
 * 1. INDEX - קבוע וזהה בכל קריאה, ולכן נושא את cache_control: כל עיר עם
 *    כל המקומות שלה ברמת id/שם/קטגוריה/תגיות. זה מה שהמודל חייב כדי
 *    לבנות ולתקף מסלול, ולעולם לא להמציא מזהה.
 * 2. DETAIL - רק לערים הרלוונטיות לתור הנוכחי (הערים שבטיול + ערים
 *    שהוזכרו בשיחה): תיאורי מקומות, מסלול אוצר, מידע פרקטי ומידע
 *    המדינה. הבלוק הזה קטן ומשתנה, ולכן יושב אחרי נקודת השבירה של
 *    המטמון.
 *
 * לפני הפיצול נשלחו ~118k טוקנים בכל קריאה - ובבניית טיול יש 5 קריאות
 * רצופות, כך שזה היה גורם הזמן הדומיננטי.
 *
 * **הקובץ הזה יושב ב-lib ולא בתוך ה-route** משתי סיבות: route handler
 * לא יכול לייצא עוזרים (Next נופל על טיפוסי הנתיב), ובלי ייצוא אי אפשר
 * לכתוב טסט - וזה בדיוק מה שקרה ל-sanitizeMessages בעבר.
 */

/**
 * שער הכשרות.
 *
 * "כשרות היא אופציה, לעולם לא הנחה" הוא עיקרון מוצר, אבל עד היום הוא
 * נאכף רק על **הכלים** (`filterKosherUnlessOptedIn` ב-agent.ts) - כלומר
 * על מה שנכנס לטיול. הפרוזה נשארה חשופה, ונתנאל דיווח על בדיוק זה:
 * שאלה תמימה על מסעדה ברומא חזרה כתשובה שלמה על הגטו היהודי, עם שני
 * שמות שהם בדיוק שתי הרשומות הכשרות של רומא בקטלוג.
 *
 * שלושה סבבי ניסוח בפרומפט כבר נכשלו בסוג הזה של בעיה (ראו יומן הסשן,
 * ערך (h)), והשיעור שנרשם שם הוא: **לא לכתוב את הכלל חזק יותר - להזיז
 * אותו קרוב יותר לרגע הייצור, או להחליף אותו בעובדה מחושבת.** לכן זה
 * לא כלל נוסף אלא מבנה: כשהכשרות כבויה, הרשומות הכשרות פשוט לא נמצאות
 * בדאטה שהמודל מקבל. אי אפשר להמליץ על מה שלא ראית.
 */
const KOSHER_ASK =
  /כשר(ו|י|ה|ות)?|מהדרין|גלאט|בד["״'׳]?ץ|הכשר|השגחה|חב["״'׳]?ד|בית חב|kosher|chabad|glatt|hechsher/i;

export function kosherAllowed(
  trip: Trip | null,
  messages: ChatMessage[],
  kosherHint = false,
): boolean {
  if (kosherHint) return true;
  if (trip?.preferences?.kosher === true) return true;
  if (trip?.preferences?.shabbatAware === true) return true;
  // **רק הודעות המשתמש.** אם היינו סורקים גם את תשובות הסוכן, די היה
  // בכך שהוא הזכיר כשרות פעם אחת כדי שהשער יישאר פתוח לנצח - כלומר
  // המנגנון היה מאשר לעצמו את מה שהוא בדיוק בא למנוע.
  const text = messages
    .filter((m) => m.role === 'user')
    .slice(-6)
    .map((m) => m.content)
    .join(' ');
  return KOSHER_ASK.test(text);
}

/** אינדקס גדול (~218k תווים) - נבנה פעם אחת לכל וריאנט ולא בכל קריאת מודל */
const INDEX_CACHE = new Map<boolean, string>();

export function buildGroundingIndex(kosherOk: boolean): string {
  const cached = INDEX_CACHE.get(kosherOk);
  if (cached) return cached;
  const json = JSON.stringify({
    note: kosherOk
      ? 'INDEX of every city and place. Use these ids verbatim. Detail for the relevant cities follows in the next block.'
      : 'INDEX of every city and place. Use these ids verbatim. Detail for the relevant cities follows in the next block. Kosher venues are deliberately not listed here - see the kosher policy in the next block.',
    // המספרים האמיתיים, כי המודל המציא אותם בבדיקה חיה ("50 יעדים ב-40
    // מדינות" כשבפועל היו 139 ו-74). הוא סופר גרוע על רשימה ארוכה, ואין
    // סיבה לתת לו לנחש נתון שאפשר פשוט למסור לו.
    coverage: { cities: destinations.length, countries: countries.length },
    cities: destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      countrySlug: d.countrySlug,
      places: d.places
        .filter((p) => kosherOk || !isKosher(p.category))
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          ...(p.tags?.length ? { tags: p.tags } : {}),
          ...(p.priceLevel !== undefined ? { priceLevel: p.priceLevel } : {}),
          ...(p.mustSee ? { mustSee: true } : {}),
          ...(p.durationMin ? { durationMin: p.durationMin } : {}),
        })),
    })),
    countries: countries.map((c) => ({ slug: c.slug, name: c.name })),
  });
  INDEX_CACHE.set(kosherOk, json);
  return json;
}

/** ערים שהשיחה נוגעת בהן: הטיול הפעיל + אזכור בשם עיר/מדינה/שם מקומי */
export function relevantCitySlugs(messages: ChatMessage[], trip: Trip | null): string[] {
  const slugs = new Set<string>(trip?.citySlugs ?? []);
  const text = messages
    .slice(-6)
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
  for (const d of destinations) {
    const country = countries.find((c) => c.slug === d.countrySlug);
    const needles = [d.name, d.nameLocal, d.slug, country?.name].filter(Boolean) as string[];
    if (needles.some((n) => text.includes(n.toLowerCase()))) slugs.add(d.slug);
  }
  // בלי שום רמז - נותנים פירוט על מדגם קטן כדי שהתשובה הראשונה לא תהיה עקרה
  if (slugs.size === 0) return destinations.slice(0, 6).map((d) => d.slug);

  // תקרה קשיחה על מספר הערים בבלוק הפירוט.
  //
  // בלי התקרה הזאת הבלוק היה חסר גבול, וזה הכשיל שיחות אמיתיות: הסריקה
  // מוסיפה כל יעד ששמו, שמו הלטיני, ה-slug **או שם המדינה שלו** מופיע
  // בשש ההודעות האחרונות - וההודעות של הסוכן עצמו מזכירות הרבה שמות
  // ערים ומדינות. מדידה על הקטלוג האמיתי: כ-6,500 תווים לעיר, 45% מהם
  // עברית, כלומר בערך 3,800 טוקנים לעיר. 20 ערים = ~65k טוקנים,
  // 40 ערים = ~120k, וכל הקטלוג (139 יעדים) = ~370k טוקנים בבלוק אחד.
  // ביחד עם האינדקס וההיסטוריה זה חרג מחלון ההקשר של 200k.
  //
  // הבעיה גם גדלה עם השיחה **ועם הקטלוג**: כל יעד חדש שנוסף מרחיב את
  // מרחב ההתאמות. לכן תקרה, ולא רק אופטימיזציה.
  //
  // סדר העדיפויות: הערים של הטיול עצמו קודם - הן ההקשר שאי אפשר לוותר
  // עליו - ואחר כן מה שהוזכר בשיחה, עד התקרה. מה שנחתך עדיין נמצא
  // באינדקס עם כל המזהים והשמות, כך שהמודל יכול לבנות איתו; הוא רק לא
  // מקבל את הפרוזה.
  const MAX_DETAIL_CITIES = 6;
  const tripFirst = (trip?.citySlugs ?? []).filter((s) => slugs.has(s));
  const rest = [...slugs].filter((s) => !tripFirst.includes(s));
  return [...tripFirst, ...rest].slice(0, MAX_DETAIL_CITIES);
}

/** בלוק grounding נפרד ליעדים שנחקרו - מסומן חד-משמעית כלא-מאומת */
export function buildExploredGrounding(explored: Destination[]): string {
  if (explored.length === 0) return '';
  return `\n\nAUTO-EXPLORED (unverified, from public sources - label as such to the user):\n${JSON.stringify(
    explored.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary.slice(0, 200),
      places: d.places.map((p) => ({ id: p.id, name: p.name, category: p.category })),
    })),
  )}`;
}

/**
 * מדיניות הכשרות נמסרת כ**עובדה בתוך הדאטה** ולא ככלל בפרומפט, ומנוסחת
 * כך שהמודל לא יתקן שקר אחד בשקר אחר: אסור לו להמליץ, וגם אסור לו לומר
 * שאין כשרות בעיר - הוא פשוט לא קיבל את השכבה הזאת.
 */
const KOSHER_POLICY_OFF =
  'The traveler has NOT asked for kosher and the kosher preference is OFF, so every kosher restaurant, kosher market and kashrut overview is intentionally omitted from this data. Do not mention, recommend or hint at kosher options in your reply. Do NOT say the city has no kosher food - you were simply not given that layer; if the user asks, say the site has a kosher layer and they can switch on "אוכל כשר" (or just ask), and then you will have it.';

/**
 * הצד השני של אותו שער, ולא פחות חשוב ממנו.
 *
 * מאז שנוספו קטגוריות `food`/`market` יש בקטלוג מקומות אכילה **לא**
 * כשרים (קפה סנטרל, כץ׳ס, לה דה מגו). שכבת הכלים כבר חוסמת אותם ממי
 * שבחר כשרות - אבל הפרוזה, שוב, לא. הפתרון כאן הוא מסירת העובדה
 * המחושבת (`kosherStatus` על כל מקום אכילה) ולא הסתרה: מטייל שומר
 * כשרות שיקרא "כץ׳ס הוא מוסד ניו-יורקי, ואינו כשר" קיבל בדיוק את מה
 * שהוא צריך; מחיקת הרשומה הייתה משאירה אותו בלי האזהרה.
 */
const KOSHER_POLICY_ON =
  'The traveler keeps kosher. Every eating place carries kosherStatus. Recommend ONLY kosherStatus="kosher". A place marked "not-kosher" or "unknown" may be mentioned only to say plainly that it is not kosher (or that we could not confirm it) - never as a suggestion of where to eat, and never in the plan. "unknown" is not "probably fine". Always add the usual reminder to confirm kashrut and hours with the venue itself.';

export function buildGroundingDetail(citySlugs: string[], kosherOk: boolean): string {
  const cities = destinations.filter((d) => citySlugs.includes(d.slug));
  const countrySlugs = new Set(cities.map((d) => d.countrySlug));
  const kosherIds = new Set(
    cities.flatMap((d) => d.places.filter((p) => isKosher(p.category)).map((p) => p.id)),
  );
  return JSON.stringify({
    note: 'DETAIL for the cities this conversation touches. Other cities: use the INDEX above, and say plainly if you need specifics we did not load.',
    kosherPolicy: kosherOk ? KOSHER_POLICY_ON : KOSHER_POLICY_OFF,
    countries: countries
      .filter((c) => countrySlugs.has(c.slug))
      .map((c) => ({ slug: c.slug, name: c.name, summary: c.summary, practical: c.practical })),
    cities: cities.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary,
      // טיסות, תחבורה, כשרות - ברמת עיר. `kosherOverview` הוא סקירת
      // הכשרות של העיר, ולכן הוא יורד יחד עם הרשומות עצמן; שאר השדות
      // אינם קשורים ונשארים.
      // (JSON.stringify משמיט undefined, כך שהשדה פשוט לא נשלח)
      practical: kosherOk ? d.practical : { ...d.practical, kosherOverview: undefined },
      // מסלול האוצר מפנה למזהי מקומות; בלי הסינון הזה מזהה כשר היה
      // מגיע למודל דרך הדלת האחורית של המסלול.
      itinerary: kosherOk
        ? d.itinerary
        : d.itinerary.map((day) => ({
            ...day,
            placeIds: day.placeIds.filter((id) => !kosherIds.has(id)),
          })),
      places: d.places
        .filter((p) => kosherOk || !isKosher(p.category))
        .map((p) => ({
          id: p.id,
          name: p.name,
          nameLocal: p.nameLocal,
          category: p.category,
          description: p.description.length > 90 ? `${p.description.slice(0, 90)}…` : p.description,
          // עובדה מחושבת ולא ניחוש של המודל לפי השם. נשלחת רק כשהכשרות
          // דלוקה, כי כשהיא כבויה אין לה מה לעשות בתשובה בכלל.
          ...(kosherOk && isEating(p.category)
            ? { kosherStatus: kosherStatusOf(p) }
            : {}),
          // `kosherNote` על מקום **לא** כשר הוא בדרך כלל אזהרה ("המסעדה
          // המפורסמת הזאת אינה כשרה") - הסתרתה הייתה מזיקה, לא זהירה.
          kosherNote: p.kosherNote,
        })),
    })),
  });
}
