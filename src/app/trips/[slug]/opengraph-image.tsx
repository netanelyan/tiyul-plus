import { getPublicTrip } from '@/lib/server/publicTrips';
import { sharePreview } from '@/lib/trip/sharePreview';
import { renderTripCard, tripCardText, TRIP_CARD_SIZE, type TripCardText } from '@/lib/og/tripCard';

/**
 * The link-preview card for /trips/<slug>, a trip its owner published.
 *
 * This page shipped without one. Its `generateMetadata` sets `openGraph`, which
 * replaces the parent's rather than merging with it, so the site's /og.png was
 * dropped too and a forwarded itinerary arrived in WhatsApp as bare text - on
 * the one page built to be found and passed on. Same card as /t/<code>, built
 * from the same `sharePreview`, so the picture and the og:title agree.
 *
 * A trip that is missing or withdrawn still gets the brand card rather than an
 * error: the scraper caches whatever it is handed.
 */

export const alt = 'מסלול טיול מוכן עם מפה בטיול+';
export const size = TRIP_CARD_SIZE;
export const contentType = 'image/png';

/**
 * Scrapers refetch often, so the render is cached for a day. A republish keeps
 * its slug and replaces the snapshot, so the card can trail an edit by up to a
 * day - and WhatsApp keeps its own copy of a preview far longer than that.
 */
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let text: TripCardText | null = null;
  try {
    const found = await getPublicTrip(slug);
    if (found.state === 'live') {
      text = tripCardText(sharePreview({ name: '', days: found.record.snapshot.days }));
    }
  } catch {
    // The brand card, never an error page.
  }

  return renderTripCard('מסלול מוכן', text);
}
