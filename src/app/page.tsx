import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import HomeHero from '@/components/HomeHero';
import MyTripCard from '@/components/MyTripCard';

/**
 * דף הבית - פורטל נחיתה קליל (בלי Leaflet, בלי מצב שיחה):
 * ההירו שולח ל-/chat?q=... והשיחה חיה שם בלבד. מתחתיו רצועת גלויות
 * (תמונות יעדים אמיתיות, מקושרת לקטלוג) שנותנת לדף ריח של טיול,
 * וכרטיסי פורטל שקטים. הפריסה הדוקה - בלי ים של שטח מת.
 */
export default async function Home() {
  const provider = getProvider();
  const countries = await provider.getCountries();
  const postcardStrip = countries.filter((c) => c.photo).slice(0, 4);

  return (
    <div>
      <HomeHero />

      {/* רצועת גלויות - נגיעת "טיול" עדינה, לחיצה מובילה לקטלוג */}
      {postcardStrip.length > 0 && (
        <Link
          href="/countries"
          aria-label="קטלוג היעדים"
          className="mx-auto mt-1 flex max-w-3xl items-center justify-center gap-3 px-4 opacity-85 transition hover:opacity-100"
        >
          {postcardStrip.map((c, i) => (
            <div
              key={c.slug}
              className={`photo-bg h-16 min-w-0 flex-1 rounded-xl ring-1 ring-night/10 ${
                i === 3 ? 'hidden sm:block' : ''
              }`}
              style={{ backgroundImage: `url(${c.photo})` }}
              title={c.name}
              role="img"
              aria-label={c.name}
            />
          ))}
        </Link>
      )}

      {/* פורטל: הדרכים הידניות פנימה */}
      <section className="mx-auto mt-10 max-w-4xl pb-14">
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
