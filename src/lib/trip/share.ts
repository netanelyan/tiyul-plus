import { destinations } from '@/data/destinations';
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
 */

type ShareDay = [citySlug: string, placeIds: string[], notes?: string];
type SharePayload = [version: 1, name: string, days: ShareDay[]];

/* ---------- base64url איזומורפי (דפדפן + Node) ל-UTF-8 ---------- */

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string | null {
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

export function decodeTripShare(code: string): SharedTrip | null {
  const json = fromBase64Url(code);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed[0] !== 1) return null;
  const [, name, days] = parsed as SharePayload;
  if (typeof name !== 'string' || !Array.isArray(days)) return null;

  const cleanDays: SharedTrip['days'] = [];
  for (const d of days) {
    if (!Array.isArray(d) || typeof d[0] !== 'string' || !Array.isArray(d[1])) return null;
    const dest = destinations.find((x) => x.slug === d[0]);
    if (!dest) continue; // עיר שלא קיימת בקטלוג - מדלגים, לא ממציאים
    // רק מזהי מקומות אמיתיים מהדאטה - כלל הברזל חל גם על קישורים
    const placeIds = d[1].filter(
      (id): id is string => typeof id === 'string' && dest.places.some((p) => p.id === id),
    );
    cleanDays.push({
      citySlug: d[0],
      placeIds,
      notes: typeof d[2] === 'string' ? d[2].slice(0, 500) : undefined,
    });
  }
  if (cleanDays.length === 0) return null;
  return { name: name.slice(0, 80) || 'טיול משותף', days: cleanDays };
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
