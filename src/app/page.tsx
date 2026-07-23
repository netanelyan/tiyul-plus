import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import { destinations } from '@/data/destinations';
import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';

/**
 * דף הבית - פורטל נחיתה עם צבע אמיתי: הירו → צ׳יפים → רשת פלאים חיה
 * (תמונות היעדים המאומתות הן הצבע של הדף, על פס night שמבליט אותן) →
 * שורת כניסות משנית רזה (מתכנן/קטלוג + פס הטיול הנוכחי). בלי קישוטים
 * ריקים ובלי שטחי קרם מתים.
 */

// כרטיס הפתיחה של כל עיר מוביל בפלא איקוני אחד (תמונה+שם) במקום שם
// העיר - מ-mustSee אמיתי בדאטה (destinations.ts), לא מומצא. שם/מדינה
// יורדים לשורה משנית. נבחר ידנית פעם אחת: הכי מזוהה חזותית לכל עיר.
const HERO_LANDMARK: Record<string, string> = {
  vienna: 'vie-stephansdom',
  bratislava: 'bts-castle',
  prague: 'prg-charles',
  budapest: 'bud-parliament',
  rome: 'rom-colosseum',
  athens: 'ath-acropolis',
  barcelona: 'bcn-sagrada',
  berlin: 'ber-brandenburg',
};

export default async function Home() {
  const provider = getProvider();
  const dests = await provider.getDestinations();

  return (
    <div>
      <HomeHero />

      {/* פלאים שמחכים לכם - הלב הרגשי של הדף: פס night עם כרטיסי פלא */}
      <section className="rounded-3xl bg-night px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-cream sm:text-3xl">פלאים שמחכים לכם</h2>
            <p className="mt-1.5 text-sm text-cream/60">
              מהקולוסיאום ועד שער ברנדנבורג - לכל פלא יש מסלול מוכן, מפה ושכבת כשרות. לוחצים ונכנסים.
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
          {dests.map((d) => {
            const dest = destinations.find((x) => x.slug === d.slug);
            const landmark = dest?.places.find((p) => p.id === HERO_LANDMARK[d.slug]);
            const heroPhoto = landmark?.photo ?? d.photo;
            const heroName = landmark?.name ?? d.name;
            return (
              <Link
                key={d.slug}
                href={`/destinations/${d.slug}`}
                className="card-pop group relative block h-44 overflow-hidden rounded-2xl ring-1 ring-cream/10 sm:h-56"
              >
                {heroPhoto ? (
                  <div
                    className="photo-bg absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${heroPhoto})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-night/60 to-night" />
                )}
                {/* גרדיאנט night תחתון ללגיביליות הטקסט */}
                <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="display text-lg leading-tight text-cream drop-shadow sm:text-xl">
                    {heroName}
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-cream/80">
                    {d.name} · {d.country} · {d.days} ימים
                  </div>
                </div>
              </Link>
            );
          })}
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
