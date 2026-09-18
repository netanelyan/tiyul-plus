import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';
import QuickServices from '@/components/QuickServices';
import Flagships from '@/components/home/Flagships';
import PopularCountries from '@/components/home/PopularCountries';
import SharedTripFeature from '@/components/home/SharedTripFeature';
import CtaBand from '@/components/home/CtaBand';
import Collections from '@/components/home/Collections';
import HowItWorks from '@/components/home/HowItWorks';
import { collectionTiles, flagshipCards, popularCountries } from '@/lib/server/homeSections';

/**
 * The homepage.
 *
 * Until 2026-09-18 this was three sections - hero, one band of eight random
 * destination cards, four service cards - and then the footer, about 1,000px
 * of content on a page whose only job is to make somebody want to plan a trip.
 * Netanel's word for it was "thin". The reference he gave was his own
 * storefront: a page that keeps giving something new on every scroll,
 * alternating dark and light, grids and feature blocks, with a number on
 * every tile and a "see all" at the end of every section.
 *
 * This is that structure, built from content that already existed and was
 * simply not on the homepage: the flagship cities with their real counts, the
 * shared-trip feature, the countries with their counts, the twelve collection
 * hubs (which had no inbound link from here at all), and a how-it-works.
 * Every number on the page is counted from the catalog on the server
 * (`lib/server/homeSections.ts`); nothing is typed by hand.
 *
 * Rhythm: light hero -> dark flagships -> light countries -> light feature
 * block (on a shell card, so it reads as a different object) -> dark CTA ->
 * light collections -> light services -> light how-it-works.
 */
export default function Home() {
  const flagships = flagshipCards();
  const countryTiles = popularCountries();
  const hubs = collectionTiles();
  // The feature block's backdrop: the first flagship's landmark photo, i.e. a
  // verified photograph already used elsewhere on this page - no new URL.
  const featurePhoto = flagships.find((f) => f.slug === 'rome')?.photo ?? flagships[0]?.photo;

  return (
    <div>
      <HomeHero />

      <Flagships cards={flagships} />

      <PopularCountries tiles={countryTiles} />

      <SharedTripFeature photo={featurePhoto} />

      <CtaBand />

      <Collections tiles={hubs} />

      <QuickServices />

      <HowItWorks />

      {/* The most recently touched trip, when one exists - a quiet last row */}
      <section className="mx-auto max-w-3xl pb-6">
        <MyTripCard />
      </section>
    </div>
  );
}
