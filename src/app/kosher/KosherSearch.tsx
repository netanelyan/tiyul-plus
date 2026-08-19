'use client';

import { outboundAttrs, placeMapUrl } from '@/lib/outbound';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Place } from '@/lib/types';
import PlacesMap from '@/components/PlacesMap';
import Flag from '@/components/Flag';
import CardPhoto from '@/components/CardPhoto';
import KosherBadge from '@/components/KosherBadge';
import KosherNote from '@/components/KosherNote';

export interface KosherCity {
  slug: string;
  name: string;
  nameLocal: string;
  flag: string;
  country: string;
  photo?: string;
  center: { lat: number; lng: number };
  zoom: number;
  kosherOverview: string;
  kosherPlaces: Place[];
}

// Common Hebrew aliases that do not appear in name/nameLocal - so that both the correct
// spelling and a common misspelling find the same city. Not an exhaustive list - only
// frequent spelling slips.
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
  const haystacks = [city.name, city.nameLocal, city.slug, city.country, ...(ALIASES[city.slug] ?? [])];
  return haystacks.some((h) => normalize(h).includes(q));
}

/** "2 restaurants - one shop" - what the city actually has, by the categories in the data */
function breakdown(places: Place[]): string {
  const food = places.filter((p) => p.category === 'kosher-food').length;
  const market = places.filter((p) => p.category === 'kosher-market').length;
  const parts: string[] = [];
  if (food) parts.push(food === 1 ? 'מסעדה אחת' : `${food} מסעדות`);
  if (market) parts.push(market === 1 ? 'חנות אחת' : `${market} חנויות`);
  return parts.join(' · ');
}

export default function KosherSearch({ cities }: { cities: KosherCity[] }) {
  const [query, setQuery] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Only cities that genuinely have kosher records in the data - we do not invent coverage
  const covered = useMemo(
    () =>
      cities
        .filter((c) => c.kosherPlaces.length > 0)
        .sort((a, b) => b.kosherPlaces.length - a.kosherPlaces.length || a.name.localeCompare(b.name, 'he')),
    [cities],
  );

  const stats = useMemo(() => {
    const all = covered.flatMap((c) => c.kosherPlaces);
    return {
      places: all.length,
      cities: covered.length,
      citiesWithout: cities.length - covered.length,
    };
  }, [cities, covered]);

  // Live filtering of the grid while typing
  const filtered = useMemo(() => {
    if (!query.trim()) return covered;
    return covered.filter((c) => matches(c, query));
  }, [covered, query]);

  // A search that found no covered city - but the city may exist in the catalog with no kashrut data
  const uncoveredMatch = useMemo(() => {
    if (!query.trim() || filtered.length > 0) return null;
    return cities.find((c) => c.kosherPlaces.length === 0 && matches(c, query)) ?? null;
  }, [cities, filtered.length, query]);

  const selected = covered.find((c) => c.slug === selectedSlug) ?? null;

  return (
    <div className="mt-5">
      {/* ---- A row of real numbers from the data ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge rounded-full bg-lagoon/12 px-3.5 py-1.5 text-sm font-bold text-lagoon-deep">
          ✡️ {stats.places} מקומות כשרים
        </span>
        <span className="badge rounded-full bg-night/5 px-3.5 py-1.5 text-sm font-bold text-night/70">
          🌍 {stats.cities} ערים בקטלוג
        </span>
        <span className="badge rounded-full bg-night/5 px-3.5 py-1.5 text-sm font-medium text-night/60">
          המידע נאסף ממקורות ציבוריים · לוודא מול המקום
        </span>
      </div>

      {/* ---- Search ---- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (filtered.length === 1) setSelectedSlug(filtered[0].slug);
        }}
        className="mt-4 max-w-md"
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedSlug(null);
          }}
          placeholder="חיפוש עיר או מדינה: וינה, תאילנד, בנגקוק…"
          aria-label="חיפוש עיר עם מידע כשרות"
          className="w-full rounded-2xl border border-night/15 bg-shell px-5 py-3.5 text-night shadow-inner outline-none transition placeholder:text-night/45 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
        />
      </form>

      {/* ---- The selected city: map + list ---- */}
      {selected && (
        <div className="rise-in mt-7">
          <button
            onClick={() => setSelectedSlug(null)}
            className="text-sm font-bold text-sunset-deep transition hover:underline"
          >
            → חזרה לכל הערים
          </button>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <h2 className="display text-2xl text-night">
              <Flag flag={selected.flag} label={selected.name} size="lg" className="me-2" />
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

          {/* A general disclaimer - one policy for every record */}
          <p className="mt-4 max-w-2xl rounded-xl bg-night/5 px-4 py-2.5 text-sm leading-relaxed text-night/60">
            המידע נאסף ממקורות ציבוריים (בתי חב&quot;ד וגופי ההשגחה) - לוודא כשרות, השגחה
            ושעות פתיחה מול המקום לפני שמסתמכים עליו.
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-5">
            <div className="h-[300px] overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-[360px] lg:col-span-2 lg:h-auto">
              <PlacesMap center={selected.center} zoom={selected.zoom} places={selected.kosherPlaces} />
            </div>
            <div className="space-y-3 lg:col-span-3">
              {selected.kosherPlaces.map((place) => (
                <div key={place.id} className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10">
                  <div className="font-bold text-night">{place.name}</div>
                  <div className="text-xs font-medium text-night/40">{place.nameLocal}</div>
                  <p className="mt-2 text-sm leading-relaxed text-night/70">{place.description}</p>
                  <KosherNote note={place.kosherNote} className="mt-2" />
                  <KosherBadge kashrut={place.kashrut} className="mt-1.5" />
                  {placeMapUrl(place) ? (
                    <a
                      href={placeMapUrl(place)!}
                      {...outboundAttrs()}
                      className="mt-3 inline-block text-xs font-semibold text-sunset-deep transition hover:underline"
                    >
                      Google Maps ↗
                    </a>
                  ) : (
                    <span className="mt-3 block text-xs font-semibold text-night/35">מיקום לא אומת</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- The default: the city directory (also the live search results) ---- */}
      {!selected && (
        <div className="mt-7">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-sm font-bold text-night/50">
              {query.trim() ? `תוצאות עבור "${query.trim()}"` : 'ערים עם מידע כשרות'} ({filtered.length})
            </h2>
            {!query.trim() && stats.citiesWithout > 0 && (
              <span className="text-xs font-medium text-night/40">
                · ב-{stats.citiesWithout} יעדים נוספים בקטלוג אין מידע כשרות, וזה נאמר בדף היעד
              </span>
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((city) => (
                <button
                  key={city.slug}
                  onClick={() => setSelectedSlug(city.slug)}
                  className="card-pop group overflow-hidden rounded-2xl bg-shell text-start ring-1 ring-night/10 transition hover:ring-sunset/40"
                >
                  <CardPhoto
                    photo={city.photo}
                    className="photo-bg relative h-20 sm:h-24"
                    sizes="(min-width: 640px) 30vw, 46vw"
                    overlay="linear-gradient(180deg, rgba(15,14,26,0.1) 0%, rgba(15,14,26,0.72) 100%)"
                  >
                    <span className="absolute end-2 top-2 rounded-full bg-lagoon px-2 py-0.5 text-[11px] font-bold text-white shadow">
                      {city.kosherPlaces.length}
                    </span>
                    <Flag
                      flag={city.flag}
                      label={city.name}
                      size="md"
                      className="absolute bottom-1.5 start-2 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
                    />
                  </CardPhoto>
                  <div className="p-3">
                    <div className="truncate font-bold text-night">{city.name}</div>
                    <div className="truncate text-xs font-medium text-night/45">{city.country}</div>
                    <div className="mt-1.5 truncate text-xs font-semibold text-lagoon-deep">
                      ✡️ {breakdown(city.kosherPlaces)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* An honest empty state: either the city is in the catalog with no kashrut, or it is not in the catalog at all */
            <div className="mt-4 max-w-xl rounded-2xl bg-zest/15 px-5 py-5 ring-1 ring-zest/40">
              <p className="font-bold text-night">
                עדיין אין לנו מידע כשרות ל&quot;{query.trim()}&quot;
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-night/70">
                {uncoveredMatch ? (
                  <>
                    {uncoveredMatch.name} נמצאת בקטלוג שלנו, אבל לא אותרה בה תשתית כשרות - ובדף היעד
                    כתוב בדיוק מה המצב שם.{' '}
                    <Link
                      href={`/destinations/${uncoveredMatch.slug}`}
                      className="font-semibold text-sunset-deep hover:underline"
                    >
                      לדף היעד ←
                    </Link>
                  </>
                ) : (
                  <>
                    הכשרות בקטלוג מכסה בינתיים {stats.cities} ערים. אפשר לנסות עיר אחרת, לנקות את
                    החיפוש כדי לראות את כולן, או{' '}
                    <Link href="/countries" className="font-semibold text-sunset-deep hover:underline">
                      לעיין בקטלוג היעדים
                    </Link>
                    .
                  </>
                )}
              </p>
              {query.trim() && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
                >
                  הצגת כל הערים
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
