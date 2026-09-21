import type { Metadata } from 'next';
import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import DestinationBrowser from '@/components/DestinationBrowser';
import { buildDestinationCards } from '@/lib/destinationCards';
import { pageMetadata } from '@/lib/seo/site';
import { catalogCounts } from '@/lib/server/footerLinks';
import JsonLd from '@/components/seo/JsonLd';
import { collectionPageLd } from '@/lib/seo/jsonLd';

/*
  This page had a title and nothing else, so it inherited the homepage's
  description as well as its canonical - i.e. the catalog hub, the page most
  likely to rank for a destination-catalog query and the one that passes
  authority to every destination page, was describing itself as the homepage.

  The counts come from catalogCounts rather than being typed, for the reason
  the guard test in marketingPages enforces: /about once carried a
  hand-written place count that had drifted by 1,426.
*/
export const metadata: Metadata = pageMetadata({
  path: '/countries',
  title: 'יעדים | טיול+',
  description: `קטלוג היעדים של טיול+: ${catalogCounts.destinations} יעדים ב-${catalogCounts.countries} מדינות, כל אחד עם מסלול מוכן, מפה ושכבת כשרות. אפשר לסנן לפי יבשת ולפי אופי הטיול.`,
});

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
      {/*
        The list is every destination the browser renders, not a sample and not
        the promoted subset: filtering here is client-side, so all of them are
        genuinely in this page's DOM, and a list that named fewer would be
        describing a different page than the one that shipped.
      */}
      <JsonLd
        data={collectionPageLd({
          name: 'קטלוג היעדים של טיול+',
          description: `${dests.length} יעדים ב-${countries.length} מדינות, כל אחד עם מסלול מוכן, מפה ושכבת כשרות.`,
          path: '/countries',
          items: cards.map((c) => ({ name: c.name, path: `/destinations/${c.slug}` })),
        })}
      />

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
      {/*
        The country list is rendered by the browser now, not here, so that the
        search filters it too. It used to sit outside the client component and
        therefore never filtered: a nonsense query emptied the grid and dropped
        every counter to 0 while 83 country links stayed on screen underneath.
        Only slug/name/nameLocal cross the boundary - the catalog stays here.
      */}
      <div className="mt-6">
        <DestinationBrowser
          cards={cards}
          countries={countries.map((c) => ({
            slug: c.slug,
            name: c.name,
            nameLocal: c.nameLocal,
          }))}
        />
      </div>
    </div>
  );
}
