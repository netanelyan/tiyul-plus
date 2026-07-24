import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';
import DestinationHighlights from '@/components/DestinationHighlights';

/**
 * דף הבית - פורטל נחיתה עם צבע אמיתי: הירו → צ׳יפים → רשת פלאים חיה
 * (תמונות היעדים המאומתות הן הצבע של הדף, על פס night שמבליט אותן) →
 * שורת כניסות משנית רזה (מתכנן/קטלוג + פס הטיול הנוכחי). בלי קישוטים
 * ריקים ובלי שטחי קרם מתים.
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

      {/* פלאים שמחכים לכם - הלב הרגשי של הדף: פס night עם כרטיסי פלא */}
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

      {/* כניסות משניות - רזות וממורכזות, לא כרטיסים גדולים */}
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
