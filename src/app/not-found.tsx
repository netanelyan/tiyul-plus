import type { Metadata } from 'next';
import NotFoundView from '@/components/NotFoundView';

/**
 * The global 404 - `app/not-found.tsx` is Next's convention for a route that does not exist
 * at all, so it runs on the server and returns a real 404 status, not just a page that looks
 * like one.
 *
 * `robots: noindex` because a broken URL should not accumulate in search results, but
 * `follow: true` so Google still follows from here back to the homepage and the catalog.
 */
export const metadata: Metadata = {
  title: 'הדף לא נמצא | טיול+',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundView />;
}
