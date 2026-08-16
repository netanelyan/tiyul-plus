import type { Metadata } from 'next';
import JoinClient from './JoinClient';

export const metadata: Metadata = {
  title: 'הצטרפות לטיול משותף | טיול+',
  description: 'הוזמנתם לראות טיול ולהצביע על העצירות - טיול+',
  robots: { index: false, follow: true },
};

/**
 * /join/<code> - הצד של החברים בטיול משותף: מצטרפים דרך קישור ההזמנה,
 * רואים את הטיול החי ומצביעים 👍/👎 על עצירות. דורש התחברות (ההצבעה
 * היא אחת לאדם), אבל לא פרימיום - רק המארגן משלם.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinClient code={code} />;
}
