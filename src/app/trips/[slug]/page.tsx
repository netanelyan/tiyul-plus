import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { destinations } from '@/data/destinations';
import { canonical } from '@/lib/seo/site';
import { breadcrumbLd, touristTripLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { getPublicTrip } from '@/lib/server/publicTrips';
import { monthLabel } from '@/lib/trip/publicTrip';
import { sharePreview } from '@/lib/trip/sharePreview';
import PublicTripView from './PublicTripView';
import type { Destination, Place } from '@/lib/types';

/**
 * `/trips/<slug>` - a traveller's trip, published by its owner, open to anyone
 * and offered to search engines.
 *
 * ## What this page is allowed to contain
 *
 * Only what `lib/trip/publicTrip.ts` lets through: catalog city slugs, catalog
 * place ids and a month. Everything the reader sees - names, descriptions,
 * photos, coordinates, the day summaries, the spend - is looked up **here**,
 * from the catalog, at render time. No string the owner typed reaches this file,
 * which is why the page can be indexed without a privacy review per trip.
 *
 * ## Three states, and 410 is not one of them
 *
 * Live renders. Missing calls `notFound()`. **Withdrawn is handled before this
 * file runs** - `middleware.ts` answers 410, because a page component in Next 16
 * cannot set its own status and 410 is the status the owner was promised. If the
 * middleware's lookup fails it falls through to here, which 404s: a weaker
 * signal, never a wrong one.
 *
 * ## Indexing
 *
 * `noindex` until the trip clears `MIN_STOPS_TO_INDEX` catalog stops. Below that
 * the page still works for anyone holding the link - the owner published it - it
 * is simply not offered to crawlers, and the trips sitemap excludes it. The two
 * decisions come from the same stored `indexable` flag, so they cannot disagree.
 */

/** Deduped per request: `generateMetadata` and the page body both need it. */
const load = cache(async (slug: string) => getPublicTrip(slug));

/** The catalog rows this trip touches, in first-appearance order. */
function citiesOf(citySlugs: string[]): Destination[] {
  const seen = new Set<string>();
  const out: Destination[] = [];
  for (const slug of citySlugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const dest = destinations.find((d) => d.slug === slug);
    if (dest) out.push(dest);
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug);
  if (found.state !== 'live') {
    return { title: 'הטיול לא נמצא | טיול+', robots: { index: false, follow: false } };
  }

  const { record } = found;
  /*
    The same generator the share links use. Reused rather than re-written because
    it already answers "how do you describe an itinerary without naming anybody",
    which is the entire problem here too.
  */
  const preview = sharePreview({ name: '', days: record.snapshot.days });
  const month = monthLabel(record.snapshot.month);
  const title = `${preview.title} | טיול+`;
  const description = month
    ? `${preview.description} נסיעה בחודש ${month}.`
    : preview.description;

  return {
    title,
    description,
    alternates: { canonical: canonical(`/trips/${record.slug}`) },
    openGraph: {
      type: 'article',
      locale: 'he_IL',
      siteName: 'טיול+',
      title,
      description,
      url: canonical(`/trips/${record.slug}`),
    },
    twitter: { card: 'summary_large_image', title, description },
    /*
      The gate from the brief. `follow` stays true in both states: the stops link
      into our destination pages, and there is no reason to throw that away just
      because this particular page is too thin to rank.
    */
    robots: record.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function PublicTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await load(slug);
  /*
    `gone` reaches here only when the middleware could not answer (unconfigured,
    timeout). 404 is the honest fallback: the content is genuinely not here, and
    a 200 with an empty page would be the one unacceptable outcome.
  */
  if (found.state !== 'live') notFound();

  const { record } = found;
  const cities = citiesOf(record.snapshot.days.map((d) => d.citySlug));
  const primary = cities[0];
  if (!primary) notFound();

  /** Every stop, in itinerary order, resolved to a real catalog place. */
  const placesByCity = new Map(cities.map((c) => [c.slug, new Map(c.places.map((p) => [p.id, p]))]));
  const orderedPlaces: Place[] = record.snapshot.days.flatMap((d) =>
    d.placeIds
      .map((id) => placesByCity.get(d.citySlug)?.get(id))
      .filter((p): p is Place => Boolean(p)),
  );

  const preview = sharePreview({ name: '', days: record.snapshot.days });
  const month = monthLabel(record.snapshot.month);

  const ld = [
    /*
      The city is the parent, not a `/trips` index - there is no such hub, and a
      breadcrumb pointing at a URL that does not exist is worse than a short
      breadcrumb. The city page is also where a reader who liked this itinerary
      actually wants to go next.
    */
    breadcrumbLd([
      { name: 'יעדים', path: '/countries' },
      { name: primary.name, path: `/destinations/${primary.slug}` },
      { name: preview.title, path: `/trips/${record.slug}` },
    ]),
    touristTripLd({
      slug: record.slug,
      name: preview.title,
      description: preview.description,
      places: orderedPlaces,
    }),
  ];

  return (
    <>
      <JsonLd data={ld} />
      <PublicTripView
        slug={record.slug}
        days={record.snapshot.days}
        cities={cities}
        month={month}
        title={preview.title}
        description={preview.description}
        stopCount={record.stopCount}
      />
    </>
  );
}
