import type { Destination } from '@/lib/types';
import type { Trip, TripPreferences } from './types';
import { generateTrip, tripFromTemplate } from './generate';

/**
 * The homepage's one-tap sample trips - a visitor sees a full mapped itinerary in one
 * click, before typing anything.
 *
 * ## Why the hero needed this
 *
 * The hero was a promise ("your smart travel agent") plus an empty text box. A visitor
 * arriving from TikTok or a search has to invent a sentence before they see anything
 * the product does, and most will not. These three turn the hero from a claim into a
 * demonstration: press one, get a real five-day route on a real map, then edit it.
 *
 * ## Every sample is real catalog content
 *
 * No sample is a mock-up or a screenshot. Each one builds the same `Trip` object the
 * product builds for a paying user, through the same two builders the planner already
 * uses - so what a visitor sees after one tap is exactly what they would have got by
 * working for it.
 *
 * **"Athens + Naxos" was requested and is not what shipped.** Naxos is not in the
 * catalog, and inventing a destination to fill a hero slot is exactly what hard rule 2
 * forbids - so the multi-city sample is Athens + Santorini/Mykonos, which is a real
 * two-city Greek trip and makes the same point (that this product plans more than one
 * city). If Naxos is ever curated, changing the slug here is the whole edit.
 */
export interface SampleTrip {
  /** Stable id - used for analytics and as the React key. */
  key: string;
  /** What the button says. */
  label: string;
  /** One line under it - the concrete promise. */
  sub: string;
  emoji: string;
  /** The cities it needs fetched. */
  citySlugs: string[];
  /** The trip name, which is also what the button promises. */
  name: string;
  days: number;
  /**
   * `template` takes the curated route's first n days - the strongest possible demo,
   * because a human ordered it. `wizard` is for a multi-city sample, where there is no
   * single curated route to slice and the scoring builder is what the planner itself
   * would use.
   */
  kind: 'template' | 'wizard';
  preferences?: TripPreferences;
  /** Wizard-only knobs. */
  tripType?: 'city' | 'nature' | 'combined';
  pace?: 'relaxed' | 'packed';
}

export const SAMPLE_TRIPS: readonly SampleTrip[] = [
  {
    key: 'rome-4',
    label: 'רומא · 4 ימים',
    sub: 'הקלאסי, יום-יום עם מפה',
    emoji: '🏛️',
    citySlugs: ['rome'],
    name: 'מסלול 4 ימים ברומא',
    days: 4,
    kind: 'template',
  },
  {
    key: 'greece-2city',
    label: 'אתונה + סנטוריני · 7 ימים',
    sub: 'עיר ואי, בטיול אחד',
    emoji: '🇬🇷',
    citySlugs: ['athens', 'santorini-mykonos'],
    name: 'אתונה וסנטוריני - 7 ימים',
    days: 7,
    kind: 'wizard',
    tripType: 'combined',
    /*
      `packed`, and measured rather than guessed. At `relaxed` the wizard's time budget
      produced [3,1,4,3,3,3,3] - a day with a SINGLE stop, which on the hero demo reads
      as the product running out of ideas. `packed` gives [7,3,5,5,5,6,4]: 35 stops, at
      least three on every day. Both paces are real options the product offers; this is
      the one that shows it working.
    */
    pace: 'packed',
  },
  {
    key: 'bangkok-family',
    label: 'בנגקוק למשפחות · 5 ימים',
    sub: 'עם ילדים, בקצב שפוי',
    emoji: '👨‍👩‍👧',
    citySlugs: ['bangkok'],
    /*
      Bangkok rather than a European city for the family sample: it carries 15
      family-tagged places, the most of any destination in the catalog, so the
      preference actually changes the result instead of being a label on the same trip.
    */
    name: 'בנגקוק למשפחות - 5 ימים',
    days: 5,
    kind: 'template',
    preferences: { party: 'family', pace: 'relaxed' },
  },
];

/**
 * Build the sample from cities already fetched.
 *
 * Pure, and separate from the component, so the shape of every sample is testable
 * without a browser - the claim worth testing is "every sample produces a real trip
 * with no empty days", and that is a property of this function.
 *
 * Returns null when a city is missing rather than building a partial trip: a hero demo
 * with a blank day is worse than a hero with one fewer button.
 */
export function buildSampleTrip(sample: SampleTrip, cities: Destination[]): Trip | null {
  const found = sample.citySlugs
    .map((s) => cities.find((c) => c.slug === s))
    .filter((c): c is Destination => Boolean(c));
  if (found.length !== sample.citySlugs.length) return null;

  const trip =
    sample.kind === 'template'
      ? tripFromTemplate(found[0], { days: sample.days, name: sample.name })
      : generateTrip(
          {
            citySlugs: sample.citySlugs,
            totalDays: sample.days,
            pace: sample.pace ?? 'relaxed',
            tripType: sample.tripType ?? 'combined',
            shopping: 'normal',
            // Kashrut is never assumed - a sample must not silently opt a visitor in.
            kosherOnly: false,
          },
          found,
          sample.name,
          sample.preferences,
        );

  /*
    A sample with an empty day is not a demo, it is a bug on the most visible screen we
    have. Refuse it rather than show it.
  */
  if (trip.days.length === 0 || trip.days.some((d) => d.placeIds.length === 0)) return null;

  return sample.preferences
    ? { ...trip, preferences: { ...sample.preferences, ...trip.preferences } }
    : trip;
}
