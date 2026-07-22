import type { Trip } from './types';

/**
 * שכבת אחסון דקה מעל localStorage.
 * כשיהיה backend אמיתי (חשבונות משתמש), מחליפים רק את הקובץ הזה -
 * הקומפוננטות מדברות עם TripContext ולא יודעות איפה הנתונים גרים.
 */

const KEY = 'tiyul-plus:trips:v1';

export interface TripState {
  trips: Trip[];
  currentId: string | null;
}

export function loadTrips(): TripState {
  if (typeof window === 'undefined') return { trips: [], currentId: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { trips: [], currentId: null };
    const parsed = JSON.parse(raw) as TripState;
    if (!Array.isArray(parsed.trips)) return { trips: [], currentId: null };
    return parsed;
  } catch {
    return { trips: [], currentId: null };
  }
}

export function saveTrips(state: TripState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // אחסון מלא/חסום - מתעלמים בשקט, המצב נשאר בזיכרון
  }
}
