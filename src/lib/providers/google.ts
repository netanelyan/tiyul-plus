import type { Country, Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { sampleProvider } from './sample';

/**
 * Google Places (New) API adapter.
 *
 * The idea: the curated content (destinations, itineraries, kosher info)
 * stays local, and Google enriches it in real time - ratings, opening
 * hours, photos, and free-text search for places that don't exist in our
 * data.
 *
 * To enable:
 * 1. Open a project in Google Cloud and enable "Places API (New)".
 * 2. Add to .env.local:  GOOGLE_PLACES_API_KEY=...
 * 3. Set  NEXT_PUBLIC_PLACES_PROVIDER=google
 *
 * Note: the Places API has a free monthly quota, after which billing kicks in.
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
      // A focused field mask = lower billing
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

  // Countries, destinations and itineraries are curated content - always from the local data.
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
    const dest = await sampleProvider.getDestination(slug);
    if (!dest || !API_KEY) return dest;
    // Enrichment: update live ratings from Google by place name.
    // (In production it's better to store a fixed place_id per place and use Place Details.)
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
    // A real free-text search on Google, restricted to the destination's area
    return googleTextSearch(`${query} in ${dest.nameLocal}`);
  },
};
