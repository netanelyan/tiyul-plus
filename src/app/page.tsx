import Link from 'next/link';
import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';

/**
 * דף הבית - פורטל נחיתה קליל (בלי Leaflet, בלי מצב שיחה):
 * ההירו שולח ל-/chat?q=... והשיחה חיה שם בלבד. מתחתיו כרטיסי פורטל
 * שקטים לאזורי האתר, וכרטיס "הטיול שלי" כשיש טיול פעיל.
 */
export default function Home() {
  return (
    <div>
      <HomeHero />

      {/* פורטל: הדרכים הידניות פנימה */}
      <section className="mx-auto max-w-4xl pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/planner"
            className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10"
          >
            <div className="badge h-10 w-10 justify-center rounded-xl bg-night/5 text-xl">🗺️</div>
            <h3 className="mt-3 font-bold text-night">מתכנן המסלולים</h3>
            <p className="mt-1 text-sm leading-relaxed text-night/60">
              בונים ועורכים ידנית - ימים, עצירות, מפה והדפסה.
            </p>
          </Link>
          <Link
            href="/countries"
            className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10"
          >
            <div className="badge h-10 w-10 justify-center rounded-xl bg-night/5 text-xl">🌍</div>
            <h3 className="mt-3 font-bold text-night">קטלוג היעדים</h3>
            <p className="mt-1 text-sm leading-relaxed text-night/60">
              8 מדינות עם מסלולים מוכנים, שכבת כשרות ומידע פרקטי.
            </p>
          </Link>
          <MyTripCard />
        </div>
      </section>
    </div>
  );
}
