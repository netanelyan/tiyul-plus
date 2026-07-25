import type { Destination } from '@/lib/types';
import type { Trip, TripDay } from './types';
import { newId } from './types';

/**
 * טיול מתוך יעד מיובא (Google My Maps): כל הנקודות לפי סדר המפה
 * המקורית, עד 4 עצירות ביום. משותף למודל הייבוא בסדנת הטיול ולטאב
 * הקישור ב-/start.
 */
export const IMPORT_STOPS_PER_DAY = 4;

export function buildTripFromImport(dest: Destination): Trip {
  const days: TripDay[] = [];
  for (let i = 0; i < dest.places.length; i += IMPORT_STOPS_PER_DAY) {
    days.push({
      id: newId(),
      citySlug: dest.slug,
      placeIds: dest.places.slice(i, i + IMPORT_STOPS_PER_DAY).map((p) => p.id),
    });
  }
  return {
    id: newId(),
    name: dest.name,
    citySlugs: [dest.slug],
    days,
    createdAt: Date.now(),
  };
}

/** קישור שנראה כמו Google My Maps / קישור מפות מקוצר - לזיהוי בטאבים */
export function looksLikeMyMaps(url: string): boolean {
  return /google\.[a-z.]+\/maps\/d\/|maps\.app\.goo\.gl|[?&]mid=/i.test(url);
}
