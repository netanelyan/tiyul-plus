import type { Metadata } from 'next';
import TravelerClient from './TravelerClient';

export const metadata: Metadata = {
  title: 'פרופיל מטייל | טיול+',
  description: 'דרכון המדינות של מטייל בקהילת טיול+.',
};

/**
 * /u/<id> - a public traveler profile. The fetch is client-side against the
 * public_profiles view (RLS exposes only profiles that chose to be public,
 * and only name/picture/passport - no email, phone or trips).
 */
export default async function TravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TravelerClient userId={id} />;
}
