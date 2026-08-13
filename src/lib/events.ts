import { clientIdHeader, hasClientId } from '@/lib/clientId';

/**
 * דיווח על פעולה שקורית בדפדפן בלבד (הדפסה, שיתוף, ניווט - ועכשיו גם
 * אירועי הצמיחה: יצירת טיול, פתיחת שיתוף, ביקור חוזר).
 *
 * **מונה, לא מעקב.** נשלח רק סוג הפעולה - בלי מזהה טיול, בלי תוכן
 * ובלי חשבון. השרת סופר יום ומספר, וזה כל מה שנשמר. אין עוגיות, אין
 * צד שלישי, ושום מזהה לא עוזב את הדפדפן מעבר למה שכבר נשלח ממילא.
 *
 * לא נכשל ולא מעכב: אם הבקשה נופלת, ההדפסה קורית בכל מקרה.
 */
/**
 * `pdf` קיים בסכימה ואינו נשלח היום: הדפסה ו-PDF הם אותו כפתור ואותו
 * דיאלוג דפדפן, ואי אפשר לדעת מהדף מה נבחר בו. מוטב שדה שלא מגיע על
 * פני מספר שנראה אמיתי ואינו.
 *
 * `newsletter` הוא חריג בכוונה: הוא נספר **בשרת בלבד** (נתיב ההרשמה
 * יודע להבדיל כתובת חדשה מכפולה, והדפדפן לא), ולכן נתיב /api/events
 * דוחה אותו מלקוחות - אחרת אפשר היה לנפח אותו בלולאה.
 */
export type AppEvent =
  | 'print'
  | 'pdf'
  | 'whatsapp'
  | 'share'
  | 'maps'
  | 'trip_created'
  | 'shared_open'
  | 'shared_adopt'
  | 'return_visit';

/**
 * ---------- "רק אירועים אמיתיים" ----------
 *
 * דרישה מפורשת של נתנאל: טיול שהוא יוצר תוך בדיקה, או אדמין שפותח
 * שיתוף של מישהו, אסור שינפחו את המונים. שני מנגנונים, שניהם זולים:
 *
 * 1. **דגל דפדפן פנימי** - ברגע ש-/admin נטען בהצלחה (כלומר הדפדפן
 *    הזה שייך לאדמין מאומת), נקבע דגל מקומי וכל האירועים מהדפדפן הזה
 *    מושתקים מכאן והלאה - כולל מוני הייצוא הקיימים. מי שבודק את האתר
 *    הוא לא מבקר.
 * 2. **localhost מושתק תמיד** - פיתוח מקומי מול env אמיתי לא מלכלך
 *    את המונים של הייצור.
 *
 * הגבול הכן: הדגל הוא לפי דפדפן. אדמין בחלון גלישה בסתר (או במכשיר
 * שמעולם לא פתח בו את /admin) ייספר כמו כל מבקר. זה עדיין הרבה יותר
 * טוב מכלום, ומי שבודק בכוונה יודע לפתוח /admin קודם.
 */
const INTERNAL_KEY = 'tiyul-plus:internal';

/** נקרא מ-AdminClient אחרי ש-/api/admin/me אישר שזה אדמין אמיתי */
export function markInternalBrowser(): void {
  try {
    localStorage.setItem(INTERNAL_KEY, '1');
  } catch {
    /* אחסון חסום - אין דגל, האדמין ייספר; עדיף מהתרסקות */
  }
}

function suppressed(): boolean {
  try {
    if (localStorage.getItem(INTERNAL_KEY) === '1') return true;
  } catch {
    /* אחסון חסום - ממשיכים לבדיקת ה-host */
  }
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export function trackEvent(kind: AppEvent): void {
  if (typeof window === 'undefined') return;
  try {
    if (suppressed()) return;
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...clientIdHeader() },
      body: JSON.stringify({ kind }),
      keepalive: true, // שורד ניווט/הדפסה שמתחילים מיד אחרי
    }).catch(() => {});
  } catch {
    /* מונה שנכשל הוא לא אירוע */
  }
}

/** תאריך מקומי (לא UTC): "יום אחר" במשמעות האנושית של המבקר */
export function localDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ---------- בעלות על קישורי שיתוף ----------
 *
 * "פתיחות של קישור משותף" לא אמורות לספור את הבעלים שפותח את הקישור
 * של עצמו. מטען השיתוף לא נושא מזהה בעלים (בכוונה - הוא רק הטיול),
 * אז הזיהוי נעשה בצד שיצר: כשדפדפן מייצר קישור שיתוף, הטוקן שלו
 * נשמר מקומית, וכשאותו דפדפן פותח /t/<token> - הוא לא נספר. בעלים
 * שפותח את הקישור שלו ממכשיר אחר ייספר; אין דרך לדעת, וזה נאמר.
 */
const MY_SHARES_KEY = 'tiyul-plus:my-shares';
const MY_SHARES_CAP = 40;
/** הטוקן הארוך יכול להיות אלפי תווים - קידומת מספיקה להשוואה */
const TOKEN_PREFIX = 64;

export function rememberOwnShare(token: string): void {
  if (!token) return;
  try {
    const key = token.slice(0, TOKEN_PREFIX);
    const list = JSON.parse(localStorage.getItem(MY_SHARES_KEY) ?? '[]') as string[];
    if (!Array.isArray(list)) throw new Error('bad list');
    if (list.includes(key)) return;
    list.push(key);
    localStorage.setItem(MY_SHARES_KEY, JSON.stringify(list.slice(-MY_SHARES_CAP)));
  } catch {
    try {
      localStorage.setItem(MY_SHARES_KEY, JSON.stringify([token.slice(0, TOKEN_PREFIX)]));
    } catch {
      /* אחסון חסום */
    }
  }
}

export function isOwnShare(token: string): boolean {
  if (!token) return false;
  try {
    const list = JSON.parse(localStorage.getItem(MY_SHARES_KEY) ?? '[]') as string[];
    return Array.isArray(list) && list.includes(token.slice(0, TOKEN_PREFIX));
  } catch {
    return false;
  }
}

/**
 * ---------- המרה: שיתוף → טיול של הצופה ----------
 *
 * המספר שנתנאל ביקש במפורש: כמה מהפתיחות של קישור משותף הובילו לכך
 * שהצופה יצר טיול משלו. המנגנון: צפייה בשיתוף (לא-בעלים, ובדפדפן
 * שעוד **אין** בו אף טיול - כלומר אדם חדש, שזה מה שוויראליות מודדת)
 * מניחה סמן מקומי; יצירת הטיול הבא בדפדפן הזה, בתוך 7 ימים, נספרת
 * פעם אחת כ-shared_adopt. "שמירה אצלי" עוברת כאן מעצמה - היא יוצרת
 * טיול, וזה כל מה שהסמן צריך.
 */
const SHARE_REF_KEY = 'tiyul-plus:share-ref';
const SHARE_REF_MAX_DAYS = 7;

/** נקרא מעמוד השיתוף, רק כשהצופה אינו הבעלים ואין לו עדיין טיולים */
export function markSharedVisit(): void {
  try {
    if (!localStorage.getItem(SHARE_REF_KEY)) {
      localStorage.setItem(SHARE_REF_KEY, localDay());
    }
  } catch {
    /* אחסון חסום - אין ייחוס */
  }
}

/**
 * **נקודת הכניסה היחידה לספירת "טיול נוצר"** - TripContext קורא לה
 * מכל מסלולי היצירה המקומיים (סוכן, מתכנן, שאלון, ייבוא, שמירה של
 * שיתוף, שכפול) ו**לא** ממשיכה מהשרת (applyRemoteTrips) - שחזור אינו
 * יצירה. הייחוס לשיתוף נבדק כאן כדי שיהיה מקום אחד ולא ארבעה.
 */
export function trackTripCreated(): void {
  trackEvent('trip_created');
  try {
    const day = localStorage.getItem(SHARE_REF_KEY);
    if (!day) return;
    localStorage.removeItem(SHARE_REF_KEY); // נצרך פעם אחת, מוצלח או לא
    const ageDays = (Date.now() - Date.parse(day)) / 86_400_000;
    if (Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= SHARE_REF_MAX_DAYS) {
      trackEvent('shared_adopt');
    }
  } catch {
    /* אחסון חסום */
  }
}

/**
 * ---------- ביקור חוזר ----------
 *
 * "דפדפן שכבר היה כאן ביום קודם", נספר **פעם אחת ליום** לכל דפדפן.
 * הזיהוי כולו מקומי: תאריך הביקור הראשון נשמר בדפדפן, ורק המונה
 * (בלי שום מזהה) נשלח. חשוב לומר ביושר מה המספר הזה: סכימה של טווח
 * היא "ימי-דפדפן-חוזר", לא "דפדפנים ייחודיים בטווח" - טבלת האירועים
 * אגרגטיבית בכוונה (בלי זהויות), אז ייחודיות על פני טווח שרירותי
 * אינה ניתנת לחישוב, וזה המדד הקרוב ביותר שנשאר נאמן לפרטיות.
 *
 * דפדפנים שהיו כאן לפני הפיצ'ר: אם כבר יש להם את מזהה-הדפדפן של
 * המכסות (clientId) אבל אין רשומת ביקור - הם דפדפנים ותיקים, והביקור
 * הנוכחי שלהם נספר כחוזר. זה השימוש במזהה הקיים שנתנאל ביקש, בלי
 * להוסיף שום דבר חדש ובלי לשלוח אותו לשום מקום.
 */
const VISIT_KEY = 'tiyul-plus:visit';

export function pingVisit(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = localDay();
    const raw = localStorage.getItem(VISIT_KEY);
    let rec: { first?: string; counted?: string } | null = null;
    try {
      rec = raw ? (JSON.parse(raw) as { first?: string; counted?: string }) : null;
    } catch {
      rec = null;
    }
    if (!rec?.first) {
      // אין רשומת ביקור. דפדפן שכבר נושא clientId היה כאן קודם -
      // ביקור ותיק שנספר כחוזר; דפדפן נקי מתחיל את הספירה מהיום.
      // hasClientId ולא clientId() - הקריאה השנייה מייצרת מזהה בהיעדרו,
      // והייתה הופכת כל דפדפן חדש ל"ותיק".
      const veteran = hasClientId();
      localStorage.setItem(
        VISIT_KEY,
        JSON.stringify({ first: today, counted: veteran ? today : '' }),
      );
      if (veteran) trackEvent('return_visit');
      return;
    }
    if (rec.first !== today && rec.counted !== today) {
      localStorage.setItem(VISIT_KEY, JSON.stringify({ first: rec.first, counted: today }));
      trackEvent('return_visit');
    }
  } catch {
    /* אחסון חסום - אין ספירה, אין קריסה */
  }
}
