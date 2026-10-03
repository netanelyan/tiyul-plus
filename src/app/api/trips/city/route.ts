import { NextResponse } from 'next/server';
import { listPublicTripsForCity } from '@/lib/server/publicTrips';
import { monthLabel } from '@/lib/trip/publicTrip';
import { sharePreview } from '@/lib/trip/sharePreview';

/**
 * The published trips for one city, as display-ready rows.
 *
 * ## Why this route exists at all
 *
 * `/destinations/<slug>` is **SSG** - all 170 of them are prerendered at build
 * time. A server component reading the database there would be frozen at the
 * moment of the build, so a trip published on Tuesday would not appear until the
 * next deploy. The alternatives were to put the whole catalog on ISR (changing
 * the caching of 170 pages that are currently as fast as they can be) or to
 * fetch this one block from the client. This is the second.
 *
 * ## It returns rendered facts, not the snapshot
 *
 * `sharePreview` needs the catalog, which must never reach a browser bundle, so
 * the derivation happens here and the response carries only what the card
 * prints. That also means the public snapshot itself is never exposed over an
 * API - one less shape to keep an eye on.
 *
 * Public and read-only: these rows are already on indexable pages, so there is
 * nothing here that is not meant to be seen. No caller identity is involved.
 */

export const dynamic = 'force-dynamic';

/** The same shape `/destinations/<slug>` renders. Catalog-free, safe for the client. */
export interface CityTripCard {
  slug: string;
  dayCount: number;
  stopCount: number;
  /** Hebrew month name, or null. Never a date. */
  month: string | null;
  /** Up to three catalog place names. */
  topPlaces: string[];
}

const SLUG = /^[a-z0-9-]{1,80}$/;

export async function GET(request: Request) {
  const citySlug = new URL(request.url).searchParams.get('city')?.trim() ?? '';
  if (!SLUG.test(citySlug)) {
    return NextResponse.json({ trips: [] as CityTripCard[] }, { status: 400 });
  }

  const rows = await listPublicTripsForCity(citySlug, 6);
  const trips: CityTripCard[] = rows.map((t) => {
    const preview = sharePreview({ name: '', days: t.snapshot.days });
    return {
      slug: t.slug,
      dayCount: t.dayCount,
      stopCount: t.stopCount,
      month: monthLabel(t.snapshot.month),
      topPlaces: preview.topPlaces.slice(0, 3),
    };
  });

  return NextResponse.json(
    { trips },
    {
      headers: {
        // Held at the edge for a few minutes. A trip published now appearing on
        // the city page within five minutes is well inside what anyone expects,
        // and it keeps this off the origin for the overwhelming majority of hits.
        'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
