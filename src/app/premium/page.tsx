import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';
import { pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = pageMetadata({
  path: '/premium',
  title: 'מחירים | טיול+',
  description:
    'לתכנן לבד בטיול+ זה חינם. המנוי - 19.90 ₪ לחודש - פותח טיול משותף: חברים מצטרפים בקישור, מצביעים, מגיבים, מציעים מקומות ומסמנים תאריכים. הבדיקה לפני הנסיעה כלולה.',
  /*
    Indexable as of 2026-09-21. It carried `noindex` on the pre-launch reasoning that the page
    should not accumulate in search results before there was traffic - but this is the pricing
    page, and a pricing page is one of the few commercial queries a young domain can actually
    win ("tiyul plus price", "how much does it cost"). Keeping it out of the index also kept it
    out of the internal link graph's eligible set while every plan card links to it, which is a
    contradiction we were publishing about ourselves.

    The app surfaces that genuinely have nothing to rank - /chat, /ask, /account, /planner,
    /start - keep their noindex, and `sitemap.test.ts` asserts none of them reach the sitemap.
  */
});

export default function PremiumPage() {
  return <PremiumClient />;
}
