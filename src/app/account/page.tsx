import type { Metadata } from 'next';
import AccountClient from './AccountClient';
import { cityNames } from '@/lib/server/cityNames';

export const metadata: Metadata = {
  title: 'האזור האישי | טיול+',
  description: 'הפרופיל שלך בטיול+: תמונה, פרטים, הטיולים המסונכרנים ומפת המדינות שכבר כבשת.',
};

export default function AccountPage() {
  return <AccountClient cityNames={cityNames()} />;
}
