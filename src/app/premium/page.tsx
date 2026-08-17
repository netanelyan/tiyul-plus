import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'מחירים | טיול+',
  description:
    'לתכנן לבד בטיול+ זה חינם. המנוי - 19.90 ₪ לחודש - פותח טיול משותף: חברים מצטרפים בקישור, מצביעים, מגיבים, מציעים מקומות ומסמנים תאריכים. הבדיקה לפני הנסיעה כלולה.',
  // The site itself has not launched yet - there is no point in this page accumulating in search
  // results until there is real traffic. Easy to undo: delete this line at launch.
  robots: { index: false, follow: true },
};

export default function PremiumPage() {
  return <PremiumClient />;
}
