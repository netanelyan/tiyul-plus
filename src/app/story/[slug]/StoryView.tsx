'use client';

import type { StorySnapshot } from '@/lib/server/stories';
import PlacesMap from '@/components/PlacesMap';
import type { Place } from '@/lib/types';

/**
 * The trip story view - read only, presentable, shareable. The route on a map, the days
 * as a narrative timeline, and the photos the travellers uploaded as a gallery. All of it
 * from the snapshot - never a read of the live trip.
 */
export default function StoryView({
  title,
  snapshot,
  photos,
}: {
  title: string;
  snapshot: StorySnapshot;
  photos: { url: string; caption: string | null }[];
}) {
  // Map pins: every stop of every day. A minimal Place is enough for PlacesMap.
  const mapPlaces: Place[] = snapshot.days.flatMap((d, di) =>
    d.stops.map((s, si) => ({
      id: `story-${di}-${si}`,
      name: s.name,
      nameLocal: s.name,
      category: 'attraction' as const,
      lat: s.lat,
      lng: s.lng,
      description: '',
    })),
  );

  const totalStops = mapPlaces.length;
  const cities = [...new Set(snapshot.days.map((d) => d.cityName))];

  // Map centre: the mean of the stops. The internal FitBounds adjusts the view anyway.
  const center = mapPlaces.length
    ? {
        lat: mapPlaces.reduce((s, p) => s + p.lat, 0) / mapPlaces.length,
        lng: mapPlaces.reduce((s, p) => s + p.lng, 0) / mapPlaces.length,
      }
    : { lat: 0, lng: 0 };

  return (
    <div className="rise-in mx-auto max-w-3xl pb-16">
      {/* The story title */}
      <header className="rounded-3xl bg-night px-6 py-10 text-center text-cream">
        <p className="text-xs font-bold text-zest">סיפור טיול · טיול+</p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm font-semibold text-cream/70">
          {snapshot.days.length} ימים · {totalStops} עצירות · {cities.join(' · ')}
        </p>
      </header>

      {/* The route on the map */}
      {mapPlaces.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-night/10">
          <PlacesMap places={mapPlaces} center={center} zoom={11} className="h-72 sm:h-96" />
        </div>
      )}

      {/* The days - the narrative timeline */}
      <ol className="mt-8 space-y-4">
        {snapshot.days.map((d) => (
          <li key={d.dayNumber} className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
            <h2 className="text-sm font-bold text-night">
              יום {d.dayNumber} · {d.cityName}
            </h2>
            {d.stops.length > 0 ? (
              <ol className="mt-2 space-y-1 text-sm text-night/75">
                {d.stops.map((s, i) => (
                  <li key={i}>
                    {i + 1}. {s.name}
                    {s.mustSee && <span className="text-zest"> ★</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-sm text-night/45">יום חופשי</p>
            )}
          </li>
        ))}
      </ol>

      {/* The gallery */}
      {photos.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-2xl text-night">רגעים מהטיול</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <figure key={i} className="overflow-hidden rounded-2xl ring-1 ring-night/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? `תמונה ${i + 1} מהטיול`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
                {p.caption && (
                  <figcaption className="bg-shell px-3 py-2 text-xs font-semibold text-night/70">
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* A quiet invitation - the viewer is the next user */}
      <div className="mt-12 rounded-3xl bg-sunset/10 p-6 text-center ring-1 ring-sunset/25">
        <p className="text-sm font-bold text-night">הטיול הזה תוכנן עם טיול+</p>
        <p className="mt-1 text-xs font-semibold text-night/60">
          סוכן AI שבונה טיול אמיתי על מפה, בעברית - בחינם.
        </p>
        <a
          href="/chat"
          className="mt-4 inline-block rounded-xl bg-sunset px-5 py-2.5 text-sm font-bold text-cream transition hover:bg-sunset-deep"
        >
          לתכנן טיול משלכם ←
        </a>
      </div>
    </div>
  );
}
