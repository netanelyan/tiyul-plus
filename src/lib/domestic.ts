/**
 * The home country, and the one place that knows a destination is domestic.
 *
 * ## Why this exists
 *
 * Every destination in this catalog was abroad until Israel was added, and the shape of
 * the data quietly assumed it. `CityPractical.flights` is documented as "direct flights
 * from TLV to this city's airport", and the three components that render it hardcode a
 * label to match - "flights from Ben Gurion", "flights from Tel Aviv". For Jerusalem
 * that label is not merely imprecise, it is nonsense - there is no such flight, and
 * a fact card that offers one reads as a site that does not know the country it is
 * selling.
 *
 * CLAUDE.md promises that adding a country is "a single data edit, no UI work". That
 * promise held for 83 countries because they share one assumption; Israel is the first
 * entry that breaks it, so the promise needed a small amount of UI work to keep being
 * true for the next domestic region added.
 *
 * ## Why the field was not renamed instead
 *
 * Renaming `flights` to something neutral would touch the type, all 166 foreign entries,
 * the grounding builders and the SEO components - a large diff in which the actual bug
 * (one wrong label) would be invisible. The field name is imperfect and internal; the
 * label is what a traveller reads. So the label is what changes.
 */

/** The country this product is built for, and therefore the one that is not abroad. */
export const HOME_COUNTRY_SLUG = 'israel';

export function isDomestic(dest: { countrySlug?: string } | null | undefined): boolean {
  return dest?.countrySlug === HOME_COUNTRY_SLUG;
}

/**
 * The heading for the "how do you get there" fact card.
 *
 * `destName` is used only for the foreign form, which reads better naming the city
 * ("flights to Rome from Tel Aviv"); the domestic form is deliberately generic, because
 * the answer is a mix of train, bus and car and naming one of them in the heading would
 * contradict the text underneath it.
 */
export function travelFactTitle(
  dest: { countrySlug?: string },
  foreign: string,
): string {
  return isDomestic(dest) ? 'איך מגיעים' : foreign;
}

/**
 * "When is it worth FLYING to X" has the same problem one card over, and it is the
 * subtler of the two: the sentence is grammatical, so it survives review, and it is
 * still wrong about Mitzpe Ramon. Domestic destinations travel, they do not fly.
 */
export function seasonFactTitle(
  dest: { countrySlug?: string },
  foreign: string,
  domestic: string,
): string {
  return isDomestic(dest) ? domestic : foreign;
}
