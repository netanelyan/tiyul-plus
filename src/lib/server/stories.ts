/**
 * סיפור הטיול - צד השרת. **היצירה פרימיום, הצפייה חופשית.**
 *
 * ## שלושה עקרונות
 *
 * 1. **ה-snapshot נבנה בשרת מהטיול האמיתי**, לא מגוף הבקשה: הטיול
 *    נקרא עם `findOwnTrip` (הפרימיטיב שכל נתיבי הכסף משתמשים בו -
 *    מסונן על user_id) ושמות המקומות מגיעים מהקטלוג. לקוח לא יכול
 *    לפרסם "סיפור" עם תוכן שלא היה בטיול שלו.
 * 2. **עמוד ציבורי קורא רק snapshot.** עריכת הטיול אחרי הפרסום לא
 *    משנה את הסיפור, ומחיקת הטיול לא שוברת אותו.
 * 3. **תמונות עוברות דרך השרת** אחרי ולידציית צורה - אותה בדיקת
 *    data-URL קפדנית כמו תמונות הצ׳אט - ונשמרות ב-storage עם service
 *    role. אין policy כתיבה ציבורית על הדלי בכלל.
 */

import { destinations } from '@/data/destinations';
import { findOwnTrip } from '@/lib/server/userTrips';
import { adminInsert, adminSelect, adminUpdate } from '@/lib/server/supabaseAdmin';
import { eq, pgQuery, pgSelect } from '@/lib/server/pgrest';

export const MAX_STORY_PHOTOS = 40;
export const MAX_PHOTO_DATAURL = 1_800_000; // ~1.3MB בפועל אחרי base64

export interface StoryStop {
  name: string;
  lat: number;
  lng: number;
  mustSee?: boolean;
}
export interface StoryDay {
  dayNumber: number;
  cityName: string;
  stops: StoryStop[];
}
export interface StorySnapshot {
  name: string;
  startDate?: string;
  endDate?: string;
  days: StoryDay[];
}
export interface StoryPhoto {
  path: string;
  caption?: string;
}
export interface StoryRow {
  slug: string;
  user_id: string;
  trip_id: string;
  title: string;
  trip_data: StorySnapshot;
  photos: StoryPhoto[];
  published: boolean;
  created_at: string;
}

/** slug ציבורי: קצר, אקראי, בלי תווים דו-משמעיים - כמו קודי השיתוף */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function newStorySlug(): string {
  let s = 'st';
  for (let i = 0; i < 9; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** בניית ה-snapshot מהטיול השמור בשרת + הקטלוג. מקומות לא מזוהים מדולגים. */
export function buildSnapshot(trip: {
  name: string;
  startDate?: string;
  endDate?: string;
  days: { citySlug: string; placeIds: string[] }[];
}): StorySnapshot {
  const days: StoryDay[] = trip.days.map((d, i) => {
    const dest = destinations.find((x) => x.slug === d.citySlug);
    const stops: StoryStop[] = d.placeIds
      .map((pid) => dest?.places.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, ...(p.mustSee ? { mustSee: true } : {}) }));
    return { dayNumber: i + 1, cityName: dest?.name ?? d.citySlug, stops };
  });
  return {
    name: String(trip.name).slice(0, 80),
    ...(trip.startDate ? { startDate: trip.startDate } : {}),
    ...(trip.endDate ? { endDate: trip.endDate } : {}),
    days,
  };
}

export async function findStory(userId: string, tripId: string): Promise<StoryRow | null> {
  const rows = await adminSelect<StoryRow>(
    'trip_stories',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId), pgSelect(['slug', 'user_id', 'trip_id', 'title', 'trip_data', 'photos', 'published', 'created_at'])),
  );
  return rows?.[0] ?? null;
}

/**
 * יצירה/רענון של הסיפור לטיול. ה-snapshot נבנה מחדש מהטיול השמור בכל
 * קריאה - "רענן את הסיפור" אחרי עריכת הטיול הוא אותה פעולה בדיוק.
 */
export async function upsertStory(userId: string, tripId: string, title?: string): Promise<StoryRow | null> {
  const trip = await findOwnTrip(userId, tripId);
  if (!trip) return null;
  const snapshot = buildSnapshot(trip);
  if (snapshot.days.every((d) => d.stops.length === 0)) return null; // סיפור בלי שום עצירה אינו סיפור

  const existing = await findStory(userId, tripId);
  const cleanTitle = (title ?? existing?.title ?? snapshot.name).trim().slice(0, 80) || snapshot.name;
  const now = new Date().toISOString();

  if (existing) {
    const rows = await adminUpdate<StoryRow>(
      'trip_stories',
      pgQuery(eq('user_id', userId), eq('trip_id', tripId)),
      { title: cleanTitle, trip_data: snapshot, updated_at: now },
    );
    return rows?.[0] ?? null;
  }
  const rows = await adminInsert<StoryRow>('trip_stories', {
    slug: newStorySlug(),
    user_id: userId,
    trip_id: tripId,
    title: cleanTitle,
    trip_data: snapshot,
    photos: [],
    published: false,
    created_at: now,
    updated_at: now,
  });
  return rows?.[0] ?? null;
}

export async function setPublished(userId: string, tripId: string, published: boolean): Promise<boolean> {
  const rows = await adminUpdate<{ slug: string }>(
    'trip_stories',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId)),
    { published, updated_at: new Date().toISOString() },
  );
  return Boolean(rows && rows.length > 0);
}

/** אותה ולידציה קפדנית כמו תמונות הצ׳אט - צורת data URL בלבד, לא תוכן חופשי */
const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

export function parsePhotoDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  if (dataUrl.length > MAX_PHOTO_DATAURL || !DATA_URL_RE.test(dataUrl)) return null;
  const comma = dataUrl.indexOf(',');
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
  try {
    return { mime, bytes: Buffer.from(dataUrl.slice(comma + 1), 'base64') };
  } catch {
    return null;
  }
}

/** העלאת תמונה לדלי + הוספתה לרשימת התמונות של הסיפור */
export async function addStoryPhoto(
  userId: string,
  tripId: string,
  dataUrl: string,
  caption?: string,
): Promise<StoryRow | null> {
  const story = await findStory(userId, tripId);
  if (!story) return null;
  if (story.photos.length >= MAX_STORY_PHOTOS) return null;
  const parsed = parsePhotoDataUrl(dataUrl);
  if (!parsed) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const ext = parsed.mime === 'image/png' ? 'png' : parsed.mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${story.slug}/${Date.now().toString(36)}-${story.photos.length}.${ext}`;
  try {
    const res = await fetch(`${url}/storage/v1/object/story-photos/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': parsed.mime },
      body: new Uint8Array(parsed.bytes),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn('[stories] photo upload failed', res.status);
      return null;
    }
  } catch {
    return null;
  }

  const photos: StoryPhoto[] = [
    ...story.photos,
    { path, ...(caption?.trim() ? { caption: caption.trim().slice(0, 140) } : {}) },
  ];
  const rows = await adminUpdate<StoryRow>(
    'trip_stories',
    pgQuery(eq('user_id', userId), eq('trip_id', tripId)),
    { photos, updated_at: new Date().toISOString() },
  );
  return rows?.[0] ?? null;
}

/** כתובת ציבורית לתמונה בדלי (הדלי public לקריאה) */
export function storyPhotoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''}/storage/v1/object/public/story-photos/${path}`;
}
