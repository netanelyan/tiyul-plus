import type { Metadata } from 'next';
import AccountClient from './AccountClient';
import { cityNames } from '@/lib/server/cityNames';
import { pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = pageMetadata({
  path: '/account',
  title: 'האזור האישי | טיול+',
  description:
    'הפרופיל שלך בטיול+: תמונה, פרטים, הטיולים המסונכרנים ומפת המדינות שכבר כבשת.',
  noindex: true,
});

export default function AccountPage() {
  return <AccountClient cityNames={cityNames()} />;
}
