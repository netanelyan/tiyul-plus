import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import PlannerClient from './PlannerClient';

export const metadata = { title: 'מתכנן מסלולים | טיול+' };

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const { dest } = await searchParams;
  const provider = getProvider();
  // בספק sample זה מגיע מהרפו; בספקים חיצוניים המסלול האוצר מועשר בנתוני אמת.
  const full = await Promise.all(destinations.map((d) => provider.getDestination(d.slug)));
  const all = full.filter((d) => d !== null);
  const initial = all.find((d) => d.slug === dest)?.slug ?? all[0]?.slug ?? '';
  return <PlannerClient destinations={all} initialSlug={initial} />;
}
