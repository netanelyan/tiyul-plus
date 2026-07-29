import type { Country, Destination, DestinationSummary, Place, PlacesProvider } from '@/lib/types';
import { destinations, getDestinationBySlug } from '@/data/destinations';
import { countries, getCountryBySlug } from '@/data/countries';
import { dailyCostFor } from '@/data/dailyCosts';

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
      editorialRating: d.editorialRating,
    }));
  },

  async getDestination(slug: string): Promise<Destination | null> {
    const dest = getDestinationBySlug(slug);
    if (!dest) return null;
    // עלות יומית מחוברת כאן ולא נכתבת לתוך `destinations.ts`: היא מגיעה
    // ממקור חיצוני עם תאריך בדיקה משלה, ומחזור החיים שלה (רענון תקופתי)
    // שונה מזה של הקטלוג. יעד בלי רשומה מקבל undefined ולא ערך ריק.
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
