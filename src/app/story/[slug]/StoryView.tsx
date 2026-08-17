'use client';

import type { EnrichedSnapshot, EnrichedStop } from '@/lib/server/stories';
import PlacesMap from '@/components/PlacesMap';
import { ZoomableImage, ZoomablePhoto } from '@/components/PhotoLightbox';
import { categoryMeta } from '@/lib/categories';
import type { Place } from '@/lib/types';

/**
 * The trip story view - read only, presentable, shareable. The route on a map, the days
 * as a narrative timeline with a photo and a description per stop, and the photos the
 * travellers uploaded as a gallery.
 *
 * The trip itself comes entirely from the snapshot - never a read of the live trip. The
 * place photos and descriptions are attached to it on the server (`enrichSnapshot`), so
 * the catalog never reaches the browser; see the note there for why they are resolved
 * rather than frozen into the snapshot.
 */

/** The shape PlaceThumb and the map need, built from a snapshot stop. */
function asPlace(s: EnrichedStop, key: string): Place {
  return {
    id: key,
    name: s.name,
    nameLocal: s.name,
    category: s.category,
    lat: s.lat,
    lng: s.lng,
    description: s.description ?? '',
    ...(s.photo ? { photo: s.photo } : {}),
    ...(s.mustSee ? { mustSee: true } : {}),
  };
}

export default function StoryView({
  title,
  snapshot,
  photos,
}: {
  title: string;
  snapshot: EnrichedSnapshot;
  photos: { url: string; caption: string | null }[];
}) {
  // Map pins: every stop of every day. Carrying the real category and photo means the
  // map draws each pin in its category colour, and shows the place photo above the pin
  // once zoomed into a city - the same treatment as the planning screen.
  const mapPlaces: Place[] = snapshot.days.flatMap((d, di) =>
    d.stops.map((s, si) => asPlace(s, `story-${di}-${si}`)),
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

      {/* The route on the map.

          The height belongs to the WRAPPER, not to a className on the map.
          MapInner renders its container as `h-full w-full {className}`, so a
          height passed in competes with `h-full` and loses on whichever Tailwind
          emits last: `sm:h-96` happened to win on desktop while `h-72` lost on
          mobile, so the map measured 0px tall on a phone - which is how most
          people open a shared story. Measured at 390: 0px before, 288px after. */}
      {mapPlaces.length > 0 && (
        <div className="mt-6 h-72 overflow-hidden rounded-3xl ring-1 ring-night/10 sm:h-96">
          <PlacesMap places={mapPlaces} center={center} zoom={11} />
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
              <ol className="mt-3 space-y-3">
                {d.stops.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-night/5 text-xs font-bold text-night/70">
                      {i + 1}
                    </span>
                    <ZoomablePhoto
                      place={asPlace(s, `d${d.dayNumber}-${i}`)}
                      className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-night">
                        {s.name}
                        {s.mustSee && (
                          <span className="ms-1.5 text-sm text-zest" title="חובה לראות">
                            ★
                          </span>
                        )}
                        <span className="ms-2 whitespace-nowrap text-xs font-medium text-night/45">
                          {categoryMeta[s.category].label}
                        </span>
                      </p>
                      {s.description && (
                        <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-night/65">
                          {s.description}
                        </p>
                      )}
                    </div>
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
                {/* The travellers' own photos are full-size uploads, so enlarging
                    them is a genuine zoom rather than a bigger thumbnail. */}
                <ZoomableImage
                  src={p.url}
                  alt={p.caption ?? `תמונה ${i + 1} מהטיול`}
                  caption={p.caption ?? undefined}
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
