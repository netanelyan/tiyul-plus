import type { Country, Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { sampleProvider } from './sample';

/**
 * מתאם TripAdvisor Content API.
 *
 * להפעלה:
 * 1. נרשמים ב-developer.tripadvisor.com ומקבלים מפתח (5,000 קריאות בחודש חינם).
 * 2. מוסיפים ל-.env.local:  TRIPADVISOR_API_KEY=...
 * 3. מגדירים  NEXT_PUBLIC_PLACES_PROVIDER=tripadvisor
 *
 * ה-API תומך ב-languageCode כך שאפשר לבקש תוכן בעברית ("he") -
 * חלק מהתוכן מתורגם וחלק יחזור באנגלית, לכן שומרים fallback לדאטה המקומי.
 */

const API_KEY = process.env.TRIPADVISOR_API_KEY;
const BASE = 'https://api.content.tripadvisor.com/api/v1';

interface TaLocation {
  location_id: string;
  name: string;
  latitude?: string;
  longitude?: string;
  rating?: string;
  web_url?: string;
  description?: string;
}

async function taSearch(query: string, latLong?: string): Promise<Place[]> {
  if (!API_KEY) return [];
  const params = new URLSearchParams({
    key: API_KEY,
    searchQuery: query,
    language: 'he',
    ...(latLong ? { latLong } : {}),
  });
  const res = await fetch(`${BASE}/location/search?${params}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: TaLocation[] };
  return (data.data ?? [])
    .filter((l) => l.latitude && l.longitude)
    .map((l) => ({
      id: `ta-${l.location_id}`,
      name: l.name,
      nameLocal: l.name,
      category: 'attraction' as const,
      lat: Number(l.latitude),
      lng: Number(l.longitude),
      description: l.description ?? '',
      rating: l.rating ? Number(l.rating) : undefined,
      externalUrl: l.web_url,
    }));
}

export const tripadvisorProvider: PlacesProvider = {
  providerName: 'tripadvisor',

  // מדינות ויעדים הם תוכן אוצר - תמיד מהדאטה המקומי.
  getCountries(): Promise<Country[]> {
    return sampleProvider.getCountries();
  },

  getCountry(slug: string): Promise<Country | null> {
    return sampleProvider.getCountry(slug);
  },

  getDestinations(): Promise<DestinationSummary[]> {
    return sampleProvider.getDestinations();
  },

  async getDestination(slug: string): Promise<Destination | null> {
    // התוכן האוצר נשאר מקומי; TripAdvisor משמש לחיפוש ולדירוגים.
    return sampleProvider.getDestination(slug);
  },

  async searchPlaces(slug: string, query: string): Promise<Place[]> {
    const dest = await sampleProvider.getDestination(slug);
    if (!API_KEY || !dest) return sampleProvider.searchPlaces(slug, query);
    return taSearch(query, `${dest.center.lat},${dest.center.lng}`);
  },
};
