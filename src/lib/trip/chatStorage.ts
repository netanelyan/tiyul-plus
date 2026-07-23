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
}

const PREFIX = 'tiyul-plus:chat:';

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
  try {
    window.localStorage.setItem(PREFIX + tripId, JSON.stringify(messages));
  } catch {
    // אחסון מלא/חסום - מתעלמים בשקט, השיחה נשארת בזיכרון בלבד
  }
}
