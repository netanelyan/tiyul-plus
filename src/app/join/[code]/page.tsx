import type { Metadata } from 'next';
import JoinClient from './JoinClient';

export const metadata: Metadata = {
  title: 'הצטרפות לטיול משותף | טיול+',
  description: 'הוזמנתם לראות טיול ולהצביע על העצירות - טיול+',
  robots: { index: false, follow: true },
};

/**
 * /join/<code> - the friends' side of a shared trip: they join via the invite
 * link, see the live trip and vote 👍/👎 on stops. Requires signing in (the
 * vote is one per person), but not premium - only the organizer pays.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinClient code={code} />;
}
