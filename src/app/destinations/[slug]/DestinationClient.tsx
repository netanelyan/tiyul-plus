'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Destination, PlaceCategory } from '@/lib/types';
import { categoryMeta, isKosher } from '@/lib/categories';
import PlacesMap from '@/components/PlacesMap';
import AddToTripButton from '@/components/AddToTripButton';

type Filter = 'all' | 'kosher' | PlaceCategory;

export default function DestinationClient({ dest }: { dest: Destination }) {
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

  const practicalItems: { icon: string; title: string; text: string }[] = [
    { icon: '✈️', title: 'טיסות מנתב"ג', text: dest.practical.flights },
    { icon: '🛂', title: 'ויזה', text: dest.practical.visa },
    { icon: '💶', title: 'מטבע', text: dest.practical.currency },
    { icon: '📱', title: 'סים וגלישה', text: dest.practical.sim },
    { icon: '💳', title: 'תשלומים', text: dest.practical.payments },
    { icon: '🚇', title: 'תחבורה', text: dest.practical.gettingAround },
  ];

  return (
    <div>
      {/* Photo banner */}
      <div
        className="photo-bg relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10"
        style={
          dest.photo
            ? {
                backgroundImage: `linear-gradient(200deg, rgba(36,27,77,0.45) 0%, rgba(36,27,77,0.85) 80%), url(${dest.photo})`,
              }
            : undefined
        }
      >
        <div className="text-sm font-bold text-cream/70">
          <Link href="/" className="hover:text-zest">יעדים</Link> / {dest.country}
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="display text-4xl text-cream sm:text-5xl">
              <span className="sticker inline-block rounded-2xl bg-cream px-2 py-0.5 text-3xl align-middle">
                {dest.flag}
              </span>{' '}
              {dest.name}
              <span className="ms-3 text-lg font-medium text-cream/60">{dest.nameLocal}</span>
            </h1>
            <p className="mt-4 leading-relaxed text-cream/90">{dest.summary}</p>
            <div className="mt-3 text-sm font-bold text-zest">
              🌤️ עונה מומלצת: {dest.bestSeason}
            </div>
          </div>
          <Link
            href={`/planner?dest=${dest.slug}`}
            className="rounded-2xl bg-sunset px-6 py-3 font-black text-cream shadow-lg transition hover:bg-sunset-deep"
          >
            למסלול המלא ({dest.itinerary.length} ימים) ←
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-7 flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          הכול ({dest.places.length})
        </FilterChip>
        <FilterChip active={filter === 'kosher'} onClick={() => setFilter('kosher')} accent>
          ✡️ רק כשר ({dest.places.filter((p) => isKosher(p.category)).length})
        </FilterChip>
        {usedCategories.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {categoryMeta[c].emoji} {categoryMeta[c].label}
          </FilterChip>
        ))}
      </div>

      {/* Map + list */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="h-[420px] overflow-hidden rounded-3xl shadow-sm ring-1 ring-night/10 lg:col-span-3 lg:h-[560px]">
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
                className="card-pop rounded-3xl bg-shell p-5 ring-1 ring-night/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-night">{place.name}</div>
                    <div className="text-xs font-medium text-night/40">{place.nameLocal}</div>
                  </div>
                  <span
                    className="sticker shrink-0 rounded-full px-2.5 py-1 text-xs font-black text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.emoji} {meta.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-night/70">{place.description}</p>
                {place.kosherNote && (
                  <p className="mt-2 rounded-xl bg-[#00a896]/10 px-3 py-2 text-xs font-bold text-[#007f76]">
                    ✡️ {place.kosherNote}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-night/50">
                  <AddToTripButton citySlug={dest.slug} placeId={place.id} />
                  {place.rating && <span>⭐ {place.rating.toFixed(1)}</span>}
                  {place.durationMin && (
                    <span>⏱️ כ-{Math.round(place.durationMin / 30) / 2} שעות</span>
                  )}
                  {place.externalUrl && (
                    <a
                      href={place.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sunset-deep hover:underline"
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
      <section className="mt-10 rounded-3xl bg-night p-7">
        <h2 className="display text-xl text-zest">✡️ מצב הכשרות ב{dest.name}</h2>
        <p className="mt-2 leading-relaxed text-cream/85">{dest.practical.kosherOverview}</p>
      </section>

      {/* Practical info */}
      <section className="mt-10">
        <h2 className="display text-2xl text-night">
          🇮🇱 מידע פרקטי <span className="marker">לישראלים</span>
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practicalItems.map((item) => (
            <div key={item.title} className="card-pop rounded-3xl bg-shell p-5 ring-1 ring-night/10">
              <div className="font-black text-night">
                {item.icon} {item.title}
              </div>
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
  accent = false,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = 'rounded-full px-4 py-2 text-sm font-black transition';
  const style = active
    ? accent
      ? 'bg-sunset text-cream shadow-md'
      : 'bg-night text-zest shadow-md'
    : 'bg-shell text-night/60 ring-1 ring-night/15 hover:ring-night/40';
  return (
    <button onClick={onClick} className={`${base} ${style}`}>
      {children}
    </button>
  );
}
