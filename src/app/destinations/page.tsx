import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

/**
 * /destinations had no index at all - it 404'd, while /countries and
 * /collections both have one. That is a hole a reader falls into by trimming
 * a URL, and a dead end for any link that ever pointed at it.
 *
 * It redirects rather than duplicating the catalog. /countries already IS the
 * destination browser - it renders all 166 destination cards with the
 * continent tabs, the character chips and the search - so a second page
 * listing the same cards would be two URLs competing for one query, which is
 * exactly the duplication the canonical work in the SEO phase was about.
 *
 * Permanent, so the redirect is cached and any external link consolidates onto
 * the page that does the job.
 */
export const metadata: Metadata = {
  title: 'יעדים | טיול+',
  robots: { index: false, follow: true },
};

export default function DestinationsIndex() {
  redirect('/countries');
}
