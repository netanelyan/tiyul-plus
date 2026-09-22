import type { Metadata } from 'next';
import { cache } from 'react';
import { destinations } from '@/data/destinations';
import type { SharedTrip } from '@/lib/trip/share';
import { decodeTripShare } from '@/lib/server/shareDecode';
import { getSharedPayload } from '@/lib/trip/shareStore';
import SharedTripView from './SharedTripView';
import { daysHe } from '@/lib/duration';

/**
 * /t/<code> - viewing a shared trip, read-only, for anyone (no account).
 * Two code kinds on the same route:
 * - a short code (6-12 chars) - stored in Supabase by /api/share; the
 *   payload is fetched and decoded.
 * - a long inline code (v1) - the trip is encoded inside the URL itself;
 *   keeps working both without a backend and for old links.
 * In both cases decodeTripShare validates against the curated data - only
 * real places are displayed.
 */

const resolveSharedTrip = cache(async (code: string): Promise<SharedTrip | null> => {
  if (/^[a-zA-Z0-9]{6,12}$/.test(code)) {
    const payload = await getSharedPayload(code);
    return payload ? decodeTripShare(payload) : null;
  }
  return decodeTripShare(code);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const shared = await resolveSharedTrip(code);
  /*
    Never indexed, on both branches. A shared link is somebody's private trip
    handed to the people they chose; it should reach WhatsApp, not a search
    result. `follow: true` so the destination links inside it still count.

    Worth being honest about the limit: robots.txt already disallows /t/, and
    a disallowed URL is one Googlebot will not fetch - so it cannot read this
    tag either. What this actually buys is the case where the disallow is
    ever narrowed, and it costs one line to have the two agree.
  */
  const robots = { index: false, follow: true } as const;
  if (!shared) return { title: 'טיול משותף | טיול+', robots };
  const cities = [...new Set(shared.days.map((d) => d.citySlug))]
    .map((s) => destinations.find((x) => x.slug === s)?.name)
    .filter(Boolean)
    .join(' · ');
  const stops = shared.days.reduce((n, d) => n + d.placeIds.length, 0);
  const title = `${shared.name} | טיול+`;
  const description = `מסלול של ${daysHe(shared.days.length)} ו-${stops} עצירות ב${cities} - נבנה בטיול+, סוכן הנסיעות החכם.`;
  // openGraph is written explicitly rather than relying on the layout:
  // metadata in Next merges per field, so title/description here do **not**
  // flow into the parent's openGraph - and the WhatsApp card would have
  // shown the generic site name instead of the trip name. This link is
  // exactly what gets sent on WhatsApp, so it is the field that most needs
  // to be precise.
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      locale: 'he_IL',
      siteName: 'טיול+',
      title,
      description,
      /*
        No `images` here on purpose. Declaring it would REPLACE the card that
        `opengraph-image.tsx` generates for this exact trip - Next only applies
        the file convention when the route has not named its own images, so the
        generic /og.png that used to sit here was actively suppressing a
        per-trip card. The same rule governs `twitter` below.
      */
    },
    twitter: { card: 'summary_large_image', title, description },
    robots,
  };
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const shared = await resolveSharedTrip(code);

  if (!shared) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-shell p-10 text-center ring-1 ring-night/10">
        <h1 className="display text-2xl text-night">הקישור הזה לא תקין</h1>
        <p className="mt-2 leading-relaxed text-night/70">
          לא הצלחנו לפתוח את הטיול המשותף - ייתכן שהקישור נחתך בהעתקה או שפג תוקפו.
          בקשו מהשולח לשתף אותו שוב.
        </p>
      </div>
    );
  }

  // Only this trip's cities go down to the client, not the catalog
  const citySlugs = [...new Set(shared.days.map((d) => d.citySlug))];
  const cityData = destinations.filter((d) => citySlugs.includes(d.slug));

  return <SharedTripView shared={shared} cityData={cityData} />;
}
