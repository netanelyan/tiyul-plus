// ---------- Core domain types ----------
// Everything UI-facing is in Hebrew; nameLocal keeps the local-language name
// so it can be shown to taxi drivers / searched on Google Maps.

export type PlaceCategory =
  | 'attraction'
  | 'museum'
  | 'nature'
  | 'viewpoint'
  | 'cafe'
  | 'shopping'
  | 'kosher-food'
  | 'kosher-market';

// תגיות קהל - סט סגור, משמש גם לסינון וגם להתאמת העדפות בציון האשף
export type PlaceTag =
  | 'families'
  | 'nightlife'
  | 'romantic'
  | 'history'
  | 'art'
  | 'foodie'
  | 'outdoors';

// אימות כשרות - תג אמון כן: source="curated" + lastChecked="pending-review"
// מוצג בממשק כ"לאמת לפני נסיעה" עד שמישהו באמת בדק מול המקום.
export interface KosherVerification {
  source: string; // מי קבע (curated / community / official)
  lastChecked: string; // ISO date או "pending-review"
  supervision: string; // גוף ההשגחה, עברית
}

export interface Place {
  id: string;
  name: string; // Hebrew name
  nameLocal: string; // Local / English name (for Google Maps search, taxis)
  category: PlaceCategory;
  lat: number;
  lng: number;
  description: string; // Hebrew
  rating?: number; // 0-5, from provider (sample data = editorial estimate)
  durationMin?: number; // typical visit length
  kosherNote?: string; // hechsher / kashrut details, Hebrew
  kosherVerification?: KosherVerification; // תג האמון של רשומות כשרות
  externalUrl?: string; // deep link to Google Maps / TripAdvisor page
  photo?: string; // verified URL (Wikimedia/Unsplash); UI falls back to gradient
  priceLevel?: 0 | 1 | 2 | 3; // 0=חינם, 3=יקר
  tags?: PlaceTag[];
  mustSee?: boolean;
}

export interface DayPlan {
  day: number; // 1-based
  title: string; // Hebrew, e.g. "העיר העתיקה והקתדרלה"
  placeIds: string[]; // ordered stops, referencing Place.id
  notes?: string; // Hebrew tips for the day
}

// Country-level facts: identical for every city in the country, so they live
// on the Country and cities reference them via countrySlug.
export interface CountryPractical {
  visa: string;
  currency: string;
  sim: string;
  payments: string;
}

export interface Country {
  slug: string;
  name: string; // Hebrew
  nameLocal: string; // Local / English name
  flag: string; // emoji
  tagline: string; // Hebrew one-liner
  summary: string; // Hebrew paragraph
  photo?: string; // hero photo URL (Unsplash); UI falls back to gradient
  practical: CountryPractical;
}

// City-level facts: specific to the city (its airport, its transit, its
// kosher scene). Country facts (visa, currency…) come from the Country.
export interface CityPractical {
  flights: string; // direct flights from TLV to this city's airport
  gettingAround: string;
  kosherOverview: string; // state of kosher food in the city
}

export interface Destination {
  slug: string;
  name: string; // Hebrew
  nameLocal: string;
  countrySlug: string; // references Country.slug
  flag: string; // emoji
  center: { lat: number; lng: number };
  zoom: number;
  tagline: string; // Hebrew one-liner
  summary: string; // Hebrew paragraph
  bestSeason: string;
  photo?: string; // hero photo URL (Unsplash); UI falls back to gradient
  places: Place[];
  itinerary: DayPlan[];
  practical: CityPractical;
}

export interface DestinationSummary {
  slug: string;
  name: string;
  nameLocal: string;
  countrySlug: string;
  country: string; // Hebrew country name, resolved from countrySlug
  flag: string;
  tagline: string;
  days: number;
  kosherCount: number;
  photo?: string;
}

// ---------- Provider abstraction ----------
// The app talks only to this interface. Sample data ships in the repo;
// Google Places / TripAdvisor adapters enrich or replace it when API keys
// are configured. Swapping providers is a .env change, not a rewrite.

export interface PlacesProvider {
  readonly providerName: string;
  /** Countries are curated content - external providers delegate to sample. */
  getCountries(): Promise<Country[]>;
  getCountry(slug: string): Promise<Country | null>;
  getDestinations(): Promise<DestinationSummary[]>;
  getDestination(slug: string): Promise<Destination | null>;
  /** Free-text search within a destination (Hebrew or local language). */
  searchPlaces(slug: string, query: string): Promise<Place[]>;
}
