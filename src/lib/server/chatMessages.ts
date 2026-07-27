/**
 * ניקוי היסטוריית ההודעות שהלקוח שולח ל-/api/chat.
 *
 * מופרד מ-`api/chat/route.ts` כי ל-route handler של App Router אסור
 * לייצא כל דבר שאינו מתודת HTTP, והלוגיקה הזו חייבת טסטים - היא הפילה
 * שיחות אמיתיות בפרודקשן.
 *
 * ## הבאג שהקובץ הזה נולד ממנו
 *
 * מטייל צירף צילום של אישור הזמנת מלון **בלי טקסט**, כך שההודעה נשמרה
 * עם `content: ''` ותמונה. תמונות נשלחות למודל רק בשתי ההודעות
 * האחרונות (הן יקרות, וההיסטוריה כולה נשלחת בכל תור), ולכן אחרי שני
 * תורים נוספים ההודעה הזו נשלחה **בלי תמונה ובלי טקסט**. ה-API של
 * Anthropic דוחה את הבקשה כולה:
 *
 *   400 invalid_request_error - "messages.2: user messages must have
 *   non-empty content"
 *
 * 400 היא שגיאה קבועה ולא חולפת, ולכן כל ניסיון חוזר נכשל באותו אופן -
 * המטייל לחץ על אותו צ׳יפ פעמיים וקיבל "משהו השתבש" פעמיים. זה גם מה
 * שהפיל את התור המקורי שנראה כמו אמנזיה, לפני שהודעת השגיאה תוקנה.
 *
 * ## מה נבדק מול ה-API האמיתי (ולא הונח)
 *
 * - הודעת user ריקה או עם רווחים בלבד → 400. **זה מה שנשבר.**
 * - הודעת assistant ריקה → 200. מותר, אבל אין בה תועלת.
 * - שתי הודעות user רצופות → 200. אין דרישת החלפת תפקידים.
 *
 * הבדיקה השלישית היא מה שמאפשר את התיקון: אפשר פשוט **להשמיט** הודעה
 * ריקה בלי לתפור במקומה טקסט מדומה, כי הרצף שנוצר חוקי.
 *
 * ## למה השמטה ולא טקסט ממלא
 *
 * אפשר היה לכתוב במקומה "צירפתי תמונה". אבל אחרי שהתמונה כבר לא
 * נשלחת, זו הזמנה למודל להתייחס למסמך שהוא לא רואה ולהמציא ממנו
 * פרטים - בדיוק מה שחוק קשיח 2 אוסר. התשובה של הסוכן מהתור ההוא
 * נשארת בהיסטוריה, כך שמה שהוא באמת קרא מהתמונה משתמר **במילים שלו**
 * ובלי להתחזות לצפייה חוזרת במסמך.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** תמונה שהמשתמש צירף (data URL מוקטן) - ראו lib/trip/imageAttach.ts */
  image?: string;
}

/** רק פורמטים שהמודל תומך בהם, ורק base64 - לא URL חיצוני */
export const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
/** אותה תקרה כמו בצד הלקוח - השרת לא סומך על הלקוח */
export const MAX_IMAGE_CHARS = 1_400_000;
/** כמה תמונות מותר בבקשה אחת (ההיסטוריה נשלחת שוב בכל תור) */
export const MAX_IMAGES_PER_REQUEST = 2;

/** הודעה שאין בה לא טקסט ולא תמונה לא נושאת שום מידע */
function carriesNothing(m: ChatMessage): boolean {
  return !m.image && m.content.trim().length === 0;
}

/**
 * תפקיד וטקסט בלבד, ותמונה רק אם היא data URL תקין בגודל סביר, רק
 * בהודעת משתמש, ורק בשתי ההודעות האחרונות שיש בהן תמונה. הודעות שנשארו
 * בלי תוכן כלל מושמטות - ראו ההסבר בראש הקובץ.
 */
export function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const msgs: ChatMessage[] = [];
  for (const item of raw.slice(-40)) {
    if (!item || typeof item !== 'object') continue;
    const m = item as { role?: unknown; content?: unknown; image?: unknown };
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.slice(0, 8000) : '';
    const image = typeof m.image === 'string' ? m.image : '';
    const okImage =
      role === 'user' && image.length > 0 && image.length <= MAX_IMAGE_CHARS && IMAGE_DATA_URL.test(image);
    msgs.push(okImage ? { role, content, image } : { role, content });
  }
  let kept = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (!msgs[i].image) continue;
    if (kept < MAX_IMAGES_PER_REQUEST) kept += 1;
    else msgs[i] = { role: msgs[i].role, content: msgs[i].content };
  }
  // חייב לרוץ אחרי הסרת התמונות: ההסרה היא בעצמה מה שמרוקן הודעה
  // שכל תוכנה היה תמונה.
  const carrying = msgs.filter((m) => !carriesNothing(m));

  // ההיסטוריה חייבת להיפתח בהודעת user. שתי דרכים להגיע למצב שהיא לא:
  //
  // 1. **רגרסיה שהתיקון שלמעלה יצר.** שיחה שנפתחה בתמונה בלי טקסט -
  //    ההודעה הראשונה מתרוקנת כשהתמונה יוצאת מהחלון, נזרקת כאן, ומה
  //    שנשאר ראשון הוא התשובה של הסוכן. ה-API מחזיר על זה 400, כלומר
  //    התיקון של ה"תוכן הריק" החליף שגיאה אחת באחרת. נמצא בפרודקשן.
  // 2. **קדם לזה:** `raw.slice(-40)` יכול לפתוח את החלון על הודעת
  //    assistant בכל שיחה ארוכה מ-40 הודעות, בלי קשר לתמונות.
  //
  // הסרה היא הפתרון הנכון ולא רק החוקי: להודעת assistant בתחילת המערך
  // אין תור user שהיא עונה עליו, אז היא לא נושאת הקשר שימושי בכל מקרה.
  let firstUser = 0;
  while (firstUser < carrying.length && carrying[firstUser].role !== 'user') firstUser += 1;
  return firstUser === 0 ? carrying : carrying.slice(firstUser);
}
