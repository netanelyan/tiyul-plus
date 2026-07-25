import type { Metadata } from 'next';
import TravelerClient from './TravelerClient';

export const metadata: Metadata = {
  title: 'פרופיל מטייל | טיול+',
  description: 'דרכון המדינות של מטייל בקהילת טיול+.',
};

/**
 * /u/<id> - פרופיל מטייל ציבורי. השליפה בצד הלקוח מול ה-view
 * public_profiles (RLS חושף רק פרופילים שבחרו להיות ציבוריים,
 * ורק שם/תמונה/דרכון - בלי מייל, טלפון או טיולים).
 */
export default async function TravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TravelerClient userId={id} />;
}
