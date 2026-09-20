import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';
import { pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = pageMetadata({
  path: '/premium',
  title: 'מחירים | טיול+',
  description:
    'לתכנן לבד בטיול+ זה חינם. המנוי - 19.90 ₪ לחודש - פותח טיול משותף: חברים מצטרפים בקישור, מצביעים, מגיבים, מציעים מקומות ומסמנים תאריכים. הבדיקה לפני הנסיעה כלולה.',
  // The site itself has not launched yet - there is no point in this page accumulating in search
  // results until there is real traffic. Easy to undo: delete this line at launch.
  // Confirmed deliberate 2026-09-20; sitemap.ts leaves the page out for the same reason.
  noindex: true,
});

export default function PremiumPage() {
  return <PremiumClient />;
}
