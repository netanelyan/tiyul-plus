/**
 * JSON-LD builders. Plain objects in, rendered by `<JsonLd>`.
 *
 * ## The rule
 *
 * Structured data must describe **what is actually on the page**. That is
 * Google's own requirement and it is also the honest one, and it is why the FAQ
 * block below is limited to the promoted destinations: the answers it declares
 * are the prose the guide renders, and on the other 136 pages that prose is not
 * there to be found.
 *
 * ## The trap that was deliberately not fallen into
 *
 * Every destination carries an `editorialRating` with a 1-5 score, and dropping
 * it into `aggregateRating` would light up review stars in search results. It is
 * not done, for two reasons that point the same way. Google's own guidance
 * limits `aggregateRating` to ratings collected from users, and this score is
 * explicitly not that - the destination page renders it under the label "the
 * team's recommendation - not an average of user reviews", so marking it up as
 * an aggregate rating would contradict, in machine-readable form, the disclaimer
 * printed next to it. Stars we are not entitled to are worth less than the
 * trust.
 */
import type { Country, Destination, Place } from '@/lib/types';
import { SITE_NAME, canonical } from './site';
import { daysHe } from '@/lib/duration';
import { hePrefix } from '@/lib/hebrew';

/** A JSON-LD node. Loose on purpose - these are serialised, never read back. */
export type JsonLdNode = Record<string, unknown>;

export interface Crumb {
  name: string;
  path: string;
}

/**
 * BreadcrumbList.
 *
 * Positions are 1-based and contiguous, which is a hard requirement rather than
 * a convention - a gap makes the whole list invalid.
 */
export function breadcrumbLd(crumbs: Crumb[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonical(c.path),
    })),
  };
}

/**
 * TouristDestination for a city.
 *
 * `geo` is the destination's own curated centre, and each attraction carries its
 * own verified coordinate - this catalog holds real lat/lng for all 1,822
 * places, so none of it is approximated here.
 *
 * `includesAttraction` is capped. The whole point of the property is to say what
 * kind of place this is; serialising 34 attractions into the head of the
 * document adds kilobytes to every page load to tell a crawler something the
 * first dozen already said.
 */
export function touristDestinationLd(
  dest: Destination,
  country: Country,
  { maxAttractions = 12 }: { maxAttractions?: number } = {},
): JsonLdNode {
  const url = canonical(`/destinations/${dest.slug}`);
  const attractions = dest.places
    // mustSee first, so a cap keeps the ones that matter.
    .slice()
    .sort((a, b) => Number(Boolean(b.mustSee)) - Number(Boolean(a.mustSee)))
    .slice(0, maxAttractions)
    .map(attractionLd);

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    '@id': `${url}#destination`,
    name: dest.name,
    alternateName: dest.nameLocal,
    description: dest.summary,
    url,
    ...(dest.photo ? { image: dest.photo } : {}),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: dest.center.lat,
      longitude: dest.center.lng,
    },
    containedInPlace: {
      '@type': 'Country',
      name: country.name,
      alternateName: country.nameLocal,
      url: canonical(`/countries/${country.slug}`),
    },
    ...(attractions.length ? { includesAttraction: attractions } : {}),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: canonical('/'),
    },
  };
}

function attractionLd(p: Place): JsonLdNode {
  return {
    '@type': 'TouristAttraction',
    name: p.name,
    ...(p.nameLocal ? { alternateName: p.nameLocal } : {}),
    description: p.description,
    ...(p.photo ? { image: p.photo } : {}),
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
  };
}

export interface FaqPair {
  question: string;
  answer: string;
}

/**
 * The FAQ pairs for a destination guide.
 *
 * **Every answer is prose the page actually renders**, taken from the same field
 * the corresponding section shows. A pair whose source is missing is not
 * emitted, which is why the count varies by destination - the cost question only
 * exists for the 19 with a sourced daily figure.
 *
 * The questions are phrased the way the headings are, because they are the way
 * Hebrew speakers type them. `hePrefix` rather than concatenation, for the
 * word-initial vav.
 */
export function faqPairs(dest: Destination, country: Country): FaqPair[] {
  const inCity = hePrefix('ב', dest.name);
  const toCity = hePrefix('ל', dest.name);
  const pairs: FaqPair[] = [];

  if (dest.itinerary.length > 0) {
    const stops = dest.itinerary.reduce((n, d) => n + d.placeIds.length, 0);
    pairs.push({
      question: `כמה ימים כדאי ${inCity}?`,
      answer: `המסלול המוכן שלנו ${toCity} הוא ${daysHe(dest.itinerary.length)} ומכסה ${stops} עצירות. אפשר לקצר או להאריך אותו לפי מספר הימים שיש לכם.`,
    });
  }

  if (dest.bestSeason?.trim()) {
    pairs.push({ question: `מתי הכי כדאי לנסוע ${toCity}?`, answer: dest.bestSeason });
  }

  if (dest.practical.kosherOverview?.trim()) {
    pairs.push({ question: `יש אוכל כשר ${inCity}?`, answer: dest.practical.kosherOverview });
  }

  if (dest.practical.flights?.trim()) {
    pairs.push({ question: `איך מגיעים ${toCity} מישראל?`, answer: dest.practical.flights });
  }

  if (country.practical.visa?.trim()) {
    pairs.push({
      question: `צריך ויזה ל${country.name} לישראלים?`,
      answer: country.practical.visa,
    });
  }

  const cost = dest.dailyCost;
  if (cost) {
    const sum = (t: { transport: number; food: number; activities: number }) =>
      Math.round(t.transport + t.food + t.activities);
    pairs.push({
      question: `כמה עולה יום ${inCity}?`,
      answer: `הוצאה יומית טיפוסית לאדם, בלי טיסות ובלי לינה: כ-${sum(cost.budget)} ${cost.currency} בסגנון חסכוני, כ-${sum(cost.mid)} ${cost.currency} ממוצע וכ-${sum(cost.comfort)} ${cost.currency} בנוח. מקור: ${cost.source.title}, נבדק ב-${cost.source.checked}.`,
    });
  }

  return pairs;
}

/**
 * FAQPage.
 *
 * Returns null below two pairs - a "frequently asked questions" block with one
 * entry is not one.
 */
export function faqLd(pairs: FaqPair[]): JsonLdNode | null {
  if (pairs.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map((p) => ({
      '@type': 'Question',
      name: p.question,
      acceptedAnswer: { '@type': 'Answer', text: p.answer },
    })),
  };
}

/**
 * A hub as an ItemList of the destinations it links to.
 *
 * Not one of the three types the brief named, but a hub page IS a list and
 * saying so costs nothing - and it is the honest description of the page, which
 * is the whole standard for structured data.
 */
export function collectionLd(
  title: string,
  path: string,
  items: { name: string; slug: string }[],
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    url: canonical(path),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: canonical(`/destinations/${it.slug}`),
    })),
  };
}

/** Country page: the place plus what it contains. */
export function countryLd(country: Country, cityCount: number): JsonLdNode {
  const url = canonical(`/countries/${country.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Country',
    '@id': `${url}#country`,
    name: country.name,
    alternateName: country.nameLocal,
    description: country.summary,
    url,
    ...(country.photo ? { image: country.photo } : {}),
    ...(cityCount > 0
      ? { additionalProperty: { '@type': 'PropertyValue', name: 'יעדים בקטלוג', value: cityCount } }
      : {}),
  };
}

/*
 * There is deliberately no `Event` markup, although the calendar holds sourced
 * events and the guide renders them.
 *
 * `Event` requires a `startDate`, and 92 of the 161 calendar entries carry no
 * dates at all - only a window in words, because the coming year's dates were
 * never officially published. Marking up only the 69 dated ones would hand a
 * crawler a systematically incomplete picture of what happens in a city, and
 * manufacturing a date for the rest is exactly what the calendar's own validator
 * errors on.
 */
