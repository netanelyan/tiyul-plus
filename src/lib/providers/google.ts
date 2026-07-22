import type { Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { sampleProvider } from './sample';

/**
 * מתאם Google Places (New) API.
 *
 * הרעיון: התוכן האוצר (יעדים, מסלולים, מידע כשרות) נשאר מקומי,
 * ו-Google מעשיר אותו בזמן אמת - דירוגים, שעות פתיחה, תמונות,
 * וחיפוש חופשי של מקומות שלא קיימים בדאטה שלנו.
 *
 * להפעלה:
 * 1. פתחו פרויקט ב-Google Cloud והפעילו את "Places API (New)".
 * 2. הוסיפו ל-.env.local:  GOOGLE_PLACES_API_KEY=...
 * 3. הגדירו  NEXT_PUBLIC_PLACES_PROVIDER=google
 *
 * שימו לב: ל-Places API יש מכסה חינמית חודשית, ואחריה חיוב.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

interface GooglePlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  googleMapsUri?: string;
  editorialSummary?: { text: string };
}

async function googleTextSearch(query: string, lang = 'iw'): Promise<Place[]> {
  if (!API_KEY) return [];
  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      // בקשת שדות ממוקדת = חיוב נמוך יותר
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.location,places.rating,places.googleMapsUri,places.editorialSummary',
    },
    body: JSON.stringify({ textQuery: query, languageCode: lang }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: GooglePlaceResult[] };
  return (data.places ?? []).map((p) => ({
    id: `g-${p.id}`,
    name: p.displayName?.text ?? '',
    nameLocal: p.displayName?.text ?? '',
    category: 'attraction' as const,
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    description: p.editorialSummary?.text ?? '',
    rating: p.rating,
    externalUrl: p.googleMapsUri,
  }));
}

export const googleProvider: PlacesProvider = {
  providerName: 'google',

  // רשימת היעדים והמסלולים היא תוכן אוצר - תמיד מהדאטה המקומי.
  getDestinations(): Promise<DestinationSummary[]> {
    return sampleProvider.getDestinations();
  },

  async getDestination(slug: string): Promise<Destination | null> {
    const dest = await sampleProvider.getDestination(slug);
    if (!dest || !API_KEY) return dest;
    // העשרה: מעדכנים דירוגים חיים מגוגל לפי שם המקום.
    // (בפרודקשן כדאי לשמור place_id קבוע לכל מקום ולהשתמש ב-Place Details.)
    const enriched = await Promise.all(
      dest.places.map(async (place) => {
        try {
          const [match] = await googleTextSearch(`${place.nameLocal} ${dest.nameLocal}`);
          return match?.rating ? { ...place, rating: match.rating, externalUrl: match.externalUrl ?? place.externalUrl } : place;
        } catch {
          return place;
        }
      }),
    );
    return { ...dest, places: enriched };
  },

  async searchPlaces(slug: string, query: string): Promise<Place[]> {
    const dest = await sampleProvider.getDestination(slug);
    if (!API_KEY || !dest) return sampleProvider.searchPlaces(slug, query);
    // חיפוש חופשי אמיתי בגוגל, מוגבל לאזור היעד
    return googleTextSearch(`${query} in ${dest.nameLocal}`);
  },
};
