import type { Country, Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { destinations, getDestinationBySlug } from '@/data/destinations';
import { countries, getCountryBySlug } from '@/data/countries';
import { dailyCostFor } from '@/data/dailyCosts';

/**
 * The default provider: hand-curated data living in the repo.
 * Works without any API key - perfect for development and the MVP.
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
      editorialRating: d.editorialRating,
    }));
  },

  async getDestination(slug: string): Promise<Destination | null> {
    const dest = getDestinationBySlug(slug);
    if (!dest) return null;
    // Daily cost is attached here and not written into `destinations.ts`:
    // it comes from an external source with its own check date, and its
    // lifecycle (periodic refresh) differs from the catalog's. A
    // destination without a record gets undefined, not an empty value.
    const dailyCost = dailyCostFor(slug);
    return dailyCost ? { ...dest, dailyCost } : dest;
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
