/**
 * שרת בלבד - קריאת טיול בודד ומאומת-בעלות מ-`user_trips`, בשביל
 * תשלומים (בדיקת זכאות ובניית הדוח). לא לבלבל עם `server/tripStats.ts`,
 * שמייצר **תצוגה** לאדמין - כאן מוחזר אובייקט `Trip` אמיתי, כי בונה
 * הדוח (`predepartureReport.ts`) צריך את השדות המלאים.
 */

import { adminSelect } from '@/lib/server/supabaseAdmin';
import { eq, pgLimit, pgQuery, pgSelect } from '@/lib/server/pgrest';
import type { Trip } from '@/lib/trip/types';

interface TripRow {
  data: unknown;
}

/** בדיקה רפויה בלבד - שורה שלא נראית כמו טיול פשוט לא מתקבלת, בלי לזרוק */
function looksLikeTrip(data: unknown): data is Trip {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const t = data as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    Array.isArray(t.citySlugs) &&
    Array.isArray(t.days)
  );
}

/** הטיול, רק אם `userId` הוא הבעלים שלו לפי `user_trips`. `null` אחרת. */
export async function findOwnTrip(userId: string, tripId: string): Promise<Trip | null> {
  const rows = await adminSelect<TripRow>(
    'user_trips',
    pgQuery(eq('user_id', userId), eq('id', tripId), pgSelect(['data']), pgLimit(1)),
  );
  const data = rows?.[0]?.data;
  if (!looksLikeTrip(data)) return null;
  // ימים פגומים לא מפילים את הקורא - מנוקים כאן במקום בכל צרכן בנפרד
  const days = Array.isArray(data.days)
    ? data.days.filter((d) => d && typeof d === 'object' && Array.isArray((d as { placeIds?: unknown }).placeIds))
    : [];
  return { ...data, days };
}
