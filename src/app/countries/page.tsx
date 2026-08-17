import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import DestinationBrowser from '@/components/DestinationBrowser';
import { buildDestinationCards } from '@/lib/destinationCards';

export const metadata = { title: 'יעדים | טיול+' };

/**
 * The destinations catalog.
 *
 * Used to be a grid of **country** cards. Netanel showed a competitor's
 * destination browser - continent tabs with counters and character chips -
 * and said it's a good feature, and it is: a country card cannot tell you
 * it is romantic or good for families, so it is bad for discovery. Now the
 * grid is **destinations**, and the countries stay one click away from
 * every card and from the search.
 *
 * The facets are computed on the server (`buildDestinationCards` imports
 * the whole catalog) and what goes to the client is a flat array - the
 * catalog itself does not enter the bundle.
 */
export default async function CountriesPage() {
  const provider = getProvider();
  const [countries, dests] = await Promise.all([
    provider.getCountries(),
    provider.getDestinations(),
  ]);
  const cards = buildDestinationCards();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl text-night">לאן טסים?</h1>
          <p className="mt-2 text-night/60">
            {dests.length} יעדים ב-{countries.length} מדינות, כל אחד עם מסלול מוכן, מפה ושכבת
            כשרות. אפשר לבחור יבשת, ואז לצמצם לפי אופי.
          </p>
        </div>
        <Link
          href="/chat"
          className="rounded-xl bg-shell px-4 py-2.5 text-sm font-bold text-night ring-1 ring-night/15 transition hover:ring-night/30"
        >
          לא בטוחים? לשאול את הסוכן ←
        </Link>
      </div>

      {/*
        No site-wide search field here. There was one, and it created two
        search fields stacked one above the other - exactly the duplication
        removed from the nav. The browser has its own filtering that narrows
        this grid, and the site-wide search (which also finds places inside
        cities) stays on the nav icon and the Ctrl+K shortcut, on every page
        of the site.
      */}
      <div className="mt-6">
        <DestinationBrowser cards={cards} />
      </div>

      <div className="mt-10 rounded-2xl bg-night/[0.03] p-5">
        <h2 className="text-sm font-bold text-night/70">לגלוש לפי מדינה</h2>
        <p className="mt-1 text-xs font-medium text-night/50">
          ויזה, מטבע, סים ותשלומים הם מידע ברמת המדינה - שם הוא נמצא.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <Link
              key={c.slug}
              href={`/countries/${c.slug}`}
              className="rounded-full bg-shell px-3 py-1.5 text-xs font-semibold text-night/70 ring-1 ring-night/10 transition hover:text-night hover:ring-night/25"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
