/**
 * מזהה דפדפן יציב, ללקוח בלבד.
 *
 * **למה הוא קיים:** מכסות אנונימיות שנשענות על כתובת IP לבדה סופרות
 * את כל לקוחות מפעילת הסלולר כאדם אחד - CGNAT מעמיד עשרות אלפי
 * מכשירים מאחורי מספר קטן של כתובות. התוצאה היא חסימה של אנשים
 * שמעולם לא נכנסו לאתר, בגלל מישהו אחר.
 *
 * זה **לא** מזהה משתמש ולא מנגנון אבטחה: אין בו שום מידע אישי, הוא
 * לא נשלח לשום צד שלישי, והוא מתאפס עם ניקוי האחסון בדפדפן. תפקידו
 * היחיד הוא להפריד בין מבקרים לצורך מכסה הוגנת.
 *
 * מי שמוחק אותו לא מרוויח כלום: השרת נופל חזרה למכסה לפי IP, שהיא
 * המחמירה מבין השתיים.
 */
const KEY = 'tiyul-plus:client-id';

let cached: string | null = null;

/** מזהה מקומי (16 תווים), נוצר פעם אחת ונשמר */
export function clientId(): string {
  if (cached) return cached;
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[a-z0-9]{16,64}$/.test(existing)) {
      cached = existing;
      return existing;
    }
    // crypto.randomUUID קיים בכל דפדפן שאנחנו תומכים בו; בלעדיו אין
    // מזהה, והשרת פשוט ישתמש ב-IP.
    const id = (globalThis.crypto?.randomUUID?.() ?? '').replace(/-/g, '').slice(0, 32);
    if (!/^[a-z0-9]{16,64}$/.test(id)) return '';
    localStorage.setItem(KEY, id);
    cached = id;
    return id;
  } catch {
    // אחסון חסום (מצב פרטי מסוים) - נופלים ל-IP, וזה בסדר
    return '';
  }
}

/** הכותרת שמצורפת לכל בקשה שעולה כסף */
export function clientIdHeader(): Record<string, string> {
  const id = clientId();
  return id ? { 'x-client-id': id } : {};
}
