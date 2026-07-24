'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Place } from '@/lib/types';
import PlacesMap from '@/components/PlacesMap';

export interface KosherCity {
  slug: string;
  name: string;
  nameLocal: string;
  flag: string;
  center: { lat: number; lng: number };
  zoom: number;
  kosherOverview: string;
  kosherPlaces: Place[];
}

// כינויים נפוצים בעברית שלא מופיעים ב-name/nameLocal - כדי שחיפוש "וינה"
// וגם "וינא" ימצאו את אותה עיר. לא רשימה ממצה - רק תקלות איות שכיחות.
const ALIASES: Record<string, string[]> = {
  vienna: ['וינא'],
  prague: ["פראג'"],
  rome: ['רום'],
  bangkok: ['באנגקוק'],
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/['׳״]/g, '');
}

function matches(city: KosherCity, query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  const haystacks = [city.name, city.nameLocal, city.slug, ...(ALIASES[city.slug] ?? [])];
  return haystacks.some((h) => normalize(h).includes(q));
}

export default function KosherSearch({ cities }: { cities: KosherCity[] }) {
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [searchedEmpty, setSearchedEmpty] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (!query.trim() || selectedSlug) return [];
    return cities.filter((c) => matches(c, query)).slice(0, 6);
  }, [cities, query, selectedSlug]);

  const selected = cities.find((c) => c.slug === selectedSlug) ?? null;

  const pickCity = (slug: string) => {
    const city = cities.find((c) => c.slug === slug);
    setSelectedSlug(slug);
    setQuery(city?.name ?? '');
    setSearchedEmpty(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const exact = cities.find((c) => matches(c, q));
    if (exact) {
      pickCity(exact.slug);
    } else {
      setSelectedSlug(null);
      setSearchedEmpty(q);
    }
  };

  const onChange = (v: string) => {
    setQuery(v);
    setSelectedSlug(null);
    setSearchedEmpty(null);
  };

  return (
    <div className="mt-6">
      <form onSubmit={onSubmit} className="relative max-w-md">
        <input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="שם עיר, למשל: וינה, בנגקוק..."
          className="w-full rounded-2xl border border-night/15 bg-shell px-5 py-3.5 text-night shadow-inner outline-none transition placeholder:text-night/45 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
        />
        {suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-shell shadow-[var(--shadow-pop)] ring-1 ring-night/10">
            {suggestions.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => pickCity(c.slug)}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-start transition hover:bg-sunset/5"
              >
                <span className="text-lg">{c.flag}</span>
                <span className="font-semibold text-night">{c.name}</span>
                <span className="text-xs text-night/40">{c.nameLocal}</span>
                <span className="ms-auto text-xs font-semibold text-night/40">
                  {c.kosherPlaces.length} מקומות כשרים
                </span>
              </button>
            ))}
          </div>
        )}
      </form>

      {selected && (
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="display text-2xl text-night">
              <span className="me-2">{selected.flag}</span>
              {selected.name}
            </h2>
            <span className="text-sm text-night/40">{selected.nameLocal}</span>
            <Link
              href={`/destinations/${selected.slug}`}
              className="ms-auto text-sm font-bold text-sunset-deep transition hover:underline"
            >
              לדף היעד המלא ←
            </Link>
          </div>
          <p className="mt-2 max-w-2xl leading-relaxed text-night/70">{selected.kosherOverview}</p>

          {selected.kosherPlaces.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-zest/10 px-5 py-4 text-sm font-semibold text-night/70">
              עדיין אין לנו מידע כשרות מאומת לעיר הזו.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-5">
              <div className="h-[360px] overflow-hidden rounded-2xl ring-1 ring-night/10 lg:col-span-2 lg:h-auto">
                <PlacesMap center={selected.center} zoom={selected.zoom} places={selected.kosherPlaces} />
              </div>
              <div className="space-y-3 lg:col-span-3">
                {selected.kosherPlaces.map((place) => (
                  <div key={place.id} className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10">
                    <div className="font-bold text-night">{place.name}</div>
                    <div className="text-xs font-medium text-night/40">{place.nameLocal}</div>
                    <p className="mt-2 text-sm leading-relaxed text-night/70">{place.description}</p>
                    {place.kosherNote && (
                      <p className="mt-2 rounded-lg bg-[#00a896]/10 px-3 py-2 text-xs font-semibold text-[#007f76]">
                        ✡️ {place.kosherNote}
                      </p>
                    )}
                    {place.kosherVerification && (
                      <p
                        className={`mt-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          place.kosherVerification.lastChecked === 'pending-review'
                            ? 'bg-zest/15 text-night/70'
                            : 'bg-[#00a896]/10 text-[#007f76]'
                        }`}
                      >
                        {place.kosherVerification.lastChecked === 'pending-review'
                          ? `לאמת לפני נסיעה · ${place.kosherVerification.supervision}`
                          : `נבדק ${place.kosherVerification.lastChecked} · ${place.kosherVerification.supervision}`}
                      </p>
                    )}
                    {place.externalUrl && (
                      <a
                        href={place.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs font-semibold text-sunset-deep transition hover:underline"
                      >
                        Google Maps ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {searchedEmpty && (
        <div className="mt-8 max-w-md rounded-2xl bg-zest/10 px-5 py-5">
          <p className="font-bold text-night">עדיין אין לנו מידע כשרות מאומת ל"{searchedEmpty}"</p>
          <p className="mt-1.5 text-sm leading-relaxed text-night/70">
            הקטלוג שלנו מכסה בינתיים {cities.length} יעדים. אפשר לנסות עיר אחרת, או{' '}
            <Link href="/countries" className="font-semibold text-sunset-deep hover:underline">
              לעיין בקטלוג המלא
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
