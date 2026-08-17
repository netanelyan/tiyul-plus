import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'מחירים | טיול+',
  description:
    'התכנון בטיול+ חינם. בדיקה לפני הנסיעה - 29.90 ₪ לטיול. במנוי: טיול משותף שבו חברים מצביעים, מגיבים, מציעים מקומות ומסמנים תאריכים - והבדיקה כלולה.',
  // The site itself has not launched yet - there is no point in this page accumulating in search
  // results until there is real traffic. Easy to undo: delete this line at launch.
  robots: { index: false, follow: true },
};

export default function PremiumPage() {
  return <PremiumClient />;
}
