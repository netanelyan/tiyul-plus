import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'טיול+ פרימיום - תכנון בלי מכסות',
  description:
    'שדרוג לטיול+ פרימיום: מכסת סוכן חכם פי 10, יותר בניות מסלול, ייבוא מפות ושיתופים - לתכנון בלי לחכות.',
};

export default function PremiumPage() {
  return <PremiumClient />;
}
