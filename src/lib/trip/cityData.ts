'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Destination } from '@/lib/types';
import { saveCities, storedCities } from './cityStore';

/**
 * The client-side city cache: downloads from `/api/cities` only the cities the trip
 * actually touches, and keeps them for the whole lifetime of the tab.
 *
 * **The problem this solves, in numbers.** `TripWorkspace` imported the whole catalog
 * statically, so `/chat` and `/planner` downloaded 492kB compressed (2MB uncompressed)
 * in order to draw a trip of one to six cities. One city costs about 7kB.
 *
 * **Why a module-level cache and not state:** the user switches between `/chat` and
 * `/planner`, between trips, and between days - and with no cache every such switch
 * would be another network request for exactly the same data. The data is static per
 * deploy, so there is no reason to ask for it twice.
 */
const cache = new Map<string, Destination>();
const inflight = new Map<string, Promise<unknown>>();
/** A slug the server returned nothing for - so we do not retry it in a loop */
const missing = new Set<string>();

/**
 * The in-memory cache is loaded once from disk (`cityStore`), so opening the app
 * **with no network** draws the trip immediately instead of getting stuck on loading.
 * That is also what makes "loading" a short and honest state: if the city is already
 * saved there is no wait at all, even when there is a network.
 */
let hydrated = false;
function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  for (const [slug, city] of Object.entries(storedCities())) if (!cache.has(slug)) cache.set(slug, city);
}

export function cachedCity(slug: string): Destination | undefined {
  hydrate();
  return cache.get(slug);
}

/** For tests only: a module-level cache survives between tests and fakes results */
export function __resetCityCache(): void {
  cache.clear();
  inflight.clear();
  missing.clear();
  hydrated = false;
}

export async function fetchCities(slugs: string[]): Promise<Destination[]> {
  hydrate();
  const need = [...new Set(slugs)].filter((s) => s && !cache.has(s) && !missing.has(s));
  const waits = need.map((s) => inflight.get(s)).filter(Boolean) as Promise<unknown>[];
  const toFetch = need.filter((s) => !inflight.has(s));

  if (toFetch.length > 0) {
    const p = fetch(`/api/cities?slugs=${encodeURIComponent(toFetch.join(','))}`)
      .then((r) => (r.ok ? r.json() : { cities: [] }))
      .then((data: { cities?: Destination[] }) => {
        const got = (data.cities ?? []).filter((c) => c?.slug);
        for (const c of got) cache.set(c.slug, c);
        // To disk, so the trip opens with no network. Only what was actually requested
        // for a trip is stored - `pruneCities` later deletes whatever no longer belongs to any trip.
        saveCities(got);
        // Whatever did not come back does not exist in the catalog (or failed); mark it so we do not retry
        for (const s of toFetch) if (!cache.has(s)) missing.add(s);
      })
      .catch(() => {
        // The network failed: we do **not** mark it missing, so the next attempt works
        for (const s of toFetch) inflight.delete(s);
      })
      .finally(() => {
        for (const s of toFetch) inflight.delete(s);
      });
    for (const s of toFetch) inflight.set(s, p);
    waits.push(p);
  }

  await Promise.all(waits);
  return slugs.map((s) => cache.get(s)).filter((d): d is Destination => Boolean(d));
}

export interface CityData {
  cities: Record<string, Destination>;
  /** true only during the first wait, while no city is in hand yet - see the usage */
  loading: boolean;
}

export function useCityData(slugs: string[]): CityData {
  // A stable key: a new array on every render must not re-trigger the effect
  const key = useMemo(() => [...new Set(slugs)].filter(Boolean).sort().join(','), [slugs]);
  const [, bump] = useState(0);

  useEffect(() => {
    hydrate();
    const list = key ? key.split(',') : [];
    if (list.length === 0) return;
    if (list.every((s) => cache.has(s) || missing.has(s))) return;
    let alive = true;
    void fetchCities(list).then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return useMemo(() => {
    hydrate();
    const list = key ? key.split(',') : [];
    const cities: Record<string, Destination> = {};
    for (const s of list) {
      const c = cache.get(s);
      if (c) cities[s] = c;
    }
    // "Loading" = there are cities to request and none of them is in hand yet. Once
    // even one is, we keep drawing, so adding a city mid-conversation does not blank the screen.
    const known = list.filter((s) => cache.has(s) || missing.has(s)).length;
    return { cities, loading: list.length > 0 && known === 0 };
  }, [key, cache.size, missing.size]);
}
