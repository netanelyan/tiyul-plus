import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';

/**
 * דף הבית - פורטל נחיתה עם צבע אמיתי: הירו → צ׳יפים → רשת יעדים חיה
 * (תמונות היעדים המאומתות הן הצבע של הדף, על פס night שמבליט אותן) →
 * שורת כניסות משנית רזה (מתכנן/קטלוג + פס הטיול הנוכחי). בלי קישוטים
 * ריקים ובלי שטחי קרם מתים.
 */
export default async function Home() {
  const provider = getProvider();
  const dests = await provider.getDestinations();

  return (
    <div>
      <HomeHero />

      {/* יעדים פופולריים - הלב הרגשי של הדף: פס night עם כרטיסי תמונה */}
      <section className="rounded-3xl bg-night px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-cream sm:text-3xl">יעדים פופולריים</h2>
            <p className="mt-1.5 text-sm text-cream/60">
              {dests.length} ערים עם מסלול מוכן, מפה ושכבת כשרות - לוחצים ונכנסים.
            </p>
          </div>
          <Link
            href="/countries"
            className="shrink-0 text-sm font-bold text-zest transition hover:text-cream"
          >
            כל הקטלוג ←
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {dests.map((d) => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="card-pop group relative block h-44 overflow-hidden rounded-2xl ring-1 ring-cream/10 sm:h-56"
            >
              {d.photo ? (
                <div
                  className="photo-bg absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${d.photo})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-night/60 to-night" />
              )}
              {/* גרדיאנט night תחתון ללגיביליות הטקסט */}
              <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="display text-xl text-cream drop-shadow">{d.name}</div>
                <div className="mt-0.5 text-xs font-medium text-cream/80">
                  {d.country} · מסלול מוכן ל-{d.days} ימים
                </div>
              </div>
            </Link>
          ))}
        </div>
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
