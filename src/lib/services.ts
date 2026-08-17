// ---------- Quick access: travel services ----------
// The service cards on the homepage (flights / stay / activities / car).
//
// There is no config of its own here: the cards are derived from
// `src/lib/booking.ts`, which is the single source of truth for providers and
// links across the site. That way changing one affiliate ID updates both the
// homepage and the booking panel inside the trip.
//
// Commercial honesty: as long as there is no real affiliate ID, the button
// points to the provider's public site - with no invented tracking parameters.
// A provider that has not yet been chosen is shown as "coming soon".

import { bookingProvider, buildBookingUrl, bookingIsAffiliate } from './booking';
import type { BookingKind } from './trip/types';

export interface QuickService {
  key: BookingKind;
  emoji: string;
  title: string; // Hebrew
  description: string; // Hebrew, one short sentence
  cta: string; // button label
  provider: string | null; // provider display name; null = no provider chosen
  affiliateUrl: string | null; // real affiliate link - null until an ID is configured
  publicUrl: string | null; // the provider's public site; null => "coming soon"
}

// The homepage shows the four classic services; insurance/eSIM stay inside the
// trip's booking panel, where they are relevant to a specific destination.
const HOME_KINDS: BookingKind[] = ['flights', 'stay', 'activities', 'car'];

export const quickServices: QuickService[] = HOME_KINDS.flatMap((kind) => {
  const p = bookingProvider(kind);
  if (!p) return [];
  const url = buildBookingUrl(kind); // no destination - the provider's homepage
  const isAffiliate = bookingIsAffiliate(kind);
  return [
    {
      key: kind,
      emoji: p.emoji,
      title: p.title,
      description: p.blurb,
      cta: p.cta,
      provider: p.provider,
      affiliateUrl: isAffiliate ? url : null,
      publicUrl: isAffiliate ? null : url,
    },
  ];
});
