import type { Country, Destination, DestinationSummary } from '@/lib/types';

/**
 * חיפוש ערים משותף לכל בוררי הערים באתר (אשף התכנון, הוספת יום לטיול).
 * מחפש על שם בעברית, שם מקומי, slug, שם המדינה וכינויים נפוצים - אותה
 * גישה שכבר קיימת בחיפוש הכשרות, במקום אחד כדי שלא תתפצל.
 */

export interface CityOption {
  slug: string;
  name: string;
  nameLocal: string;
  flag: string;
  country: string;
  /** כל שדות החיפוש מנורמלים ומחוברים - להשוואה מהירה */
  haystack: string;
}

// כינויים בעברית שלא מופיעים ב-name/nameLocal - רק תקלות איות שכיחות
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
 * אותן אפשרויות מתוך DestinationSummary - הצורה שדפי שרת מקבלים
 * מה-provider (שם המדינה כבר פתור בתוכה, בלי צורך ברשימת המדינות).
 */
export function buildCityOptionsFromSummaries(summaries: DestinationSummary[]): CityOption[] {
  return summaries.map((d) => toOption(d, d.country));
}

export function filterCities(options: CityOption[], query: string): CityOption[] {
  const q = normalizeQuery(query);
  if (!q) return options;
  return options.filter((o) => o.haystack.includes(q));
}
