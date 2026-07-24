'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Country, Destination, PlaceCategory } from '@/lib/types';
import { categoryMeta, isKosher } from '@/lib/categories';
import PlacesMap from '@/components/PlacesMap';
import AddToTripButton from '@/components/AddToTripButton';

type Filter = 'all' | 'kosher' | PlaceCategory;

export default function DestinationClient({
  dest,
  country,
}: {
  dest: Destination;
  country: Country;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const usedCategories = useMemo(
    () => [...new Set(dest.places.map((p) => p.category))],
    [dest.places],
  );

  const visiblePlaces = useMemo(() => {
    if (filter === 'all') return dest.places;
    if (filter === 'kosher') return dest.places.filter((p) => isKosher(p.category));
    return dest.places.filter((p) => p.category === filter);
  }, [dest.places, filter]);

  // עירוני מהיעד, מדינתי מהמדינה - למשתמש זה כרטיס אחד רציף.
  const practicalItems: { title: string; text: string }[] = [
    { title: 'טיסות מנתב"ג', text: dest.practical.flights },
    { title: 'ויזה', text: country.practical.visa },
    { title: 'מטבע', text: country.practical.currency },
    { title: 'סים וגלישה', text: country.practical.sim },
    { title: 'תשלומים', text: country.practical.payments },
    { title: 'תחבורה', text: dest.practical.gettingAround },
  ];

  return (
    <div>
      {/* Photo banner */}
      <div
        className="photo-bg relative overflow-hidden rounded-2xl px-6 py-10 sm:px-10"
        style={
          dest.photo
            ? {
                backgroundImage: `linear-gradient(200deg, rgba(18,16,32,0.4) 0%, rgba(18,16,32,0.8) 85%), url(${dest.photo})`,
              }
            : undefined
        }
      >
        <div className="text-sm font-medium text-cream/70">
          <Link href="/" className="transition hover:text-cream">יעדים</Link> /{' '}
          <Link href={`/countries/${country.slug}`} className="transition hover:text-cream">
            {country.name}
          </Link>{' '}
          / {dest.name}
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="display text-3xl text-cream sm:text-4xl">
              <span className="me-2 align-middle text-3xl">{dest.flag}</span>
              {dest.name}
              <span className="ms-3 text-lg font-medium text-cream/60">{dest.nameLocal}</span>
            </h1>
            <p className="mt-4 leading-relaxed text-cream/90">{dest.summary}</p>
            <div className="mt-3 text-sm font-medium text-cream/80">
              עונה מומלצת: {dest.bestSeason}
            </div>
            {dest.editorialRating && (
              <div className="mt-3 inline-flex flex-col gap-0.5 rounded-xl bg-cream/10 px-3 py-2 ring-1 ring-cream/20">
                <div className="text-sm font-bold text-cream">
                  המלצת הצוות: {dest.editorialRating.score.toFixed(1)}/5
                </div>
                <div className="text-xs text-cream/70">{dest.editorialRating.verdict}</div>
                <div className="text-[11px] text-cream/45">
                  דירוג עריכתי של צוות טיול+ - לא ממוצע של ביקורות משתמשים
                </div>
              </div>
            )}
          </div>
          <Link
            href={`/planner?dest=${dest.slug}`}
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
          >
            למסלול המלא ({dest.itinerary.length} ימים) ←
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          הכול ({dest.places.length})
        </FilterChip>
        <FilterChip active={filter === 'kosher'} onClick={() => setFilter('kosher')}>
          רק כשר ({dest.places.filter((p) => isKosher(p.category)).length})
        </FilterChip>
        {usedCategories.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {categoryMeta[c].label}
          </FilterChip>
        ))}
      </div>

      {/* Map + list */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="h-[420px] overflow-hidden rounded-2xl ring-1 ring-night/10 lg:col-span-3 lg:h-[560px]">
          <PlacesMap
            center={dest.center}
            zoom={dest.zoom}
            places={visiblePlaces}
            highlightId={highlightId}
          />
        </div>
        <div className="max-h-[560px] space-y-3 overflow-y-auto pe-1 lg:col-span-2">
          {visiblePlaces.map((place) => {
            const meta = categoryMeta[place.category];
            return (
              <div
                key={place.id}
                onMouseEnter={() => setHighlightId(place.id)}
                onMouseLeave={() => setHighlightId(null)}
                className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10"
              >
                <div className="flex gap-3">
                  {place.photo && (
                    <div
                      className="photo-bg h-20 w-20 shrink-0 rounded-xl ring-1 ring-night/10"
                      style={{ backgroundImage: `url(${place.photo})` }}
                      role="img"
                      aria-label={place.name}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-night">
                          {place.mustSee && (
                            <span className="me-1 text-sm text-zest" title="חובה לראות">
                              ★
                            </span>
                          )}
                          {place.name}
                        </div>
                        <div className="text-xs font-medium text-night/40">{place.nameLocal}</div>
                      </div>
                      <span className="badge shrink-0 rounded-full bg-night/5 px-2.5 py-1 text-xs font-semibold text-night/60">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-night/70">{place.description}</p>
                  </div>
                </div>
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
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-night/50">
                  <AddToTripButton citySlug={dest.slug} placeId={place.id} />
                  {place.rating && <span>⭐ {place.rating.toFixed(1)}</span>}
                  {place.priceLevel !== undefined && (
                    <span title="רמת מחיר">
                      {place.priceLevel === 0 ? 'חינם' : '₪'.repeat(place.priceLevel)}
                    </span>
                  )}
                  {place.durationMin && (
                    <span>כ-{Math.round(place.durationMin / 30) / 2} שעות</span>
                  )}
                  {place.externalUrl && (
                    <a
                      href={place.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sunset-deep transition hover:underline"
                    >
                      Google Maps ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kosher overview */}
      <section className="mt-12 rounded-2xl bg-shell p-7 ring-1 ring-night/10">
        <h2 className="text-lg font-bold text-night">מצב הכשרות ב{dest.name}</h2>
        <p className="mt-2 leading-relaxed text-night/75">{dest.practical.kosherOverview}</p>
      </section>

      {/* Practical info */}
      <section className="mt-12">
        <h2 className="display text-2xl text-night">מידע פרקטי לישראלים</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practicalItems.map((item) => (
            <div key={item.title} className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10">
              <div className="font-bold text-night">{item.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-night/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const style = active
    ? 'bg-sunset text-cream'
    : 'bg-shell text-night/60 ring-1 ring-night/10 hover:ring-night/25';
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${style}`}
    >
      {children}
    </button>
  );
}
