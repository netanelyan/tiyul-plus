import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TravelerClient from './TravelerClient';

export const metadata: Metadata = {
  title: 'פרופיל מטייל | טיול+',
  description: 'דרכון המדינות של מטייל בקהילת טיול+.',
  // Somebody else's profile is not ours to put in a search result, and there
  // is nothing here to rank on: the page is a shell and the content is
  // fetched client-side. robots.txt disallows /u/ as well - see the note on
  // the shared-trip route about why both are worth having.
  robots: { index: false, follow: true },
};

/**
 * /u/<id> - a public traveler profile. The fetch is client-side against the
 * public_profiles view (RLS exposes only profiles that chose to be public,
 * and only name/picture/passport - no email, phone or trips).
 */
/**
 * Supabase issues user ids as uuids, so anything that is not one cannot be a
 * traveller and is a 404 rather than a page.
 *
 * This does not make every missing profile a 404, and it cannot: the profile
 * is read in the browser because `public_profiles` is granted to
 * `authenticated` only, so the server has no way to tell "no such user" from
 * "exists but private" from "you may not read this" - and answering 404 for
 * the second would leak that the account exists. What it does fix is the
 * reported case, /u/<anything>, which used to return 200 with an empty
 * heading: a soft 404 that a crawler will happily index.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <TravelerClient userId={id} />;
}
