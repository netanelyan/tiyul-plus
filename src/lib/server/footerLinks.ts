/**
 * ---------- What the footer links to, derived from the data ----------
 *
 * **Server only.** This file imports the catalog, so no client component may
 * touch it - that is exactly how 492kB compressed once entered every page on
 * the site through `SiteNav`. The footer is a server component, and all that
 * leaves here is a small list of links.
 *
 * ## Why derived and not hand-written
 *
 * The footer's "popular destinations" list is exactly the kind of thing that
 * gets written once and quietly goes stale: the data session adds
 * destinations every night, and a fixed list would keep pointing at the same
 * eight cities from 2026 while the catalog doubled itself. Same for the
 * numbers - "1,800 places" in the footer is a number that will be wrong
 * within a week.
 *
 * ## How the destinations are picked
 *
 * By the editorial rating that already exists on every destination
 * (`editorialRating.score`), with a tie-breaker by place count. And one more
 * rule that matters more than the rating: **at most two destinations per
 * country.** Without it the list fills with Italy and Greece and looks like
 * a mistake, not a choice.
 */

import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

export interface FooterLink {
  href: string;
  label: string;
}

/** How many of each kind. A row of chips, not a column - hence small numbers. */
const MAX_DESTINATIONS = 10;
const MAX_COUNTRIES = 6;
const MAX_PER_COUNTRY = 2;

/** Above this the name no longer fits a chip without breaking the row */
const MAX_NAME_CHARS = 12;

/**
 * A name that fits a chip.
 *
 * The editorial rating alone put the Hebrew names for "the Grand Canyon and
 * the Southwest parks" and "Queenstown and the South Island" into the
 * footer - perfectly correct names that look ragged in a chip row and push
 * every row to two lines. The disqualifiers are length, the Hebrew
 * conjunctive vav that betrays a compound name ("X and Y"), and a hyphen
 * that does the same.
 *
 * This filters **which pool we pick from**, not what is correct: these
 * destinations stay in the catalog and in the "all destinations" link at
 * the end of the row.
 */
const isChipName = (name: string) =>
  name.length <= MAX_NAME_CHARS && !/\sו/.test(name) && !name.includes('-');

const score = (d: (typeof destinations)[number]) => d.editorialRating?.score ?? 0;

/** The most significant destinations, reasonably spread across countries */
export const footerDestinations: FooterLink[] = (() => {
  const ranked = [...destinations]
    .filter((d) => isChipName(d.name))
    .sort(
      (a, b) => score(b) - score(a) || b.places.length - a.places.length || a.slug.localeCompare(b.slug),
    );
  const perCountry = new Map<string, number>();
  const picked: FooterLink[] = [];
  for (const d of ranked) {
    if (picked.length >= MAX_DESTINATIONS) break;
    const used = perCountry.get(d.countrySlug) ?? 0;
    if (used >= MAX_PER_COUNTRY) continue;
    perCountry.set(d.countrySlug, used + 1);
    picked.push({ href: `/destinations/${d.slug}`, label: d.name });
  }
  return picked;
})();

/** The countries the catalog is deepest in - by destination count, then places */
export const footerCountries: FooterLink[] = (() => {
  const byCountry = new Map<string, { dests: number; places: number }>();
  for (const d of destinations) {
    const acc = byCountry.get(d.countrySlug) ?? { dests: 0, places: 0 };
    acc.dests += 1;
    acc.places += d.places.length;
    byCountry.set(d.countrySlug, acc);
  }
  return [...countries]
    .filter((c) => byCountry.has(c.slug) && isChipName(c.name))
    .sort((a, b) => {
      const x = byCountry.get(a.slug)!;
      const y = byCountry.get(b.slug)!;
      return y.dests - x.dests || y.places - x.places || a.slug.localeCompare(b.slug);
    })
    .slice(0, MAX_COUNTRIES)
    .map((c) => ({ href: `/countries/${c.slug}`, label: c.name }));
})();

/**
 * The catalog's scope. **No number here is hand-written** - see the test
 * that counts from the data and compares, so this cannot be replaced with a
 * "convenient" string in the future.
 */
export const catalogCounts = {
  places: destinations.reduce((n, d) => n + d.places.length, 0),
  destinations: destinations.length,
  countries: countries.filter((c) => destinations.some((d) => d.countrySlug === c.slug)).length,
};

/** The "1,814 places · 166 destinations · 83 countries" line - numbers in readable Hebrew formatting */
export const coverageCountsLine = (): string =>
  [
    `${catalogCounts.places.toLocaleString('he-IL')} מקומות`,
    `${catalogCounts.destinations} יעדים`,
    `${catalogCounts.countries} מדינות`,
  ].join(' · ');
