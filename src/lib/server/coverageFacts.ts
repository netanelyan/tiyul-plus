/**
 * ---------- How much of the world we cover, as arithmetic ----------
 *
 * Every number here is counted from the catalog. Nothing is stored, so nothing
 * can go stale, and a data session that adds a destination moves all of it.
 *
 * ## Why this file exists
 *
 * Asked "how many nature destinations do you have in Europe?", the agent
 * answered **"66 destinations in Europe characterised by nature"**, in bold.
 * Europe has 84 destinations in total and 30 of them are nature; 66 happens to
 * be the sum of Asia's lists. So it was a confident, specific, bolded statistic
 * about our own product, and it was invented.
 *
 * That is a hard-rule-2 violation of the worst kind, because it is the one
 * subject where the traveller has no way to sanity-check us. It also has a
 * history: the grounding index's own comment records that the habit survived
 * two prompt rounds and one attempt at handing over per-continent totals, and
 * was only fixed for the shape it then had by REGROUPING the data so the
 * obvious reading became the right one. Directly asked for a count, the model
 * still counted wrong.
 *
 * So this is the pattern this codebase keeps arriving at - `pinDistances`,
 * `dayDescription`, the coverage line in `catalogSummary` - stated once more:
 * **hand over the computed fact instead of asking the model not to get it
 * wrong**, and keep a deterministic guard behind it for when it does anyway.
 *
 * ## The two consumers
 *
 * - `coverageCounts()` goes INTO the prompt, beside the list it counts, so the
 *   model never has to count a list of slugs.
 * - `coverageNumbers()` comes OUT as the guard's allowlist: the closed set of
 *   numbers a sentence about how many destinations we cover is allowed to
 *   contain. See `COVERAGE_CLAIM` in priceGuard.ts.
 */
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { buildDestinationCards } from '@/lib/destinationCards';
import { destinationCharacters, type Interest } from '@/lib/interests';

/** continent -> character -> how many of our destinations are that */
export type CoverageCounts = Record<string, Partial<Record<Interest | 'total', number>>>;

/**
 * The counts, grouped exactly like `byCharacter` is grouped - so the number and
 * the list it describes sit next to each other and cannot disagree.
 *
 * `total` is the continent's destination count, which is the other number the
 * model reaches for and got wrong in the same breath.
 */
export function coverageCounts(): CoverageCounts {
  const continentOf = new Map(buildDestinationCards().map((c) => [c.slug, c.continent]));
  const character = destinationCharacters(destinations);
  const out: CoverageCounts = {};
  for (const d of destinations) {
    const region = continentOf.get(d.slug) ?? 'אחר';
    const row = (out[region] ??= {});
    row.total = (row.total ?? 0) + 1;
    for (const trait of character.get(d.slug) ?? []) row[trait] = (row[trait] ?? 0) + 1;
  }
  return out;
}

/**
 * Every number a claim about our coverage may legitimately contain.
 *
 * **Deliberately a closed set of true numbers rather than a range check.** A
 * range ("is it plausible?") would have waved 66 straight through - it is an
 * entirely plausible number for this catalog, it is simply not the answer to
 * the question asked.
 *
 * What is in it, and why each:
 * - the two global totals, which are what the agent opens with constantly;
 * - per continent: destinations, and countries;
 * - per continent x character, which is the reported bug;
 * - per character worldwide, because "how many nature destinations do you have"
 *   with no region is a fair question with a real answer;
 * - per country: its destination count, so "three of my Italian destinations"
 *   passes.
 *
 * Not in it: anything counting PLACES. Claims about the places inside one city
 * are scoped by `COVERAGE_CLAIM` to not reach the guard at all, because those
 * rest on the detail block the model is actually handed, and admitting every
 * per-city-per-category count would have made the set so dense that a wrong
 * number would collide with a true one by accident.
 */
/**
 * Scope name (Hebrew, as a traveller writes it) -> every number that scope may
 * legitimately be said to have.
 *
 * This exists because the set in `coverageNumbers` cannot catch a **real number
 * wearing the wrong label**, and that turned out to be the other half of the
 * same habit. Handed the per-continent counts, the agent stopped inventing
 * figures and immediately produced "Italy spreads over 166 destinations in the
 * system" - 166 is our worldwide total and Italy has eight, so every digit was
 * true and the sentence was not.
 *
 * Only the **postfix** form is checked against this - "N destinations in
 * <scope>" - because there the preposition binds the number to the scope and
 * there is nothing to misread. A scope sitting somewhere earlier in the sentence
 * is deliberately not treated as owning the number: "we visited Italy, and I
 * have 166 destinations in the catalog" is a perfectly good sentence, and a
 * proximity rule would cut it. See `COVERAGE_SCOPED`.
 */
export function coverageByScope(): Record<string, number[]> {
  const cards = buildDestinationCards();
  const character = destinationCharacters(destinations);
  const out: Record<string, Set<number>> = {};
  const add = (scope: string, n: number) => ((out[scope] ??= new Set()).add(n));

  const counts = coverageCounts();
  for (const [continent, row] of Object.entries(counts)) {
    for (const n of Object.values(row)) add(continent, n as number);
    // How many countries that continent holds - the other number said about it.
    const countriesIn = new Set(
      cards.filter((c) => (c.continent ?? 'אחר') === continent).map((c) => c.countrySlug),
    );
    add(continent, countriesIn.size);
  }

  const byCountry = new Map<string, { name: string; slugs: string[] }>();
  for (const c of cards) {
    const row = byCountry.get(c.countrySlug) ?? { name: c.country, slugs: [] };
    row.slugs.push(c.slug);
    byCountry.set(c.countrySlug, row);
  }
  for (const { name, slugs } of byCountry.values()) {
    add(name, slugs.length);
    // A country may also be described by its character counts, which are a
    // subset of its destinations and therefore never larger.
    const per = new Map<Interest, number>();
    for (const slug of slugs) {
      for (const trait of character.get(slug) ?? []) per.set(trait, (per.get(trait) ?? 0) + 1);
    }
    for (const n of per.values()) add(name, n);
  }

  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]),
  );
}

/** How many of our destinations each country holds - handed to the model so it never guesses */
export function destinationsPerCountry(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of destinations) out[d.countrySlug] = (out[d.countrySlug] ?? 0) + 1;
  return out;
}

export function coverageNumbers(): number[] {
  const cards = buildDestinationCards();
  const character = destinationCharacters(destinations);
  const set = new Set<number>();

  set.add(destinations.length);
  set.add(countries.length);

  const perContinent = new Map<string, Set<string>>();
  const perContinentCountries = new Map<string, Set<string>>();
  const perCountry = new Map<string, number>();
  for (const c of cards) {
    const region = c.continent ?? 'אחר';
    (perContinent.get(region) ?? perContinent.set(region, new Set()).get(region)!).add(c.slug);
    (
      perContinentCountries.get(region) ?? perContinentCountries.set(region, new Set()).get(region)!
    ).add(c.countrySlug);
    perCountry.set(c.countrySlug, (perCountry.get(c.countrySlug) ?? 0) + 1);
  }
  for (const s of perContinent.values()) set.add(s.size);
  for (const s of perContinentCountries.values()) set.add(s.size);
  for (const n of perCountry.values()) set.add(n);

  // Per continent x character, and per character worldwide.
  const worldwide = new Map<Interest, number>();
  const byRegion = new Map<string, Map<Interest, number>>();
  for (const c of cards) {
    const region = c.continent ?? 'אחר';
    const row = byRegion.get(region) ?? byRegion.set(region, new Map()).get(region)!;
    for (const trait of character.get(c.slug) ?? []) {
      row.set(trait, (row.get(trait) ?? 0) + 1);
      worldwide.set(trait, (worldwide.get(trait) ?? 0) + 1);
    }
  }
  for (const row of byRegion.values()) for (const n of row.values()) set.add(n);
  for (const n of worldwide.values()) set.add(n);

  return [...set].sort((a, b) => a - b);
}
