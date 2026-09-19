/**
 * Category hubs - one page per theme, listing the promoted destinations that
 * genuinely belong to it.
 *
 * ## Membership is an attribute, never an opinion
 *
 * Every hub below is a predicate over data the catalog already holds: the
 * continent resolved by `buildDestinationCards`, the vibe tags it derives with
 * the established top-40%-share rule, the itinerary length, or a count of
 * places. Nothing here is a hand-written list of cities, so a hub cannot drift
 * out of agreement with the pages it links to.
 *
 * ## Why there is no "destinations for Pesach" or "winter destinations"
 *
 * Those were the brief's own examples and they are the two most valuable Hebrew
 * search terms in the set, so this is worth stating precisely rather than
 * quietly skipping.
 *
 * **They exist now, and the paragraph that used to sit here explaining why they
 * could not is kept in spirit because its warning is still the load-bearing
 * part.** It said: `bestMonths` is empty on 166 of 166, the prose `bestSeason`
 * is on all 166 but cannot be parsed safely, and that was measured rather than
 * assumed - **20 of the 30 promoted destinations name months in it that are
 * warnings rather than recommendations.** Athens reads "March-June,
 * September-November (July-August very hot)"; Madrid names July and August only
 * to say the city empties out. A month-name parser would file both under summer
 * and recommend Athens in August.
 *
 * What changed is not the risk but the parser. `seasonMonths.ts` reads only the
 * part of the sentence that recommends - everything from the first parenthesis,
 * full stop or free-standing dash onward is discarded, because the cautions
 * always follow. Athens comes back March-June and September-November with July
 * and August excluded, and there is a test named after that exact case.
 *
 * The hubs match on **months rather than season bands**: Passover is March or
 * April, and a May-only destination is "spring" without being a Pesach
 * destination.
 *
 * ## Why hubs list only the promoted 30
 *
 * A hub exists to concentrate internal links on the pages we are asking Google
 * to rank. Linking out to the other 136 would spread that thin and send
 * crawlers to pages deliberately left out of the sitemap.
 */
import type { DestinationCard } from '@/lib/destinationFacets';
import type { Destination } from '@/lib/types';
import { MIN_FAMILY_PLACES, familyPlaces } from './guide';

/** Below this a hub is not worth a page - see `assertHubsAreViable`. */
export const MIN_HUB_MEMBERS = 4;

export interface Hub {
  slug: string;
  /** The `<h1>`, and the phrase the page is trying to rank for. */
  title: string;
  /** One line under the h1, describing what the list is. */
  intro: string;
  emoji: string;
  /**
   * Membership. Takes the card (continent, vibes, days) and the full
   * destination (places, itinerary) so a predicate can use either.
   */
  match: (card: DestinationCard, dest: Destination) => boolean;
}

/*
  Passover falls in March or April, and the northern winter is December through
  February. These are months, not the coarse season bands: a destination whose
  only good month is May is "spring" without being anywhere you would go for
  Pesach, and a band predicate would put it on the page.
*/
const PESACH_MONTHS = [3, 4];
const WINTER_MONTHS = [12, 1, 2];

/*
  Measured on the promoted thirty: Pesach returns 18 and winter returns exactly
  4 - the floor. That is honest rather than comfortable: the promoted set is
  mostly European city breaks whose good months are spring and autumn, so few of
  them are genuinely winter destinations. Widening WINTER_MONTHS to pull in
  November would fix the number by making the page less true, which is the wrong
  trade. If the count dips below the floor the hubs test fails and names it.
*/

export const HUBS: Hub[] = [
  {
    slug: 'pesach',
    title: 'יעדים לחופשת פסח',
    intro:
      'היעדים שהחודשים המומלצים בהם נופלים על מרץ-אפריל - כלומר מזג האוויר עובד לטובתכם בדיוק בחופשה הגדולה של האביב.',
    emoji: '🌷',
    match: (c) => c.months.some((m) => PESACH_MONTHS.includes(m)),
  },
  {
    slug: 'winter',
    title: 'יעדים לחופשת חורף',
    intro:
      'יעדים שדצמבר עד פברואר הוא זמן טוב לבקר בהם - חלקם בגלל הקור עצמו, וחלקם דווקא כי זו העונה היבשה או הנעימה שלהם.',
    emoji: '❄️',
    match: (c) => c.months.some((m) => WINTER_MONTHS.includes(m)),
  },
  {
    slug: 'kosher',
    title: 'יעדים עם אוכל כשר',
    intro:
      'היעדים בקטלוג שלנו שיש בהם מסעדה, מאפייה או סופרמרקט כשר שתועדו - עם ההשגחה כפי שדווחה, ותמיד עם ההמלצה לוודא מול המקום עצמו.',
    /*
      Deliberately the plate and not the Star of David. That glyph is reserved
      for `KosherBadge` / `KosherNote`, and `designConsistency.test.ts` fails on
      it anywhere else - the rule being that a kashrut status has exactly one
      renderer. This is a navigation chip, not a status, but the emoji here is
      not worth weakening a guard that protects the site's most sensitive claim.
    */
    emoji: '🍽️',
    match: (_c, d) => d.places.some((p) => p.category.startsWith('kosher')),
  },
  {
    slug: 'family',
    title: 'יעדים לטיול משפחתי עם ילדים',
    intro:
      'יעדים שיש בהם מספיק מקומות שסומנו כמתאימים למשפחות - לא רק אטרקציה אחת, אלא יום שלם שאפשר לבנות סביבו.',
    emoji: '👨‍👩‍👧',
    match: (_c, d) => familyPlaces(d).length >= MIN_FAMILY_PLACES,
  },
  {
    slug: 'europe',
    title: 'יעדים באירופה לישראלים',
    intro: 'טיסה קצרה מנתב"ג, בלי ויזה ברוב המקרים - היעדים האירופיים שיש לנו עליהם מדריך מלא.',
    emoji: '🇪🇺',
    match: (c) => c.continent === 'אירופה',
  },
  {
    slug: 'art',
    title: 'יעדים לאוהבי אמנות ומוזיאונים',
    intro: 'הערים שבהן המוזיאונים והאמנות הם הסיבה לנסוע, ולא תחנה אחת בדרך.',
    emoji: '🎨',
    match: (c) => c.vibes.includes('art'),
  },
  {
    slug: 'long-trips',
    title: 'יעדים לטיול ארוך - שישה ימים ומעלה',
    intro: 'יעדים שהמסלול המוכן שלהם הוא שישה ימים או יותר, כי באמת יש בהם מה לעשות כל כך הרבה זמן.',
    emoji: '🗓️',
    match: (c) => c.days >= 6,
  },
  {
    slug: 'history',
    title: 'יעדים היסטוריים',
    intro: 'ערים שבהן ההיסטוריה היא לא רק אתר אחד, אלא מה שמחזיק את רוב הימים במסלול.',
    emoji: '🏛️',
    match: (c) => c.vibes.includes('history'),
  },
  {
    slug: 'romantic',
    title: 'יעדים רומנטיים לזוגות',
    intro: 'יעדים שסומנו כרומנטיים לפי המקומות שיש בהם - לחופשה זוגית קצרה או לירח דבש.',
    emoji: '💛',
    match: (c) => c.vibes.includes('romantic'),
  },
  {
    slug: 'food',
    title: 'יעדים לחובבי אוכל',
    intro: 'שווקים, מסעדות ובתי קפה שהם סיבה בפני עצמה להזמין טיסה - כולל, איפה שיש, גם השכבה הכשרה.',
    emoji: '🍜',
    match: (c) => c.vibes.includes('foodie'),
  },
  {
    slug: 'short-breaks',
    title: 'חופשה קצרה - יעדים לעד ארבעה ימים',
    intro: 'יעדים שאפשר באמת לסגור בסוף שבוע ארוך, לפי המסלול המוכן שלהם.',
    emoji: '⚡',
    match: (c) => c.days <= 4,
  },
  {
    slug: 'nature',
    title: 'יעדי טבע וטיולים בחוץ',
    intro: 'הרים, אגמים ופארקים לאומיים - היעדים שרוב מה שיש בהם נמצא מחוץ לעיר.',
    emoji: '🏔️',
    match: (c) => c.vibes.includes('outdoors'),
  },
  {
    slug: 'asia',
    title: 'יעדים באסיה לישראלים',
    intro: 'טיסה ארוכה יותר, אבל גם יעדים שנראים אחרת לגמרי - עם המידע המעשי מנתב"ג.',
    emoji: '🌏',
    match: (c) => c.continent === 'אסיה',
  },
  {
    slug: 'americas',
    title: 'יעדים באמריקה',
    intro: 'צפון ודרום אמריקה - היעדים שיש לנו עליהם מסלול מלא ומידע מעשי לישראלים.',
    emoji: '🌎',
    match: (c) => c.continent === 'אמריקה',
  },
];

export function hubBySlug(slug: string): Hub | undefined {
  return HUBS.find((h) => h.slug === slug);
}

export interface HubMember {
  card: DestinationCard;
  dest: Destination;
}

/** The promoted destinations belonging to a hub, in the catalog's own order. */
export function hubMembers(hub: Hub, members: HubMember[]): HubMember[] {
  return members.filter((m) => hub.match(m.card, m.dest));
}

/**
 * The hubs a given destination belongs to - used for the back-links on its
 * guide, which is what makes the linking bidirectional rather than a one-way
 * fan-out from the hubs.
 */
export function hubsForDestination(card: DestinationCard, dest: Destination): Hub[] {
  return HUBS.filter((h) => h.match(card, dest));
}
