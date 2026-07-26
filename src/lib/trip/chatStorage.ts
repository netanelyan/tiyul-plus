/**
 * היסטוריית שיחה לכל טיול בנפרד (localStorage, לפי מזהה טיול) - כדי
 * שמעבר בין טאבים בניווט (SiteNav) ישחזר גם את השיחה וגם את נתוני הטיול.
 * שכבה דקה כמו storage.ts - כשיהיה backend, מחליפים רק את הקובץ הזה.
 */

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  destinationSlug?: string;
  placeIds?: string[];
  actions?: string[];
  quickReplies?: string[];
  /** תמונה שצורפה להודעה (data URL מוקטן) - ראו imageAttach.ts */
  image?: string;
}

const PREFIX = 'tiyul-plus:chat:';

/**
 * כמה מההודעות האחרונות שומרות את התמונה שצורפה להן. תמונה היא מאות KB
 * ול-localStorage יש כמה מגה בסך הכל, אז היסטוריה ארוכה עם תמונות הייתה
 * מפוצצת את האחסון ומאבדת את השיחה כולה. ההודעות הישנות נשמרות בלי
 * התמונה - הטקסט נשאר, רק התצוגה המקדימה נעלמת אחרי רענון.
 */
const KEEP_IMAGES_IN_LAST = 4;

export function loadChat(tripId: string): StoredChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + tripId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChat(tripId: string, messages: StoredChatMessage[]): void {
  if (typeof window === 'undefined') return;
  const cutoff = messages.length - KEEP_IMAGES_IN_LAST;
  const trimmed = messages.map((m, i) =>
    m.image && i < cutoff ? { ...m, image: undefined } : m,
  );
  try {
    window.localStorage.setItem(PREFIX + tripId, JSON.stringify(trimmed));
  } catch {
    // אחסון מלא/חסום - מתעלמים בשקט, השיחה נשארת בזיכרון בלבד
  }
}
