import Link from 'next/link';
import Flag from '@/components/Flag';
import SectionHead from '@/components/home/SectionHead';
import type { CountryTile } from '@/lib/server/homeSections';

/**
 * Section 7 - popular countries as flag tiles with counts.
 *
 * The direct analogue of a storefront's "popular teams" row: a crest, a name,
 * "26 shirts". Here it is a flag, a name, "5 destinations · 81 places" - both
 * numbers counted from the catalog. Ten tiles, five across on desktop.
 */

/** "5 destinations" with the dual for two, and "one destination" for one. */
function destinationsHe(n: number): string {
  if (n === 1) return 'יעד אחד';
  if (n === 2) return 'שני יעדים';
  return `${n} יעדים`;
}

export default function PopularCountries({ tiles }: { tiles: CountryTile[] }) {
  return (
    <section className="py-10">
      <SectionHead
        title="מדינות פופולריות"
        subtitle="ויזה, מטבע, סים ותשלומים - לכל מדינה עמוד משלה, ובתוכו הערים."
        href="/countries"
        linkLabel="לכל המדינות"
      />

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {tiles.map((c) => (
          <li key={c.slug}>
            <Link
              prefetch={false}
              href={`/countries/${c.slug}`}
              className="card-pop flex h-full flex-col items-center rounded-2xl bg-shell px-3 py-5 text-center ring-1 ring-night/10 transition hover:ring-night/25"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream ring-1 ring-night/10">
                <Flag flag={c.flag} label={c.name} size="lg" />
              </span>
              <span className="mt-3 text-base font-extrabold leading-tight text-night">{c.name}</span>
              <span className="mt-1 text-xs font-semibold text-night/55">
                {destinationsHe(c.destinations)} · {c.places} מקומות
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
