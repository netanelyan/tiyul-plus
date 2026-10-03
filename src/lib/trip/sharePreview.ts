/**
 * What a shared trip looks like from outside - the link preview.
 *
 * ## Why this is one module and not two
 *
 * A shared link produces **two** previews that must agree: the `og:title` and
 * `og:description` in `/t/[code]/page.tsx`, and the card drawn by
 * `/t/[code]/opengraph-image.tsx`. They are different files, rendered by
 * different machinery (metadata vs Satori), and they were deriving "how many
 * days, which city, how many stops" separately. Two derivations of one fact is
 * how a card ends up saying four days beside a title that says five.
 *
 * ## The trip's own name is deliberately absent
 *
 * The card used to lead with `shared.name`, which is **the owner's free text** -
 * a family name, a private joke, sometimes a person's full name. That name is
 * fine on the page itself, which the owner sent to people they chose. It is not
 * fine as the title of a link preview, because the preview is what gets
 * forwarded onward into groups the owner never picked.
 *
 * So the title is generated from facts about the itinerary instead: how long,
 * where, what is in it. It is also simply a better advert - a title naming the
 * length and the city tells a stranger what they would get, and somebody's
 * private trip name does not.
 *
 * Server-only in practice: it reads the catalog, which is ~4MB and must never
 * be pulled into a client bundle.
 */
import { destinations } from '@/data/destinations';
import type { SharedTrip } from './share';
import { daysHe } from '@/lib/duration';
import { inHe } from '@/lib/hebrew';

/** How many place names the description names before it stops. */
const TOP_PLACES = 3;

export interface SharePreview {
  /** og:title - the day count, the city, and what it is */
  title: string;
  /** og:description - the stop count and the places somebody would recognise */
  description: string;
  /** One city named, two named and joined, three or more counted */
  cityLabel: string;
  dayCount: number;
  stopCount: number;
  /** Up to `TOP_PLACES` names, mustSee first. Empty for a trip with no stops. */
  topPlaces: string[];
}

/**
 * The cities of this trip, in first-appearance order, as catalog names.
 * A slug with no catalog entry is dropped rather than printed raw.
 */
function cityNames(shared: SharedTrip): string[] {
  const slugs: string[] = [];
  for (const d of shared.days) if (!slugs.includes(d.citySlug)) slugs.push(d.citySlug);
  return slugs
    .map((s) => destinations.find((x) => x.slug === s)?.name)
    .filter((n): n is string => Boolean(n));
}

/**
 * How to name the destination in a sentence: the first city, plus a count of
 * the others.
 *
 * ## Why the second city is counted and not named
 *
 * The obvious form is "Rome and Venice", and it was written that way first.
 * The conjunction is a one-letter Hebrew prefix, so it hits the vav-doubling
 * rule `hePrefix` exists for - and a trip whose SECOND city is Venice or Warsaw
 * is exactly where that lands. But `hePrefix` is built for the prepositional
 * prefixes, and applying it to the conjunction in front of a vav-initial name
 * yields **three** consecutive vavs, which no Hebrew reader writes. Gluing the
 * letter on by hand instead is the bug the repo-wide guard
 * (`hebrewPrefixSites.test.ts`) rejects, and it rejected this line.
 *
 * Rather than invent a spelling rule for a case we are not sure about, the
 * label avoids the construction: one city is named, anything beyond it is
 * counted. That is also what the brief asked for - the title format names a
 * single city - and it keeps the preview short, which is the whole job.
 */
function labelFor(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  // "one more city" rather than "1 more cities" - the same care daysHe takes.
  if (names.length === 2) return `${names[0]} ועוד עיר אחת`;
  return `${names[0]} ועוד ${names.length - 1} ערים`;
}

/** The places worth naming: mustSee first, then itinerary order, de-duplicated. */
function topPlaceNames(shared: SharedTrip): string[] {
  const seen = new Set<string>();
  const must: string[] = [];
  const rest: string[] = [];
  for (const day of shared.days) {
    const dest = destinations.find((x) => x.slug === day.citySlug);
    if (!dest) continue;
    for (const id of day.placeIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const place = dest.places.find((p) => p.id === id);
      if (!place) continue;
      (place.mustSee ? must : rest).push(place.name);
    }
  }
  return [...must, ...rest].slice(0, TOP_PLACES);
}

export function sharePreview(shared: SharedTrip): SharePreview {
  const names = cityNames(shared);
  const cityLabel = labelFor(names);
  const dayCount = shared.days.length;
  const stopCount = shared.days.reduce((n, d) => n + d.placeIds.length, 0);
  const topPlaces = topPlaceNames(shared);

  /*
    `inHe` rather than a concatenated prefix letter: the letter doubles a
    word-initial vav, and Vienna is a flagship city, so this is the common path
    rather than a corner case.
  */
  const where = cityLabel ? ` ${inHe(cityLabel)}` : '';
  const title = `${daysHe(dayCount)}${where} - מסלול מוכן עם מפה`;

  /*
    The stop count first, because it is the fact that says "this is a real
    plan", then the names that make it concrete. A trip whose stops are all
    outside the catalog has no names to give and simply says less, rather than
    saying something invented.

    Both forms interpolate after a space or a brace on purpose - a Hebrew
    prefix letter sitting directly against `${` is the construction the repo
    guard rejects, because it cannot tell a real prefix from a word that merely
    ends in one of those letters.
  */
  const description = topPlaces.length
    ? `${stopCount} עצירות, ביניהן ${topPlaces.join(', ')}. מסלול יום-אחרי-יום עם מפה, שנבנה בטיול+.`
    : cityLabel
      ? `מסלול יום-אחרי-יום עם מפה, ${inHe(cityLabel)}, שנבנה בטיול+, סוכן הנסיעות החכם.`
      : 'מסלול יום-אחרי-יום עם מפה, שנבנה בטיול+, סוכן הנסיעות החכם.';

  return { title, description, cityLabel, dayCount, stopCount, topPlaces };
}
