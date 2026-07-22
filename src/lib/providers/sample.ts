import type { Country, Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { destinations, getDestinationBySlug } from '@/data/destinations';
import { countries, getCountryBySlug } from '@/data/countries';

/**
 * ספק ברירת המחדל: נתונים שנאספו ידנית וגרים ברפו.
 * עובד בלי שום מפתח API - מושלם לפיתוח ול-MVP.
 */
export const sampleProvider: PlacesProvider = {
  providerName: 'sample',

  async getCountries(): Promise<Country[]> {
    return countries;
  },

  async getCountry(slug: string): Promise<Country | null> {
    return getCountryBySlug(slug) ?? null;
  },

  async getDestinations(): Promise<DestinationSummary[]> {
    return destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      nameLocal: d.nameLocal,
      countrySlug: d.countrySlug,
      country: getCountryBySlug(d.countrySlug)?.name ?? '',
      flag: d.flag,
      tagline: d.tagline,
      days: d.itinerary.length,
      kosherCount: d.places.filter((p) => p.category.startsWith('kosher')).length,
      photo: d.photo,
    }));
  },

  async getDestination(slug: string): Promise<Destination | null> {
    return getDestinationBySlug(slug) ?? null;
  },

  async searchPlaces(slug: string, query: string): Promise<Place[]> {
    const dest = getDestinationBySlug(slug);
    if (!dest) return [];
    const q = query.trim().toLowerCase();
    if (!q) return dest.places;
    return dest.places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nameLocal.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  },
};
