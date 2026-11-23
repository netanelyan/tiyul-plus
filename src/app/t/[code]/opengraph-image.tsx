import { decodeTripShare } from '@/lib/server/shareDecode';
import { getSharedPayload } from '@/lib/trip/shareStore';
import { sharePreview } from '@/lib/trip/sharePreview';
import { renderTripCard, tripCardText, TRIP_CARD_SIZE, type TripCardText } from '@/lib/og/tripCard';

/**
 * The share card for /t/<code> - the trip's cities and size.
 *
 * ## Why this is worth a route of its own
 *
 * WhatsApp is the distribution channel for this product, and until now every
 * shared trip carried the same generic /og.png. Somebody forwarding "our Italy
 * trip" produced a card indistinguishable from a link to the homepage, so the
 * one moment the site is recommended by a real person was also the moment it
 * looked like an advert. The drawing itself is `lib/og/tripCard.tsx`, shared
 * with `/trips/<slug>`.
 *
 * ## Falling back rather than 500-ing
 *
 * An unknown, expired or malformed code still gets a card - the brand one,
 * with no trip details on it. A share route that throws hands the scraper an
 * error page, and a broken link that at least looks like a real site beats a
 * broken link that looks like nothing.
 */

export const alt = 'טיול משותף בטיול+';
export const size = TRIP_CARD_SIZE;
export const contentType = 'image/png';

/**
 * Scrapers refetch the same link repeatedly. Rendering is the expensive part
 * of this route, and /t/ has no rate limit by an earlier deliberate decision -
 * it is the viral surface and many people share one address behind NAT. So the
 * answer here is caching rather than a limit: identical work, once.
 */
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let text: TripCardText | null = null;
  try {
    const payload = /^[a-zA-Z0-9]{6,12}$/.test(code) ? await getSharedPayload(code) : code;
    const shared = payload ? decodeTripShare(payload) : null;
    if (shared) text = tripCardText(sharePreview(shared));
  } catch {
    // Same as an unknown code: the brand card, never an error page.
  }

  return renderTripCard('טיול משותף', text);
}
