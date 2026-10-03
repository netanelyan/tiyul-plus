'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics';

/**
 * The "built with tiyul+" mark, for pages a stranger reaches through somebody
 * else's link (`/t/`, `/join/`).
 *
 * ## Why the utm parameters are on an internal link
 *
 * They normally belong on links we hand to someone else, and this one points at
 * our own homepage - but the question it answers is a real one and nothing else
 * can answer it: **a shared trip is the only page on this site a visitor can
 * reach without ever touching the site.** Their referrer is WhatsApp, or
 * nothing at all, so without these the homepage visit they make next is
 * indistinguishable from a direct arrival, and the whole viral loop reads as
 * "direct traffic" in GA.
 *
 * `share_cta_click` is sent alongside, because the utm only survives if the
 * navigation completes - and the interesting number includes the people who
 * tapped and then changed their mind.
 *
 * ## Deliberately not a button
 *
 * It is branding, not the call to action: the CTA is a separate, louder element
 * that only non-owners see. This one shows for everybody, including the trip's
 * owner, because its job is to say where the thing they are looking at came
 * from.
 */
export default function BuiltWithTiyul({
  surface,
  className = '',
}: {
  /** Which shared surface this is on - becomes the GA `surface` parameter. */
  surface: 'shared_trip' | 'join';
  className?: string;
}) {
  return (
    <Link
      href="/?utm_source=share&utm_medium=trip_link"
      onClick={() => track('share_cta_click', { surface, element: 'badge' })}
      className={`inline-flex items-center gap-1.5 rounded-full bg-night/5 px-3 py-1 text-xs font-bold text-night/70 ring-1 ring-night/10 transition hover:bg-night/10 hover:text-night ${className}`}
    >
      <span aria-hidden>✈️</span>
      <span>
        נבנה עם <span className="text-sunset-deep">טיול+</span>
      </span>
    </Link>
  );
}
