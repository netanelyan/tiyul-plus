import type { Country, Destination, DestinationSummary } from '@/lib/types';

/**
 * City search shared by all city pickers on the site (the planning wizard,
 * adding a day to a trip). Searches on the Hebrew name, the local name, the
 * slug, the country name and common aliases - the same approach that
 * already exists in the kosher search, in one place so it does not fork.
 */

export interface CityOption {
  slug: string;
  name: string;
  nameLocal: string;
  flag: string;
  country: string;
  /** All the search fields normalized and joined - for fast comparison */
  haystack: string;
}

// Hebrew aliases that do not appear in name/nameLocal - common misspellings only
const ALIASES: Record<string, string[]> = {
  vienna: ['וינא'],
  prague: ["פראג'"],
  rome: ['רום'],
  bangkok: ['באנגקוק'],
};

export const normalizeQuery = (s: string) => s.trim().toLowerCase().replace(/['׳״]/g, '');

type CitySource = Pick<Destination, 'slug' | 'name' | 'nameLocal' | 'flag'>;

function toOption(d: CitySource, country: string): CityOption {
  return {
    slug: d.slug,
    name: d.name,
    nameLocal: d.nameLocal,
    flag: d.flag,
    country,
    haystack: [d.name, d.nameLocal, d.slug, country, ...(ALIASES[d.slug] ?? [])]
      .map(normalizeQuery)
      .join(' | '),
  };
}

export function buildCityOptions(destinations: Destination[], countries: Country[]): CityOption[] {
  const countryName = new Map(countries.map((c) => [c.slug, c.name]));
  return destinations.map((d) => toOption(d, countryName.get(d.countrySlug) ?? ''));
}

/**
 * The same options from a DestinationSummary - the shape server pages get
 * from the provider (the country name is already resolved inside it, no
 * need for the country list).
 */
export function buildCityOptionsFromSummaries(summaries: DestinationSummary[]): CityOption[] {
  return summaries.map((d) => toOption(d, d.country));
}

export function filterCities(options: CityOption[], query: string): CityOption[] {
  const q = normalizeQuery(query);
  if (!q) return options;
  return options.filter((o) => o.haystack.includes(q));
}
