import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProvider } from '@/lib/providers';
import { countries } from '@/data/countries';

export function generateStaticParams() {
  return countries.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const country = countries.find((c) => c.slug === slug);
  return { title: country ? `${country.name} | טיול+` : 'טיול+' };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = getProvider();
  const country = await provider.getCountry(slug);
  if (!country) notFound();
  const cities = (await provider.getDestinations()).filter((d) => d.countrySlug === slug);

  const practicalItems: { title: string; text: string }[] = [
    { title: 'ויזה', text: country.practical.visa },
    { title: 'מטבע', text: country.practical.currency },
    { title: 'סים וגלישה', text: country.practical.sim },
    { title: 'תשלומים', text: country.practical.payments },
  ];

  return (
    <div>
      {/* Country hero */}
      <div
        className="photo-bg relative overflow-hidden rounded-2xl px-6 py-10 sm:px-10"
        style={
          country.photo
            ? {
                backgroundImage: `linear-gradient(200deg, rgba(18,16,32,0.4) 0%, rgba(18,16,32,0.8) 85%), url(${country.photo})`,
              }
            : undefined
        }
      >
        <div className="text-sm font-medium text-cream/70">
          <Link href="/" className="transition hover:text-cream">יעדים</Link> / {country.name}
        </div>
        <div className="mt-3 max-w-2xl">
          <h1 className="display text-3xl text-cream sm:text-4xl">
            <span className="me-2 align-middle text-3xl">{country.flag}</span>
            {country.name}
            <span className="ms-3 text-lg font-medium text-cream/60">{country.nameLocal}</span>
          </h1>
          <p className="mt-4 leading-relaxed text-cream/90">{country.summary}</p>
        </div>
      </div>

      {/* Practical info */}
      <section className="mt-12">
        <h2 className="display text-2xl text-night">לפני שטסים ל{country.name}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {practicalItems.map((item) => (
            <div key={item.title} className="card-pop rounded-2xl bg-shell p-5 ring-1 ring-night/10">
              <div className="font-bold text-night">{item.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-night/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cities */}
      <section className="mt-12">
        <div>
          <h2 className="display text-2xl text-night">הערים ב{country.name}</h2>
          <p className="mt-2 text-night/60">
            כל עיר עם מסלול מוכן יום-אחרי-יום, מפה אינטראקטיבית ושכבת כשרות.
          </p>
        </div>
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((d) => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="card-pop group overflow-hidden rounded-2xl bg-shell ring-1 ring-night/10"
            >
              <div
                className="photo-bg relative h-44"
                style={
                  d.photo
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(15,14,26,0) 40%, rgba(15,14,26,0.7) 100%), url(${d.photo})`,
                      }
                    : undefined
                }
              >
                <div className="absolute bottom-3 start-4">
                  <h3 className="display text-2xl text-cream drop-shadow">{d.name}</h3>
                  <div className="text-xs font-medium text-cream/80">{d.nameLocal}</div>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-night/75">{d.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-night/5 px-3 py-1.5 text-night/70">
                    {d.days} ימים
                  </span>
                  {d.kosherCount > 0 && (
                    <span className="rounded-full bg-[#00a896]/10 px-3 py-1.5 text-[#007f76]">
                      {d.kosherCount} נקודות כשרות
                    </span>
                  )}
                  {d.editorialRating && (
                    <span
                      className="rounded-full bg-sunset/10 px-3 py-1.5 text-sunset-deep"
                      title="דירוג עריכתי של צוות טיול+ - לא ממוצע של ביקורות משתמשים"
                    >
                      המלצת הצוות: {d.editorialRating.score.toFixed(1)}/5
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
