import NotFoundView from '@/components/NotFoundView';

/**
 * The not-found boundary for a destination slug that does not exist.
 *
 * Without a boundary in this segment, notFound() here returned a correct 404
 * status and a page whose body never reached the HTML - it was in the RSC
 * payload only, so the served document had no heading and no content.
 */
export default function DestinationNotFound() {
  return <NotFoundView />;
}
