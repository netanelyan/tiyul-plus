import type { Country, Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { sampleProvider } from './sample';

/**
 * TripAdvisor Content API adapter.
 *
 * To enable:
 * 1. Sign up at developer.tripadvisor.com and get a key (5,000 calls a month free).
 * 2. Add to .env.local:  TRIPADVISOR_API_KEY=...
 * 3. Set  NEXT_PUBLIC_PLACES_PROVIDER=tripadvisor
 *
 * The API supports languageCode so content can be requested in Hebrew
 * ("he") - some content is translated and some comes back in English, so a
 * fallback to the local data is kept.
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

  // Countries and destinations are curated content - always from the local data.
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
    // The curated content stays local; TripAdvisor is used for search and ratings.
    return sampleProvider.getDestination(slug);
  },

  async searchPlaces(slug: string, query: string): Promise<Place[]> {
    const dest = await sampleProvider.getDestination(slug);
    if (!API_KEY || !dest) return sampleProvider.searchPlaces(slug, query);
    return taSearch(query, `${dest.center.lat},${dest.center.lng}`);
  },
};
