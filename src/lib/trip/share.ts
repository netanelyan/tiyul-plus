import type { Trip, TripDay } from './types';
import { newId } from './types';

/**
 * קישור שיתוף לטיול - Phase 4 (viral loop), בלי backend:
 * הטיול מקודד לתוך ה-URL עצמו (/t/<code>) ונפתח לקריאה לכל אחד.
 * מקודדים רק מזהים (citySlug + placeIds) - הדאטה האוצרת כבר נמצאת
 * באתר, אז הקישור קצר והפענוח תמיד מוצג מול מקומות אמיתיים בלבד.
 *
 * כשיגיעו חשבונות (backend), אותו מסך /t/<code> יקבל גם קודים קצרים
 * מהשרת - הפורמט כאן הוא v1 ומסומן בגרסה כדי לאפשר את המעבר.
 *
 * **הפענוח (`decodeTripShare`) יושב ב-`@/lib/server/shareDecode`** ולא
 * כאן, כי הוא מאמת כל מזהה מול הקטלוג - וכל מי שמייבא את הקובץ הזה
 * בצד הלקוח (מסך הטיול, שמייצר קישור) היה גורר את הקטלוג כולו איתו.
 * שני הקוראים של הפענוח הם שרת ממילא: `/api/share` ו-`/t/[code]`.
 */

export type ShareDay = [citySlug: string, placeIds: string[], notes?: string];
type SharePayload = [version: 1, name: string, days: ShareDay[]];

/* ---------- base64url איזומורפי (דפדפן + Node) ל-UTF-8 ---------- */

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(code: string): string | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/* ---------- קידוד ---------- */

export function encodeTripShare(trip: Trip): string {
  const payload: SharePayload = [
    1,
    trip.name,
    trip.days.map((d): ShareDay => {
      const day: ShareDay = [d.citySlug, d.placeIds];
      if (d.notes) day[2] = d.notes;
      return day;
    }),
  ];
  return toBase64Url(JSON.stringify(payload));
}

/* ---------- פענוח + אימות מול הדאטה האוצרת ---------- */

export interface SharedTrip {
  name: string;
  days: { citySlug: string; placeIds: string[]; notes?: string }[];
}


/** בונה Trip חדש (ids טריים) מהתוכן המשותף - לייבוא אל "הטיולים שלי" */
export function tripFromShared(shared: SharedTrip): Trip {
  const citySlugs: string[] = [];
  for (const d of shared.days) if (!citySlugs.includes(d.citySlug)) citySlugs.push(d.citySlug);
  return {
    id: newId(),
    name: shared.name,
    citySlugs,
    createdAt: Date.now(),
    days: shared.days.map(
      (d): TripDay => ({ id: newId(), citySlug: d.citySlug, placeIds: [...d.placeIds], notes: d.notes }),
    ),
  };
}
