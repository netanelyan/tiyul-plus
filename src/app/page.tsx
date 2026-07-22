import Link from 'next/link';
import { getProvider } from '@/lib/providers';

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=70';

export default async function Home() {
  const provider = getProvider();
  const [countries, dests] = await Promise.all([
    provider.getCountries(),
    provider.getDestinations(),
  ]);
  const citiesOf = (slug: string) => dests.filter((d) => d.countrySlug === slug);

  return (
    <div>
      {/* Hero */}
      <section
        className="photo-bg relative overflow-hidden rounded-2xl px-6 py-16 sm:px-12 sm:py-20"
        style={{
          backgroundImage: `linear-gradient(200deg, rgba(18,16,32,0.45) 0%, rgba(18,16,32,0.8) 75%), url(${HERO_PHOTO})`,
        }}
      >
        <div className="rise-in max-w-2xl">
          <span className="badge rounded-full border border-cream/30 px-3 py-1 text-sm font-medium text-cream/90">
            נבנה בשביל מטיילים ישראלים
          </span>
          <h1 className="display mt-5 text-4xl text-cream sm:text-5xl">
            תכנון טיולים
            <br />
            שמדבר <span className="marker text-night">עברית.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/90">
            מסלולים יום-אחרי-יום עם מפה אינטראקטיבית, שכבת אוכל כשר, טיסות ישירות
            מנתב"ג וכל המידע הפרקטי - בלי לתרגם בראש מאנגלית.
          </p>
        </div>
        <div className="rise-in-late mt-8 flex flex-wrap gap-3">
          <Link
            href="/planner"
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
          >
            למתכנן המסלולים ←
          </Link>
          <Link
            href="/chat"
            className="rounded-xl border border-cream/40 px-6 py-3 font-bold text-cream transition hover:bg-cream/10"
          >
            לצ׳אט הטיולים
          </Link>
        </div>
      </section>

      {/* Countries */}
      <section className="mt-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="display text-2xl text-night">לאן טסים?</h2>
            <p className="mt-2 text-night/60">
              {countries.length} מדינות, {dests.length} ערים עם מסלול מוכן, מפה ושכבת כשרות. עוד בדרך.
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => {
            const cities = citiesOf(c.slug);
            const totalDays = cities.reduce((n, d) => n + d.days, 0);
            const totalKosher = cities.reduce((n, d) => n + d.kosherCount, 0);
            return (
              <Link
                key={c.slug}
                href={`/countries/${c.slug}`}
                className="card-pop group overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10"
              >
                <div
                  className="photo-bg relative h-44"
                  style={
                    c.photo
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(15,14,26,0) 40%, rgba(15,14,26,0.7) 100%), url(${c.photo})`,
                        }
                      : undefined
                  }
                >
                  <span className="badge absolute end-4 top-4 rounded-full bg-cream/95 px-2.5 py-0.5 text-xl">
                    {c.flag}
                  </span>
                  <div className="absolute bottom-3 start-4">
                    <h3 className="display text-2xl text-cream drop-shadow">{c.name}</h3>
                    <div className="text-xs font-medium text-cream/80">{c.nameLocal}</div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-night/75">{c.tagline}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-night/5 px-3 py-1.5 text-night/70">
                      {cities.length === 1 ? `עיר אחת: ${cities[0].name}` : `${cities.length} ערים`}
                    </span>
                    <span className="rounded-full bg-night/5 px-3 py-1.5 text-night/60">
                      {totalDays} ימי מסלול מוכן
                    </span>
                    {totalKosher > 0 && (
                      <span className="rounded-full bg-[#00a896]/10 px-3 py-1.5 text-[#007f76]">
                        {totalKosher} נקודות כשרות
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Value props */}
      <section className="mt-16 grid gap-5 sm:grid-cols-3">
        {[
          {
            emoji: '🗺️',
            title: 'מסלול + מפה ביחד',
            text: 'כל יום במסלול מוצג על מפה אינטראקטיבית עם סדר עצירות - לא עוד רשימה בלי הקשר.',
          },
          {
            emoji: '✡️',
            title: 'שכבת כשרות',
            text: 'מסעדות כשרות, סופרים כשרים והערות השגחה - מסומנים על המפה בכל יעד.',
          },
          {
            emoji: '🇮🇱',
            title: 'מידע פרקטי לישראלים',
            text: 'טיסות ישירות מנתב"ג, ויזות, eSIM, תשלומים - מה שבאמת צריך לדעת לפני שטסים.',
          },
        ].map((f) => (
          <div key={f.title} className="card-pop rounded-2xl bg-shell p-6 ring-1 ring-night/10">
            <div className="badge h-10 w-10 justify-center rounded-xl bg-night/5 text-xl">
              {f.emoji}
            </div>
            <h3 className="mt-4 text-lg font-bold text-night">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-night/70">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
