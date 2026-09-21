import Link from 'next/link';
import CardPhoto from '@/components/CardPhoto';
import SectionHead from '@/components/home/SectionHead';
import { daysHe } from '@/lib/duration';
import type { FlagshipCard } from '@/lib/server/homeSections';

/**
 * Section 4 - the "hot destinations" grid, on the night band.
 *
 * Each tile carries what the catalog actually has for that city: how many
 * places, how long the ready route is, how many kosher places - the way a
 * storefront tile says "26 shirts". The numbers are what make the tile a
 * promise rather than a poster, and they are counted server-side from the
 * data, never typed.
 *
 * A server component: the list is pinned, so there is nothing to pick after
 * mount and no skeleton to show - the tiles are in the HTML.
 *
 * "route for N days" with the Hebrew dual: the number form needs a hyphen
 * after the prefix letter ("for-6 days"), the word forms ("two days", "one
 * day") attach directly. Same rule `formatDurationHe` applies to hours.
 */
function routeLengthHe(days: number): string {
  const d = daysHe(days);
  return /^\d/.test(d) ? `מסלול ל-${d}` : `מסלול ל${d}`;
}

export default function Flagships({ cards }: { cards: FlagshipCard[] }) {
  return (
    <section className="rounded-3xl bg-night px-4 py-8 sm:px-8 sm:py-10">
      <SectionHead
        tone="dark"
        title="היעדים החמים"
        subtitle="הערים שישראלים טסים אליהן הכי הרבה - לכל אחת מסלול מוכן, מפה ושכבת כשרות."
        href="/countries"
        linkLabel="כל הקטלוג"
      />

      {/*
        prefetch={false} on this grid and the two below it: Next prefetches
        every visible Link, and the homepage was fetching 11 route payloads
        several times over - 44 requests and 1.5MB decoded before anybody
        clicks anything. On Israeli mobile data that is real money for pages
        most visitors will not open. The click still works exactly as before;
        only the speculative fetch is gone.
      */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((d) => (
          <Link
            key={d.slug}
            prefetch={false}
            href={`/destinations/${d.slug}`}
            className="card-pop group relative block h-52 overflow-hidden rounded-2xl ring-1 ring-cream/10 sm:h-64"
          >
            {d.photo ? (
              <CardPhoto
                photo={d.photo}
                overlay={null}
                className="photo-bg absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 47vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-night-soft to-night" />
            )}
            {/* A night gradient at the bottom for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/25 to-transparent" />

            {d.score !== undefined && (
              <span className="absolute end-3 top-3 rounded-full bg-cream/95 px-2 py-0.5 text-xs font-extrabold text-night shadow">
                ★ {d.score.toFixed(1)}
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <div className="display text-xl leading-tight text-cream drop-shadow sm:text-2xl">
                {d.name}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-cream/75 sm:text-sm">{d.country}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-cream/15 px-1.5 py-0.5 text-[11px] font-bold text-cream backdrop-blur-sm sm:text-xs">
                  {d.places} מקומות
                </span>
                <span className="rounded-md bg-cream/15 px-1.5 py-0.5 text-[11px] font-bold text-cream backdrop-blur-sm sm:text-xs">
                  {routeLengthHe(d.days)}
                </span>
                {d.kosher > 0 && (
                  <span className="rounded-md bg-lagoon/85 px-1.5 py-0.5 text-[11px] font-bold text-cream sm:text-xs">
                    {d.kosher} כשרים
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
