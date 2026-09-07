/**
 * Which destinations carry the SEO guide layer, and which URLs go in the
 * sitemap.
 *
 * ## Why this is a pinned list and not a live query
 *
 * The obvious implementation is to score all 166 destinations on data
 * completeness and take the top 30 at build time. That is how the list below
 * was *produced* (the scoring is recorded in SEO_PLAN.md), but it is not how it
 * is *read*: a live score means that adding places to a city in a routine data
 * session silently pushes another city out of the sitemap, after Google has
 * already indexed it. Dropping a URL from a sitemap is a signal, and it should
 * never be an accident of an unrelated commit.
 *
 * So the set is explicit. Growing it is a deliberate edit, which is exactly what
 * SEO_NEXT_STEPS.md asks for once the first batch proves out.
 *
 * ## Why only 30 of 166
 *
 * All 166 destination pages exist and keep working - this list does not hide
 * anything. What it controls is which pages get the long-form guide section and
 * which are submitted in the sitemap. A young domain that submits 166 pages of
 * uneven depth risks being classified as thin site-wide, which would cost far
 * more than the traffic the extra pages could win.
 *
 * Every slug here clears all of: >= 13 places, >= 3 itinerary days, a full
 * `practical` block, an `iconicLandmark`, and an `editorialRating` verdict.
 * `src/lib/seo/selection.test.ts` asserts those floors against the real catalog,
 * so a data change that hollows one out fails the build rather than shipping a
 * thin page.
 */

/**
 * The 30, in the order the completeness score produced. Order is not meaningful
 * to search engines; it is kept so the list can be compared to SEO_PLAN.md.
 */
export const SEO_DESTINATION_SLUGS = [
  'vienna',
  'new-york',
  'dubai',
  'barcelona',
  'paris',
  'prague',
  'rome',
  'london',
  'athens',
  'tokyo',
  'berlin',
  'budapest',
  'tbilisi',
  'bangkok',
  'buenos-aires',
  'florence',
  'abu-dhabi',
  'bratislava',
  'venice',
  'grand-canyon',
  'madrid',
  'queenstown',
  'kathmandu',
  'krakow',
  'santorini-mykonos',
  'rio-de-janeiro',
  'reykjavik',
  'kyoto',
  'lisbon',
  'warsaw',
] as const;

export type SeoDestinationSlug = (typeof SEO_DESTINATION_SLUGS)[number];

const SEO_SET: ReadonlySet<string> = new Set(SEO_DESTINATION_SLUGS);

/**
 * Does this destination get the guide section and a sitemap entry?
 *
 * The other 136 destinations still render their normal catalog page and still
 * get unique metadata - they are simply not promoted yet.
 */
export function isSeoDestination(slug: string): boolean {
  return SEO_SET.has(slug);
}

/**
 * The countries submitted in the sitemap: those that actually contain one of
 * the 30.
 *
 * All 83 country pages exist and are crawlable. Submitting only the 22 that back
 * a promoted destination keeps the submitted set uniformly substantive, and
 * keeps the internal linking honest - a country page in the sitemap is one a
 * guide page links up to.
 */
export function seoCountrySlugs(
  destinations: readonly { slug: string; countrySlug: string }[],
): string[] {
  const slugs = destinations
    .filter((d) => isSeoDestination(d.slug))
    .map((d) => d.countrySlug);
  return [...new Set(slugs)].sort();
}
