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
  externalUrl?: string; // deep link to Google Maps / TripAdvisor page
}

export interface DayPlan {
  day: number; // 1-based
  title: string; // Hebrew, e.g. "העיר העתיקה והקתדרלה"
  placeIds: string[]; // ordered stops, referencing Place.id
  notes?: string; // Hebrew tips for the day
}

export interface PracticalInfo {
  flights: string; // direct flights from TLV, typical duration
  visa: string;
  currency: string;
  sim: string;
  payments: string;
  gettingAround: string;
  kosherOverview: string; // state of kosher food in the destination
}

export interface Destination {
  slug: string;
  name: string; // Hebrew
  nameLocal: string;
  country: string; // Hebrew
  flag: string; // emoji
  center: { lat: number; lng: number };
  zoom: number;
  tagline: string; // Hebrew one-liner
  summary: string; // Hebrew paragraph
  bestSeason: string;
  photo?: string; // hero photo URL (Unsplash); UI falls back to gradient
  places: Place[];
  itinerary: DayPlan[];
  practical: PracticalInfo;
}

export interface DestinationSummary {
  slug: string;
  name: string;
  nameLocal: string;
  country: string;
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
  getDestinations(): Promise<DestinationSummary[]>;
  getDestination(slug: string): Promise<Destination | null>;
  /** Free-text search within a destination (Hebrew or local language). */
  searchPlaces(slug: string, query: string): Promise<Place[]>;
}
