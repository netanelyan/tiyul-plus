import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canonical, metaDescription } from '@/lib/seo/site';
import { breadcrumbLd, countryLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { getProvider } from '@/lib/providers';
import Flag from '@/components/Flag';
import CardPhoto, { HERO_OVERLAY } from '@/components/CardPhoto';
import { countries } from '@/data/countries';
import PhotoCredits from '@/components/PhotoCredits';
import { creditsFor, shareImage } from '@/lib/server/photoCredit';

export function generateStaticParams() {
  return countries.map((c) => ({ slug: c.slug }));
}

/**
 * This page already set a title. It had no description, no canonical and no
 * per-country Open Graph, so a shared link showed the site-wide card and the
 * search snippet fell back to whatever Google chose to scrape.
 *
 * The description is built from the country's curated `tagline` and `summary`;
 * nothing here is written or generated.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const country = countries.find((c) => c.slug === slug);
  if (!country) return {};

  const title = `טיול ל${country.name}: יעדים, ויזה ומידע למטייל הישראלי | טיול+`;
  const description = metaDescription(country.tagline, country.summary);
  const url = canonical(`/countries/${country.slug}`);
  // Widened to what the original really allows - the stored 500px thumb is below
  // the width Facebook and WhatsApp need for a large card. See `shareImage`.
  const image = shareImage(country.photo, `${country.name} - ${country.tagline}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      locale: 'he_IL',
      siteName: 'טיול+',
      url,
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
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
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'טיול+', path: '/' },
            { name: 'יעדים', path: '/countries' },
            { name: country.name, path: `/countries/${country.slug}` },
          ]),
          countryLd(country, cities.length),
        ]}
      />
      {/* Country hero */}
      {/*
        The hero photograph is an image layer rather than a `background-image`, so it goes
        through `next/image` like every other catalog photo and is served from our own
        mirror. It keeps `priority` - a hero is the LCP element, and lazy-loading it would
        make the page measurably slower, which is why the cards below it do lazy-load and
        this does not. The gradient is the same value it was as a background layer.

        The two content blocks carry `relative` so they paint above the overlay: the image
        and the overlay are absolutely positioned, and in-flow siblings would otherwise sit
        underneath them.
      */}
      <div className="photo-bg relative overflow-hidden rounded-2xl px-6 py-10 sm:px-10">
        <CardPhoto
          photo={country.photo}
          priority
          className="absolute inset-0"
          sizes="(min-width: 1152px) 1120px, 100vw"
          overlay={HERO_OVERLAY}
        />
        <div className="relative text-sm font-medium text-cream/70">
          <Link href="/" className="transition hover:text-cream">יעדים</Link> / {country.name}
        </div>
        <div className="relative mt-3 max-w-2xl">
          <h1 className="display text-3xl text-cream sm:text-4xl">
            <Flag flag={country.flag} label={country.name} size="lg" className="me-2 align-middle" />
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
          <p className="mt-2 text-night/70">
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
              <CardPhoto
                photo={d.photo}
                className="photo-bg relative h-44"
                sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 94vw"
                overlay="linear-gradient(180deg, rgba(15,14,26,0) 40%, rgba(15,14,26,0.7) 100%)"
              >
                <div className="absolute bottom-3 start-4">
                  <h3 className="display text-2xl text-cream drop-shadow">{d.name}</h3>
                  <div className="text-xs font-medium text-cream/80">{d.nameLocal}</div>
                </div>
              </CardPhoto>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-night/75">{d.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-night/5 px-3 py-1.5 text-night/70">
                    {d.days} ימים
                  </span>
                  {d.kosherCount > 0 && (
                    <span className="rounded-full bg-lagoon/10 px-3 py-1.5 text-lagoon-deep">
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

      {/* Attribution for the country hero and every city card on this page. */}
      <PhotoCredits credits={creditsFor([country.photo, ...cities.map((d) => d.photo)])} />
    </div>
  );
}
