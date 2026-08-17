import { getProvider } from '@/lib/providers';
import PlannerClient from './PlannerClient';

export const metadata = { title: 'מתכנן מסלולים | טיול+' };

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const { dest } = await searchParams;
  const provider = getProvider();
  // **Summaries, not full destinations.** This used to fetch all 166 destinations in full and
  // pass them as props - i.e. the whole catalog serialised into the page's HTML: 555kB, and a
  // TTFB of ~200ms against 10-20ms on the other pages. It reaches the client a second time as
  // JS through TripWorkspace anyway, so that was a double delivery of the same data. The
  // picker and the templates need only a name, a flag and a day count.
  // The full country list was fetched here and never read on the client at all - removed.
  const summaries = await provider.getDestinations();
  const initial = summaries.find((d) => d.slug === dest)?.slug ?? summaries[0]?.slug ?? '';
  return <PlannerClient summaries={summaries} initialSlug={initial} />;
}
