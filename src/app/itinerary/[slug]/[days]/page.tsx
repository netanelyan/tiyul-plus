import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { hePrefix, inHe } from '@/lib/hebrew';
import { daysHe } from '@/lib/duration';
import { itineraryDays } from '@/lib/seo/guide';
import {
  ITINERARY_LENGTHS,
  isItineraryLength,
  rolledOutItineraryPages,
  toDestLike,
} from '@/lib/seo/itineraries';

/** The catalog, in the shape the rollout function takes. Computed once per module. */
const ROLLOUT_INPUT = destinations.map(toDestLike);
import { pageMetadata } from '@/lib/seo/site';
import { breadcrumbLd } from '@/lib/seo/jsonLd';
import JsonLd from '@/components/seo/JsonLd';
import PhotoCredits from '@/components/PhotoCredits';
import { creditsFor } from '@/lib/server/photoCredit';
import CatalogImage from '@/components/CatalogImage';
import { categoryMeta } from '@/lib/categories';
import type { Place } from '@/lib/types';
import ItineraryMap from './ItineraryMap';
import OpenInPlanner from './OpenInPlanner';
import { seasonFactTitle, travelFactTitle } from '@/lib/domestic';

/**
 * "maslul 5 yamim be-Roma" (a 5-day Rome itinerary) - the query shape Israelis actually type.
 *
 * ## Why this page type exists
 *
 * The site had indexable destination, country and collection pages and nothing for
 * the real query. A page about Rome is not a page about a five-day Rome itinerary,
 * and the second is what gets searched. See `lib/seo/itineraries.ts` for the page
 * set, the market rollout order and why only 30 ship first.
 *
 * ## Why it is not a thin page
 *
 * Every block below is real catalog content, unique to this pair or this city: the
 * actual stops for this length with their own descriptions, a map of exactly those
 * stops, the real season line, the real kashrut note (including the honest "there is
 * nothing here" ones), flights from TLV, and an editorial verdict that names
 * drawbacks. Nothing is generated and nothing is padded.
 *
 * ## And it is a landing page, not an article
 *
 * `OpenInPlanner` opens **this exact itinerary** in the planner, editable, in one
 * tap. That is the difference between a reader and a user, and it is the only thing
 * on the page a competitor cannot copy from the catalog.
 *
 * Static: `generateStaticParams` returns the rolled-out set, and `dynamicParams`
 * is false, so a length that is not rolled out 404s rather than rendering on demand.
 * That keeps the crawlable surface exactly the submitted surface.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return rolledOutItineraryPages(ROLLOUT_INPUT).map((p) => ({
    slug: p.slug,
    days: String(p.days),
  }));
}

function resolve(slugRaw: string, daysRaw: string) {
  const days = Number(daysRaw);
  if (!Number.isInteger(days) || !isItineraryLength(days)) return null;
  const dest = destinations.find((d) => d.slug === slugRaw);
  if (!dest || dest.itinerary.length < days) return null;
  const country = countries.find((c) => c.slug === dest.countrySlug);
  if (!country) return null;
  return { dest, country, days };
}

/** "maslul 5 yamim be-Roma" (a 5-day Rome itinerary) - hePrefix, because Vienna and Venice both start with a vav. */
const pageTitle = (name: string, days: number) => `מסלול ${daysHe(days)} ${inHe(name)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; days: string }>;
}): Promise<Metadata> {
  const { slug, days: daysRaw } = await params;
  const r = resolve(slug, daysRaw);
  if (!r) return pageMetadata({ path: '/itinerary', title: 'מסלול', noindex: true });
  const { dest, days } = r;
  const stops = itineraryDays(dest)
    .slice(0, days)
    .reduce((n, d) => n + d.places.length, 0);

  return pageMetadata({
    path: `/itinerary/${dest.slug}/${days}`,
    title: `${pageTitle(dest.name, days)} - מסלול יום-יום עם מפה | טיול+`,
    /*
      The description carries the two facts that differentiate this page from the
      destination page: the length and the real stop count. Both computed - a
      hand-written description would drift the moment the catalog gains a place.
    */
    description: `מסלול מוכן ${daysHe(days)} ${inHe(dest.name)}: ${stops} עצירות, יום-יום, עם מפה, ${
      dest.bestSeason ? `עונה מומלצת ו` : ''
    }טיסות מתל אביב. אפשר לפתוח אותו במתכנן ולערוך לתאריכים שלכם.`,
    images: dest.photo ? [{ url: dest.photo, alt: dest.name }] : undefined,
  });
}

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ slug: string; days: string }>;
}) {
  const { slug, days: daysRaw } = await params;
  const r = resolve(slug, daysRaw);
  if (!r) notFound();
  const { dest, country, days } = r;

  const allDays = itineraryDays(dest);
  const shown = allDays.slice(0, days);
  const stops = shown.reduce((n, d) => n + d.places.length, 0);
  const title = pageTitle(dest.name, days);
  /** The stops on this itinerary only - the map must match the page, not the city. */
  const mapPlaces = shown.flatMap((d) => d.places);

  /** Other lengths of the same city that are actually live - internal linking, no dead ends. */
  const siblings = rolledOutItineraryPages(ROLLOUT_INPUT)
    .filter((p) => p.slug === dest.slug && p.days !== days)
    .sort((a, b) => a.days - b.days);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8" dir="rtl">
      <JsonLd
        data={breadcrumbLd([
          { name: 'טיול+', path: '/' },
          { name: 'יעדים', path: '/countries' },
          { name: country.name, path: `/countries/${country.slug}` },
          { name: dest.name, path: `/destinations/${dest.slug}` },
          { name: title, path: `/itinerary/${dest.slug}/${days}` },
        ])}
      />

      {/* ---------- Breadcrumb ---------- */}
      <nav aria-label="מסלול ניווט" className="text-xs font-semibold text-night/65">
        <Link href="/countries" className="hover:text-sunset-deep">
          יעדים
        </Link>
        {' / '}
        <Link href={`/countries/${country.slug}`} className="hover:text-sunset-deep">
          {country.name}
        </Link>
        {' / '}
        <Link href={`/destinations/${dest.slug}`} className="hover:text-sunset-deep">
          {dest.name}
        </Link>
      </nav>

      {/* ---------- Hero ---------- */}
      <header className="mt-3">
        <h1 className="display text-3xl font-black text-night sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-night/70">
          {stops} עצירות · {daysHe(days)} · {dest.nameLocal}
          {dest.editorialRating ? ` · המלצת הצוות ${dest.editorialRating.score}/5` : ''}
        </p>
        <p className="mt-3 text-base leading-relaxed text-night/80">{dest.summary}</p>
      </header>

      {/*
        ---------- The CTA, above the itinerary ----------
        A reader who already knows they want this should not have to scroll the whole
        route to act. The same button repeats at the bottom for one who read it all.
      */}
      <div className="mt-5">
        <OpenInPlanner slug={dest.slug} days={days} label={`בנו את ${title} לתאריכים שלכם`} />
      </div>

      {/* ---------- The map of exactly these stops ---------- */}
      {mapPlaces.length > 0 && (
        <section className="mt-7">
          <h2 className="text-lg font-bold text-night">המסלול על המפה</h2>
          <div className="mt-2 h-72 overflow-hidden rounded-2xl ring-1 ring-night/10 sm:h-96">
            <ItineraryMap places={mapPlaces} center={dest.center} zoom={dest.zoom} />
          </div>
        </section>
      )}

      {/* ---------- Day by day ---------- */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-night">{title} - יום אחרי יום</h2>
        <ol className="mt-3 space-y-4">
          {shown.map((d) => (
            <li
              key={d.day}
              className="rounded-2xl bg-shell p-4 ring-1 ring-night/10"
            >
              <h3 className="border-e-4 border-sunset pe-3 text-base font-black text-night">
                יום {d.day}: {d.title}
              </h3>
              {d.notes && <p className="mt-1.5 text-sm text-night/70">{d.notes}</p>}
              <ul className="mt-3 space-y-3">
                {d.places.map((p) => (
                  <li key={p.id} className="flex gap-3">
                    <Thumb place={p} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-night">
                        {p.name}
                        {p.mustSee && <span className="ms-1 text-zest">★</span>}
                      </p>
                      <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-night/70">
                        {p.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {allDays.length > days && (
          /*
            Honesty, and it is also the internal link that makes the longer page
            worth crawling: this city has more curated days than this page shows.
          */
          <p className="mt-3 text-xs font-semibold text-night/65">
            {inHe(dest.name)} יש אצלנו מסלול מלא של {daysHe(allDays.length)} - הדף הזה מציג את{' '}
            {daysHe(days)} הראשונים שלו.
          </p>
        )}
      </section>

      {/* ---------- The facts that are unique to this city ---------- */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        {dest.bestSeason && (
          <Fact
            title={seasonFactTitle(dest, `מתי כדאי לטוס ${inHe(dest.name)}`, `מתי כדאי לנסוע ${inHe(dest.name)}`)}
            text={dest.bestSeason}
          />
        )}
        <Fact
          title={travelFactTitle(dest, `טיסות ${hePrefix('ל', dest.name)} מתל אביב`)}
          text={dest.practical.flights}
        />
        <Fact title="להתנייד ביעד" text={dest.practical.gettingAround} />
        <Fact title={`ויזה ${hePrefix('ל', country.name)}`} text={country.practical.visa} />
        {/*
          The kashrut note renders whatever the catalog says, including the entries
          that say plainly there is nothing here. That honesty is the point: a
          traveller who keeps kosher needs the negative answer more than the positive
          one, and hiding it would make every page look equally good.
        */}
        <div className="sm:col-span-2">
          <Fact title={`אוכל כשר ${inHe(dest.name)}`} text={dest.practical.kosherOverview} />
        </div>
        {dest.editorialRating && (
          <div className="sm:col-span-2">
            <Fact
              title={`מה דעתנו על ${dest.name}`}
              text={dest.editorialRating.verdict}
            />
          </div>
        )}
      </section>

      {/* ---------- Other lengths of the same city ---------- */}
      {siblings.length > 0 && (
        <nav className="mt-8" aria-label="אורכים אחרים">
          <h2 className="text-sm font-bold text-night/65">מסלולים נוספים {inHe(dest.name)}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link
                key={s.days}
                href={`/itinerary/${s.slug}/${s.days}`}
                className="rounded-xl bg-shell px-3.5 py-2 text-sm font-bold text-night ring-1 ring-night/10 transition hover:bg-cream"
              >
                {pageTitle(dest.name, s.days)}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* ---------- The CTA again, for the reader who got this far ---------- */}
      <div className="mt-8">
        <OpenInPlanner slug={dest.slug} days={days} label={`פתחו את ${title} במתכנן`} />
        <p className="mt-2 text-center text-xs font-medium text-night/65">
          נפתח במתכנן וניתן לעריכה - להוסיף ימים, להזיז עצירות ולשתף עם מי שנוסע איתכם.
        </p>
      </div>

      <div className="mt-8">
        <Link
          href={`/destinations/${dest.slug}`}
          className="text-sm font-bold text-sunset-deep underline hover:text-sunset"
        >
          כל מה שיש לנו {inHe(dest.name)} ←
        </Link>
      </div>

      {/* Attribution is a licence requirement, not a nicety - most catalog photos are CC BY / CC BY-SA. */}
      <PhotoCredits credits={creditsFor([dest.photo, ...mapPlaces.map((p) => p.photo)])} />
    </main>
  );
}

/**
 * The category tile is the BACKGROUND and the photo sits on top - copied from
 * GuideThumb deliberately. A place with no photo, or one whose URL 404s, reveals the
 * tile instead of an empty box, and it needs no client state to do it (the itinerary
 * page is the crawlable surface and must stay a server component).
 */
function Thumb({ place }: { place: Place }) {
  const meta = categoryMeta[place.category];
  return (
    <div
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-night/10"
      style={{ backgroundColor: `${meta.color}1a` }}
      role="img"
      aria-label={meta.label}
    >
      <span aria-hidden className="absolute inset-0 flex items-center justify-center text-xl opacity-80">
        {meta.emoji}
      </span>
      {place.photo && <CatalogImage src={place.photo} alt="" sizes="64px" />}
    </div>
  );
}

function Fact({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
      <h3 className="text-sm font-black text-night">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-night/75">{text}</p>
    </div>
  );
}

/** Kept so a future length addition cannot silently miss the type. */
export const _lengths = ITINERARY_LENGTHS;
