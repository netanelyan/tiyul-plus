import type { DailyCost } from '@/lib/types';

/**
 * Typical daily spend per person, by travel style, in the local currency.
 *
 * **Where the numbers come from.** All of them were copied from the budget /
 * mid-range / luxury table that Budget Your Trip publishes for each city, which is
 * built from previous travellers' expense reports. Every cell here is **a quotation
 * of a cell in that table** - not an average we computed, not a conversion, and not
 * a rounding. The non-round values (7.09, 8.78, 9.34...) are kept exactly as
 * printed, because the moment you start "tidying" a number you can no longer compare
 * it to the source.
 *
 * **What is not kept here, and that is a decision rather than an omission.** The
 * source table also includes lodging and alcohol. Neither was copied: lodging is
 * explicitly excluded from the feature (and the safe way to exclude it is simply not
 * to hold it), and alcohol is spending that many people do not have at all, so it is
 * not a "typical" expense.
 *
 * **A city with no record here gets no estimate.** It simply shows no number, and
 * the trip total says explicitly that it is partial. Three cities in the catalog were
 * checked and left out for exactly that reason - Krakow, Bucharest and Sofia are
 * served at the source in an older format with no breakdown by travel style (and
 * Krakow has no attractions row at all). A single average is not the answer to "how
 * much does a budget traveller spend", so it was not taken.
 *
 * **To add a city:** read the city's page at the source, copy three rows only
 * (Local Transportation / Food / Entertainment) across the three columns, and record
 * the currency exactly as printed together with the date the page was actually read.
 * If there is no broken-down table - do not add it. All 21 records here were read
 * twice in independent readings, and eight of them went through a separate third
 * review (8/8 identical).
 *
 * Note: the source page is sometimes served in a reduced format with entirely
 * different numbers and no table. The heading is the tell - the correct format is
 * titled
 * "X Travel Cost - Average Price of a Vacation to X".
 */

const CHECKED = '2026-07-29';

const src = (city: string, url: string) => ({
  url,
  title: `Budget Your Trip - ${city} travel costs`,
  checked: CHECKED,
});

export const DAILY_COSTS: Record<string, DailyCost> = {
  vienna: {
    currency: 'EUR',
    budget: { transport: 7.09, food: 23, activities: 15 },
    mid: { transport: 19, food: 57, activities: 38 },
    comfort: { transport: 50, food: 142, activities: 97 },
    source: src('Vienna', 'https://www.budgetyourtrip.com/austria/vienna'),
  },
  prague: {
    currency: 'CZK',
    budget: { transport: 77, food: 439, activities: 152 },
    mid: { transport: 191, food: 1055, activities: 381 },
    comfort: { transport: 469, food: 2347, activities: 940 },
    source: src('Prague', 'https://www.budgetyourtrip.com/czech-republic/prague'),
  },
  budapest: {
    currency: 'HUF',
    budget: { transport: 1499, food: 5544, activities: 2952 },
    mid: { transport: 3861, food: 14708, activities: 7982 },
    comfort: { transport: 10145, food: 41088, activities: 23118 },
    source: src('Budapest', 'https://www.budgetyourtrip.com/hungary/budapest'),
  },
  rome: {
    currency: 'EUR',
    budget: { transport: 7.89, food: 33, activities: 13 },
    mid: { transport: 21, food: 84, activities: 36 },
    comfort: { transport: 60, food: 207, activities: 108 },
    source: src('Rome', 'https://www.budgetyourtrip.com/italy/rome'),
  },
  athens: {
    currency: 'EUR',
    budget: { transport: 11, food: 26, activities: 14 },
    mid: { transport: 27, food: 64, activities: 36 },
    comfort: { transport: 68, food: 158, activities: 87 },
    source: src('Athens', 'https://www.budgetyourtrip.com/greece/athens'),
  },
  barcelona: {
    currency: 'EUR',
    budget: { transport: 7.3, food: 24, activities: 13 },
    mid: { transport: 19, food: 58, activities: 33 },
    comfort: { transport: 52, food: 136, activities: 79 },
    source: src('Barcelona', 'https://www.budgetyourtrip.com/spain/barcelona'),
  },
  madrid: {
    currency: 'EUR',
    budget: { transport: 7.17, food: 23, activities: 13 },
    mid: { transport: 18, food: 59, activities: 33 },
    comfort: { transport: 48, food: 157, activities: 81 },
    source: src('Madrid', 'https://www.budgetyourtrip.com/spain/madrid'),
  },
  berlin: {
    currency: 'EUR',
    budget: { transport: 7.07, food: 34, activities: 8.78 },
    mid: { transport: 18, food: 90, activities: 22 },
    comfort: { transport: 45, food: 254, activities: 56 },
    source: src('Berlin', 'https://www.budgetyourtrip.com/germany/berlin'),
  },
  munich: {
    currency: 'EUR',
    budget: { transport: 8.07, food: 21, activities: 11 },
    mid: { transport: 19, food: 47, activities: 29 },
    comfort: { transport: 40, food: 91, activities: 71 },
    source: src('Munich', 'https://www.budgetyourtrip.com/germany/munich'),
  },
  paris: {
    currency: 'EUR',
    budget: { transport: 8.11, food: 28, activities: 27 },
    mid: { transport: 21, food: 72, activities: 76 },
    comfort: { transport: 60, food: 188, activities: 242 },
    source: src('Paris', 'https://www.budgetyourtrip.com/france/paris'),
  },
  london: {
    currency: 'GBP',
    budget: { transport: 10, food: 23, activities: 11 },
    mid: { transport: 26, food: 59, activities: 33 },
    comfort: { transport: 67, food: 157, activities: 104 },
    source: src('London', 'https://www.budgetyourtrip.com/united-kingdom/london'),
  },
  amsterdam: {
    currency: 'EUR',
    budget: { transport: 7.72, food: 32, activities: 15 },
    mid: { transport: 20, food: 80, activities: 36 },
    comfort: { transport: 51, food: 194, activities: 88 },
    source: src('Amsterdam', 'https://www.budgetyourtrip.com/netherlands/amsterdam'),
  },
  lisbon: {
    currency: 'EUR',
    budget: { transport: 9.62, food: 30, activities: 9.34 },
    mid: { transport: 25, food: 73, activities: 24 },
    comfort: { transport: 67, food: 172, activities: 63 },
    source: src('Lisbon', 'https://www.budgetyourtrip.com/portugal/lisbon'),
  },
  warsaw: {
    currency: 'PLN',
    budget: { transport: 7.5, food: 65, activities: 12 },
    mid: { transport: 19, food: 186, activities: 28 },
    comfort: { transport: 44, food: 587, activities: 54 },
    source: src('Warsaw', 'https://www.budgetyourtrip.com/poland/warsaw'),
  },
  venice: {
    currency: 'EUR',
    budget: { transport: 12, food: 43, activities: 37 },
    mid: { transport: 27, food: 112, activities: 101 },
    comfort: { transport: 54, food: 304, activities: 293 },
    source: src('Venice', 'https://www.budgetyourtrip.com/italy/venice'),
  },
  florence: {
    currency: 'EUR',
    budget: { transport: 9.48, food: 25, activities: 11 },
    mid: { transport: 22, food: 62, activities: 30 },
    comfort: { transport: 43, food: 151, activities: 85 },
    source: src('Florence', 'https://www.budgetyourtrip.com/italy/florence'),
  },
  bangkok: {
    currency: 'THB',
    budget: { transport: 72, food: 448, activities: 213 },
    mid: { transport: 209, food: 1156, activities: 572 },
    comfort: { transport: 677, food: 3052, activities: 1642 },
    source: src('Bangkok', 'https://www.budgetyourtrip.com/thailand/bangkok'),
  },
  tokyo: {
    currency: 'JPY',
    budget: { transport: 929, food: 3720, activities: 3582 },
    mid: { transport: 2667, food: 9877, activities: 10487 },
    comfort: { transport: 8561, food: 27636, activities: 34698 },
    source: src('Tokyo', 'https://www.budgetyourtrip.com/japan/tokyo'),
  },
  dubai: {
    currency: 'AED',
    budget: { transport: 16, food: 142, activities: 21 },
    mid: { transport: 47, food: 354, activities: 70 },
    comfort: { transport: 159, food: 863, activities: 281 },
    source: src('Dubai', 'https://www.budgetyourtrip.com/united-arab-emirates/dubai'),
  },
  'new-york': {
    currency: 'USD',
    budget: { transport: 18, food: 36, activities: 44 },
    mid: { transport: 49, food: 87, activities: 180 },
    comfort: { transport: 144, food: 199, activities: 846 },
    source: src(
      'New York City',
      'https://www.budgetyourtrip.com/united-states-of-america/new-york-city',
    ),
  },
  tbilisi: {
    currency: 'GEL',
    budget: { transport: 5.81, food: 15, activities: 16 },
    mid: { transport: 17, food: 37, activities: 39 },
    comfort: { transport: 53, food: 90, activities: 83 },
    source: src('Tbilisi', 'https://www.budgetyourtrip.com/georgia/tbilisi'),
  },
};

export function dailyCostFor(slug: string): DailyCost | undefined {
  return DAILY_COSTS[slug];
}
