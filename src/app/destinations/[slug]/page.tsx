import { notFound } from 'next/navigation';
import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import DestinationClient from './DestinationClient';

export function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = getProvider();
  const dest = await provider.getDestination(slug);
  if (!dest) notFound();
  const country = await provider.getCountry(dest.countrySlug);
  if (!country) notFound();
  return <DestinationClient dest={dest} country={country} />;
}
