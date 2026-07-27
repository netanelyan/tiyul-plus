/**
 * האם כשל של תור הסוכן סביר שיעבור בניסיון נוסף.
 *
 * זה חי בקובץ נפרד ולא בתוך `api/chat/route.ts` כי ל-route handler של
 * App Router אסור לייצא כל דבר שאינו מתודת HTTP, ולוגיקה שמחליטה אם
 * לנסות שוב חייבת להיות מכוסה בטסט.
 *
 * ההיסטוריה שמאחורי הפונקציה: הגרסה הראשונה בדקה `err.status` ואם לא
 * מצאה - חיפשה מילים כמו overloaded/rate limit בטקסט. אבל השגיאה
 * שנזרקה בפועל הייתה `new Error('anthropic 529')`, בלי `status` ובלי
 * אף אחת מהמילים - ולכן עומס אמיתי של ה-API סווג כשגיאה קבועה,
 * הניסיון השני לא רץ, והמטייל קיבל תשובת שגיאה על תור שהיה עובר.
 * לכן קוד סטטוס נקרא עכשיו גם מהאובייקט וגם מהטקסט.
 */

/** 429 = הגבלת קצב, 408 = timeout, 5xx (כולל 529 "overloaded") = צד שרת */
function statusIsTransient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

const TRANSIENT_TEXT =
  /overloaded|rate.?limit|too many requests|timeout|timed out|aborted|econnreset|enotfound|eai_again|fetch failed|socket hang up|network|terminated/;

export function isTransient(err: unknown): boolean {
  const e = err as { status?: unknown; name?: unknown; message?: unknown } | null | undefined;

  // 1. קוד סטטוס על האובייקט - המסלול המדויק
  if (typeof e?.status === 'number' && Number.isFinite(e.status)) {
    return statusIsTransient(e.status);
  }

  // 2. AbortSignal.timeout זורק DOMException בשם TimeoutError; ביטול
  //    כזה הוא תמיד חולף מבחינתנו.
  const name = typeof e?.name === 'string' ? e.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return true;

  // 3. קוד סטטוס שנשאר רק בתוך הטקסט ("anthropic 529")
  const text = String(e?.message ?? err ?? '').toLowerCase();
  const fromText = text.match(/\b(4\d\d|5\d\d)\b/);
  if (fromText) return statusIsTransient(Number(fromText[1]));

  return TRANSIENT_TEXT.test(text);
}
