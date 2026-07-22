import Link from 'next/link';
import { getProvider } from '@/lib/providers';

const HERO_PHOTO =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=70';

export default async function Home() {
  const provider = getProvider();
  const dests = await provider.getDestinations();

  return (
    <div>
      {/* Hero */}
      <section
        className="photo-bg relative overflow-hidden rounded-[2.5rem] px-6 py-16 sm:px-12 sm:py-20"
        style={{
          backgroundImage: `linear-gradient(200deg, rgba(36,27,77,0.55) 0%, rgba(36,27,77,0.85) 70%), url(${HERO_PHOTO})`,
        }}
      >
        <div className="rise-in max-w-2xl">
          <span className="sticker rounded-full bg-zest px-3 py-1 text-sm font-black text-night">
            🇮🇱 נבנה בשביל מטיילים ישראלים
          </span>
          <h1 className="display mt-5 text-4xl text-cream sm:text-6xl">
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
            className="rounded-2xl bg-sunset px-6 py-3 text-lg font-black text-cream shadow-lg transition hover:bg-sunset-deep"
          >
            למתכנן המסלולים ←
          </Link>
          <Link
            href="/chat"
            className="rounded-2xl border-2 border-cream/40 px-6 py-3 text-lg font-black text-cream transition hover:bg-cream/10"
          >
            לצ׳אט הטיולים 💬
          </Link>
        </div>
      </section>

      {/* Destinations */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="display text-3xl text-night">
              לאן <span className="marker">טסים?</span>
            </h2>
            <p className="mt-2 text-night/60">
              {dests.length} יעדים עם מסלול מוכן, מפה ושכבת כשרות. עוד בדרך.
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dests.map((d, i) => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="card-pop group overflow-hidden rounded-3xl bg-shell shadow-sm ring-1 ring-night/10"
            >
              <div
                className="photo-bg relative h-44"
                style={
                  d.photo
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(36,27,77,0) 40%, rgba(36,27,77,0.65) 100%), url(${d.photo})`,
                      }
                    : undefined
                }
              >
                <span
                  className={`sticker absolute top-4 rounded-full bg-cream px-3 py-1 text-2xl ${
                    i % 2 === 0 ? 'end-4' : 'end-4 rotate-2'
                  }`}
                >
                  {d.flag}
                </span>
                <div className="absolute bottom-3 start-4">
                  <h3 className="display text-2xl text-cream drop-shadow">{d.name}</h3>
                  <div className="text-xs font-medium text-cream/80">{d.nameLocal}</div>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium leading-relaxed text-night/75">{d.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-night px-3 py-1.5 text-zest">
                    🗓️ {d.days} ימים
                  </span>
                  {d.kosherCount > 0 && (
                    <span className="rounded-full bg-sunset/10 px-3 py-1.5 text-sunset-deep">
                      ✡️ {d.kosherCount} נקודות כשרות
                    </span>
                  )}
                  <span className="rounded-full bg-night/5 px-3 py-1.5 text-night/60">
                    {d.country}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="mt-16 grid gap-5 sm:grid-cols-3">
        {[
          {
            emoji: '🗺️',
            title: 'מסלול + מפה ביחד',
            text: 'כל יום במסלול מוצג על מפה אינטראקטיבית עם סדר עצירות - לא עוד רשימה בלי הקשר.',
            bg: 'bg-night',
            titleColor: 'text-zest',
            textColor: 'text-cream/80',
          },
          {
            emoji: '✡️',
            title: 'שכבת כשרות',
            text: 'מסעדות כשרות, סופרים כשרים והערות השגחה - מסומנים על המפה בכל יעד.',
            bg: 'bg-sunset',
            titleColor: 'text-cream',
            textColor: 'text-cream/90',
          },
          {
            emoji: '🇮🇱',
            title: 'מידע פרקטי לישראלים',
            text: 'טיסות ישירות מנתב"ג, ויזות, eSIM, תשלומים - מה שבאמת צריך לדעת לפני שטסים.',
            bg: 'bg-zest',
            titleColor: 'text-night',
            textColor: 'text-night/75',
          },
        ].map((f, i) => (
          <div
            key={f.title}
            className={`card-pop rounded-3xl p-6 ${f.bg} ${i === 1 ? 'sm:-rotate-1' : i === 2 ? 'sm:rotate-1' : ''}`}
          >
            <div className="text-3xl">{f.emoji}</div>
            <h3 className={`display mt-3 text-xl ${f.titleColor}`}>{f.title}</h3>
            <p className={`mt-2 text-sm font-medium leading-relaxed ${f.textColor}`}>{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
