import { clientIdHeader } from '@/lib/clientId';

/**
 * דיווח על פעולה שקורית בדפדפן בלבד (הדפסה, PDF, שיתוף, ניווט).
 *
 * **מונה, לא מעקב.** נשלח רק סוג הפעולה - בלי מזהה טיול, בלי תוכן
 * ובלי חשבון. השרת סופר יום ומספר, וזה כל מה שנשמר.
 *
 * לא נכשל ולא מעכב: אם הבקשה נופלת, ההדפסה קורית בכל מקרה.
 */
/**
 * `pdf` קיים בסכימה ואינו נשלח היום: הדפסה ו-PDF הם אותו כפתור ואותו
 * דיאלוג דפדפן, ואי אפשר לדעת מהדף מה נבחר בו. מוטב שדה שלא מגיע על
 * פני מספר שנראה אמיתי ואינו.
 */
export type AppEvent = 'print' | 'pdf' | 'whatsapp' | 'share' | 'maps';

export function trackEvent(kind: AppEvent): void {
  if (typeof window === 'undefined') return;
  try {
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
