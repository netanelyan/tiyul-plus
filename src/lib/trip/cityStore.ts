'use client';

import type { Destination } from '@/lib/types';

/**
 * The saved trips' cities, on disk, so the itinerary opens without network.
 *
 * **Why this exists at all.** `cityData.ts` kept the cities in a
 * module-level map, i.e. in the tab's memory. That solved the bandwidth,
 * but the moment the user closes the app and opens it without network,
 * they have no stop names, no descriptions and no coordinates - the trip
 * is saved, but the content it points at is gone. Someone standing on a
 * street in a foreign city with no data gets a loading screen that never
 * ends.
 *
 * **What is stored, and deliberately no more than that:** only cities a
 * saved trip actually touches. Not the catalog, not cities viewed while
 * browsing, and not deleted trips. `prune()` is called with the live slug
 * list and deletes everything outside it, so storage does not grow over
 * time but tracks what the user actually has.
 *
 * **`cachedAt` is not decoration.** Content saved a week ago is shown to
 * the user without network, and includes kosher info. The screen must
 * know when it was saved in order to say so.
 */

const KEY = 'tiyul-plus:cities:v1';
/** A sane ceiling: a trip touches 1-6 cities; 20 covers several trips in parallel */
const MAX_CITIES = 20;

export interface StoredCity {
  city: Destination;
  /** when it was saved (ms) - shown to the user when reading offline */
  cachedAt: number;
}

type Store = Record<string, StoredCity>;

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Store = {};
    for (const [slug, v] of Object.entries(parsed as Record<string, unknown>)) {
      const e = v as Partial<StoredCity>;
      // A corrupt entry is dropped silently and does not crash the screen - it
      // will be loaded again the moment there is network, and offline that
      // city is simply considered missing.
      if (e && typeof e.cachedAt === 'number' && e.city && typeof e.city === 'object') {
        const city = e.city as Destination;
        if (city.slug === slug && Array.isArray(city.places)) out[slug] = { city, cachedAt: e.cachedAt };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Quota is full: we give up the save, not the screen. The app keeps
    // working with the network exactly as before; only the offline state suffers.
  }
}

export function loadCities(): Store {
  return read();
}

/** Returns all stored cities as a map of slug → Destination */
export function storedCities(): Record<string, Destination> {
  const out: Record<string, Destination> = {};
  for (const [slug, e] of Object.entries(read())) out[slug] = e.city;
  return out;
}

/** When this city was saved, or null if it is not stored */
export function cachedAt(slug: string): number | null {
  return read()[slug]?.cachedAt ?? null;
}

/**
 * The oldest date among the given cities - that is what deserves to be
 * shown, because the staleness of the screen is the staleness of the
 * oldest item appearing on it.
 */
export function oldestCachedAt(slugs: string[]): number | null {
  const store = read();
  const times = slugs.map((s) => store[s]?.cachedAt).filter((t): t is number => typeof t === 'number');
  return times.length ? Math.min(...times) : null;
}

export function saveCities(cities: Destination[], now = Date.now()): void {
  if (cities.length === 0) return;
  const store = read();
  for (const city of cities) if (city?.slug) store[city.slug] = { city, cachedAt: now };
  write(capped(store));
}

/** Oldest go out first when the ceiling is exceeded */
function capped(store: Store): Store {
  const entries = Object.entries(store);
  if (entries.length <= MAX_CITIES) return store;
  const keep = entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt).slice(0, MAX_CITIES);
  return Object.fromEntries(keep);
}

/**
 * Keeps only cities the slug list contains. Called with the saved trips'
 * cities, so deleting a trip also frees its content - "we do not cache the
 * catalog" is a rule that must be enforced, not just declared.
 */
export function pruneCities(keepSlugs: string[]): void {
  const keep = new Set(keepSlugs);
  const store = read();
  let changed = false;
  for (const slug of Object.keys(store)) {
    if (!keep.has(slug)) {
      delete store[slug];
      changed = true;
    }
  }
  if (changed) write(store);
}

/** How much space this actually takes, in bytes (UTF-16, as localStorage counts) */
export function storageBytes(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return (window.localStorage.getItem(KEY)?.length ?? 0) * 2;
  } catch {
    return 0;
  }
}

/** For tests only */
export function __clearCityStore(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
