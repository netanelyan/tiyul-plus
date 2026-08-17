import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';
import DestinationHighlights from '@/components/DestinationHighlights';
import QuickServices from '@/components/QuickServices';

/**
 * The homepage - a landing portal with real colour: hero -> chips -> a live grid of wonders
 * (the verified destination photos are the page's colour, on a night band that sets them off)
 * -> a slim secondary row of entries (planner/catalog + the current-trip bar). No empty
 * decoration and no dead expanses of cream.
 */

export default async function Home() {
  const provider = getProvider();
  const dests = await provider.getDestinations();
  const cards = dests.map((d) => {
    const dest = destinations.find((x) => x.slug === d.slug);
    const landmark = dest?.iconicLandmark;
    return {
      slug: d.slug,
      heroName: landmark?.name ?? d.name,
      heroPhoto: landmark?.photo ?? d.photo,
      name: d.name,
      country: d.country,
      days: d.days,
    };
  });

  return (
    <div>
      <HomeHero />

      {/* Wonders waiting for you - the emotional heart of the page: a night band with wonder cards */}
      <section className="rounded-3xl bg-night px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-cream sm:text-3xl">פלאים שמחכים לכם</h2>
            <p className="mt-1.5 text-sm text-cream/60">
              לכל פלא יש מסלול מוכן, מפה ושכבת כשרות. לוחצים ונכנסים.
            </p>
          </div>
          <Link
            href="/countries"
            className="shrink-0 text-sm font-bold text-zest transition hover:text-cream"
          >
            כל הקטלוג ←
          </Link>
        </div>

        <DestinationHighlights cards={cards} />
      </section>

      {/* Quick access: travel services (flights/lodging/attractions/car) */}
      <QuickServices />

      {/* Secondary entries - slim and centred, not large cards */}
      <section className="mx-auto max-w-3xl py-10">
        <MyTripCard />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/planner"
            className="badge rounded-full bg-shell px-5 py-2.5 font-semibold text-night/75 ring-1 ring-night/10 transition hover:text-night hover:ring-night/25"
          >
            🗺️ מתכנן המסלולים
          </Link>
          <Link
            href="/countries"
            className="badge rounded-full bg-shell px-5 py-2.5 font-semibold text-night/75 ring-1 ring-night/10 transition hover:text-night hover:ring-night/25"
          >
            🌍 קטלוג היעדים
          </Link>
        </div>
      </section>
    </div>
  );
}
