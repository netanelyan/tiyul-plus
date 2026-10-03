'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { daysHe } from '@/lib/duration';
import { inHe } from '@/lib/hebrew';
import type { CityTripCard } from '@/app/api/trips/city/route';

/**
 * "Travellers' trips" - the latest published trips for one city, on its
 * destination page.
 *
 * ## Why it fetches instead of rendering on the server
 *
 * `/destinations/<slug>` is prerendered at build time (SSG, all 170 of them).
 * A server component here would therefore be frozen at the build: a trip
 * published on Tuesday would not show up until the next deploy. Putting the
 * catalog on ISR to fix that would change the caching of 170 pages which are
 * currently as fast as a page gets, to serve a block most of them will not have
 * a single row for. So the pages stay static and this one block arrives after.
 *
 * ## It renders nothing when there is nothing
 *
 * No heading, no skeleton, no "be the first to publish". Until the fetch returns
 * rows the component is `null`, so a city with no published trips is byte-for-
 * byte the page it was before this feature existed - no layout shift, no empty
 * promise on 170 pages.
 *
 * ## Only indexable trips appear
 *
 * The SQL filters on `indexable`, i.e. the same eight-stop bar the published
 * page's own robots tag uses. A thin trip is reachable by its link and is not
 * promoted into the internal link graph, which is what stops this becoming a
 * farm of two-stop pages linking to each other.
 */
export default function PublicTripsForCity({
  citySlug,
  cityName,
}: {
  citySlug: string;
  cityName: string;
}) {
  const [trips, setTrips] = useState<CityTripCard[]>([]);

  useEffect(() => {
    let live = true;
    const ac = new AbortController();
    fetch(`/api/trips/city?city=${encodeURIComponent(citySlug)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : { trips: [] }))
      .then((d: { trips?: CityTripCard[] }) => {
        if (live && Array.isArray(d.trips) && d.trips.length) setTrips(d.trips);
      })
      .catch(() => {
        /* A city page must not break because this block could not load. */
      });
    return () => {
      live = false;
      ac.abort();
    };
  }, [citySlug]);

  if (trips.length === 0) return null;

  /*
    Through `inHe`, never a prefix letter written beside `{cityName}`. The
    repo-wide guard only sees the template-literal form, so JSX is where this bug
    survives - and it is the same bug: a prefix doubles a word-initial vav, so
    Vienna is spelled differently from how concatenation spells it.
  */
  const inCity = inHe(cityName);

  return (
    <section className="mx-auto mt-10 max-w-5xl px-4">
      <h2 className="display text-2xl text-night">טיולים של מטיילים {inCity}</h2>
      <p className="mt-1 text-sm leading-relaxed text-night/70">
        מסלולים אמיתיים שאנשים בנו כאן ובחרו לפרסם. אפשר לשכפל כל אחד מהם ולשנות אותו
        לפי מה שמתאים לכם.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/trips/${t.slug}`}
              className="card-pop flex h-full flex-col rounded-2xl bg-shell p-4 ring-1 ring-night/10 transition hover:ring-night/25"
            >
              <p className="text-sm font-extrabold text-night">
                {daysHe(t.dayCount)} {inCity}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-night/65">
                {t.stopCount} עצירות{t.month ? ` · ${t.month}` : ''}
              </p>
              {t.topPlaces.length > 0 && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-night/70">
                  {t.topPlaces.join(' · ')}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
