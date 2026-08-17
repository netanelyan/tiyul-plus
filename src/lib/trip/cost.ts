import type { DailyBudget, DailyCost, DailyCostTier, PlaceSource } from '@/lib/types';
import type { Trip } from './types';

/**
 * The trip-cost calculation. **Everything that happens here is addition and
 * multiplication over stored data** - there is no estimation, no forecast,
 * and no place where a language model touches a number. The input is the
 * table the source published (`DailyCost`) and the number of days the trip
 * allocates to each city; the output is exactly the sum of those.
 */

/** The travel style the traveler chose. Picked once, manually, derived from nothing. */
export type TravelStyle = 'budget' | 'mid' | 'comfort';

export const TRAVEL_STYLES: { id: TravelStyle; label: string; hint: string }[] = [
  { id: 'budget', label: 'חסכוני', hint: 'אוכל רחוב ותחבורה ציבורית' },
  { id: 'mid', label: 'ביניים', hint: 'מסעדות רגילות, כניסה לאתרים' },
  { id: 'comfort', label: 'בנוח', hint: 'מסעדות טובות, מוניות, סיורים' },
];

export function isTravelStyle(v: unknown): v is TravelStyle {
  return v === 'budget' || v === 'mid' || v === 'comfort';
}

/**
 * What we need to know about a city in order to compute. **Two sources, on purpose.**
 *
 * `dailyCost` (src/data/dailyCosts.ts) holds the three category rows the
 * source publishes for each style, so both the "comfort" tier and an
 * explainable range can be derived from it. `dailyBudget` (inside the
 * catalog) holds a published range for only two tiers but covers many more
 * destinations. **The first wins when it exists**, because it covers all
 * three styles; the second expands coverage from 21 to 71 destinations.
 *
 * Both meet the same definition - on-the-ground spending, no flights and no
 * lodging - so it is legitimate to sum them together. Everything that
 * **differs** between them is kept on the row itself
 * (`basis`, `scope`, `upperBoundOnly`) and displayed, instead of being
 * blurred away in the total.
 */
export interface CostCity {
  name: string;
  dailyCost?: DailyCost;
  dailyBudget?: DailyBudget;
}

/** 'components' = sum of the category rows · 'published' = a range the source published */
export type CostBasis = 'components' | 'published';

interface ResolvedDaily {
  currency: string;
  low: number;
  high: number;
  source: PlaceSource;
  basis: CostBasis;
  scope: 'city' | 'country';
  upperBoundOnly: boolean;
}

export interface CityCostLine {
  citySlug: string;
  cityName: string;
  days: number;
  currency: string;
  /** Per day, per person: the minimum (transport and food) and the maximum (plus admissions) */
  perDayLow: number;
  perDayHigh: number;
  /** Multiplied by the number of days this city has in the trip */
  totalLow: number;
  totalHigh: number;
  source: PlaceSource;
  basis: CostBasis;
  /** 'country' = the source publishes at country level, i.e. coarser than the city */
  scope: 'city' | 'country';
  /** The value is an upper bound ("up to"), not a range - see DailyBudget */
  upperBoundOnly: boolean;
}

export interface CurrencyTotal {
  currency: string;
  low: number;
  high: number;
}

export interface TripCost {
  style: TravelStyle;
  /** Cities that have data, in order of their first appearance in the trip */
  lines: CityCostLine[];
  /** Cities in the trip with no data - shown by name, with no number at all */
  missing: { citySlug: string; cityName: string; days: number }[];
  /** A total per currency. A multi-currency trip is never collapsed into one number. */
  totals: CurrencyTotal[];
  /** false the moment even one city has no data - the total is shown as partial */
  complete: boolean;
  /** The check dates of the sources in use, sorted */
  checked: string[];
  /** The bases actually in use - determines which explanation of the range may be shown */
  bases: CostBasis[];
  /** Some row's source measures at country level rather than city level */
  hasCountryScope: boolean;
  /** Some row is an upper bound rather than a range - the total reads "up to" */
  hasUpperBound: boolean;
}

function tierOf(cost: DailyCost, style: TravelStyle): DailyCostTier {
  return style === 'budget' ? cost.budget : style === 'mid' ? cost.mid : cost.comfort;
}

/**
 * The daily range, and both of its ends are fact rather than a safety
 * margin we invented: the lower end is transport and food - what you spend
 * every single day without exception - and the upper end adds the
 * admissions-and-attractions row, i.e. a day that includes a paid entry.
 * In practice a trip is a mix of both kinds of day, hence a range.
 */
export function perDayRange(cost: DailyCost, style: TravelStyle): { low: number; high: number } {
  const t = tierOf(cost, style);
  const low = t.transport + t.food;
  return { low, high: low + t.activities };
}

/**
 * A city's figure for a given style, from whichever of its two sources it
 * has - or null.
 *
 * **null is a valid and common answer**, and not only when the city has no
 * data at all: `dailyBudget` has no "comfort" tier in any destination (the
 * source publishes a top tier that is open-ended upward, and lodging cannot
 * be subtracted from it), so a city that relies on it shows no number when
 * "comfort" is selected. That is precisely this feature's rule - no data,
 * no estimate - only this time it applies to a city+style combination
 * rather than to a whole city.
 */
export function resolveDaily(city: CostCity | undefined, style: TravelStyle): ResolvedDaily | null {
  if (city?.dailyCost) {
    const { low, high } = perDayRange(city.dailyCost, style);
    return {
      currency: city.dailyCost.currency,
      low,
      high,
      source: city.dailyCost.source,
      basis: 'components',
      scope: 'city',
      upperBoundOnly: false,
    };
  }
  const b = city?.dailyBudget;
  if (!b) return null;
  const range = style === 'budget' ? b.budget : style === 'mid' ? b.midRange : b.comfortable;
  if (!range) return null;
  const [low, high] = range;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return {
    currency: b.currency,
    low,
    high,
    source: b.source,
    basis: 'published',
    scope: b.scope ?? 'city',
    upperBoundOnly: b.upperBoundOnly === true,
  };
}

/** How many days the trip allocates to each city, in order of first appearance. */
export function daysPerCity(trip: Pick<Trip, 'days'>): { citySlug: string; days: number }[] {
  const order: string[] = [];
  const count = new Map<string, number>();
  for (const d of trip.days) {
    if (!count.has(d.citySlug)) order.push(d.citySlug);
    count.set(d.citySlug, (count.get(d.citySlug) ?? 0) + 1);
  }
  return order.map((citySlug) => ({ citySlug, days: count.get(citySlug) ?? 0 }));
}

/**
 * The full computation. `cities` is what the screen has already loaded
 * anyway (`useCityData`), so there is no network call and no side effect
 * here.
 *
 * A city with no data **does not silently fall out of the total**: it goes
 * into `missing`, `complete` becomes false, and the UI must say so. That is
 * the only rule here that is not arithmetic, and it is why the function
 * also returns what is missing.
 */
export function tripCost(
  trip: Pick<Trip, 'days'>,
  style: TravelStyle,
  cities: Record<string, CostCity | undefined>,
): TripCost {
  const lines: CityCostLine[] = [];
  const missing: TripCost['missing'] = [];
  const totals = new Map<string, CurrencyTotal>();
  const checked = new Set<string>();

  const bases = new Set<CostBasis>();

  for (const { citySlug, days } of daysPerCity(trip)) {
    const city = cities[citySlug];
    const cityName = city?.name ?? citySlug;
    const daily = resolveDaily(city, style);
    if (!daily) {
      missing.push({ citySlug, cityName, days });
      continue;
    }
    const totalLow = daily.low * days;
    const totalHigh = daily.high * days;
    lines.push({
      citySlug,
      cityName,
      days,
      currency: daily.currency,
      perDayLow: daily.low,
      perDayHigh: daily.high,
      totalLow,
      totalHigh,
      source: daily.source,
      basis: daily.basis,
      scope: daily.scope,
      upperBoundOnly: daily.upperBoundOnly,
    });
    checked.add(daily.source.checked);
    bases.add(daily.basis);
    const acc = totals.get(daily.currency) ?? { currency: daily.currency, low: 0, high: 0 };
    acc.low += totalLow;
    acc.high += totalHigh;
    totals.set(daily.currency, acc);
  }

  return {
    style,
    lines,
    missing,
    totals: [...totals.values()],
    complete: missing.length === 0 && lines.length > 0,
    checked: [...checked].sort(),
    bases: [...bases],
    hasCountryScope: lines.some((l) => l.scope === 'country'),
    hasUpperBound: lines.some((l) => l.upperBoundOnly),
  };
}

/**
 * Rounding for display. Two opposing considerations, and this is the
 * compromise between them: on one hand, a figure like "14,708.32 forint"
 * signals precision that does not exist - the source's number is an average
 * of reports. On the other hand, **the displayed number must remain
 * reproducible by hand** against the source's table, or "every cell is a
 * quote and the total is arithmetic" stops being checkable. So below 1,000
 * there is no rounding at all (a sum of integers stays an integer), and
 * above that the rounding gets coarser. A display-only operation -
 * `TripCost` keeps the exact value.
 */
export function roundForDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const abs = Math.abs(value);
  const step = abs >= 10000 ? 1000 : abs >= 1000 ? 100 : 1;
  return Math.round(value / step) * step;
}

/** The currency sign as the source displayed it. An unknown currency is shown by its code. */
const CURRENCY_LABEL: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CZK: 'Kč',
  HUF: 'Ft',
  PLN: 'zł',
  THB: '฿',
  AED: 'AED',
  GEL: 'GEL',
  ILS: '₪',
};

export function currencyLabel(code: string): string {
  return CURRENCY_LABEL[code] ?? code;
}

/**
 * One number with its currency. The format is meant to be read inside a
 * Hebrew line: comma thousands separators, and the currency attached to the
 * number - the pair is rendered as an isolated LTR run in the UI, otherwise
 * two numbers meeting in an RTL line stick to each other (the
 * "day 1 / August 10 merging into one number" bug from the dates feature).
 */
export function formatAmount(value: number, currency: string): string {
  const label = currencyLabel(currency);
  const n = roundForDisplay(value).toLocaleString('en-US');
  return label.length === 1 ? `${label}${n}` : `${n} ${label}`;
}

/** A range, after rounding. If both ends round to the same number - one number is shown. */
export function formatRange(low: number, high: number, currency: string): string {
  const a = roundForDisplay(low);
  const b = roundForDisplay(high);
  if (a === b) return formatAmount(a, currency);
  return `${formatAmount(a, currency)}-${formatAmount(b, currency)}`;
}
