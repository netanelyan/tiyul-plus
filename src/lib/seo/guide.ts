/**
 * The data behind the destination guide sections.
 *
 * Kept out of the component on purpose: every function here is a decision about
 * *what a page is allowed to claim*, and those are worth testing directly
 * against the real catalog rather than inferring from rendered markup.
 *
 * The rule that runs through all of it: **a section whose source is empty does
 * not render.** None of these functions invents a fallback, and none of them
 * calls a model. Everything is read from `src/data/*` at build time.
 */
import { calendar } from '@/data/calendar';
import { hePrefix } from '@/lib/hebrew';
import { isKosher } from '@/lib/categories';
import type { CalendarEntry, Destination, Place, PlaceCategory } from '@/lib/types';

/**
 * The order categories appear in "what to do".
 *
 * Sights first because that is what the question is about; eating and shopping
 * after. Kosher categories are absent deliberately - they are not a footnote in
 * a list of sights, they get their own section, which is the differentiator this
 * whole layer exists for.
 */
export const GUIDE_CATEGORY_ORDER: PlaceCategory[] = [
  'historic',
  'attraction',
  'museum',
  'nature',
  'viewpoint',
  'market',
  'food',
  'cafe',
  'shopping',
];

export interface CategoryGroup {
  category: PlaceCategory;
  places: Place[];
}

/**
 * Places for "what to do", grouped by category in a fixed order.
 *
 * `mustSee` places float to the top of their group; everything else keeps the
 * catalog's own order, which is curated rather than arbitrary.
 */
export function guideGroups(dest: Destination): CategoryGroup[] {
  return GUIDE_CATEGORY_ORDER.map((category) => ({
    category,
    places: dest.places
      .filter((p) => p.category === category)
      .sort((a, b) => Number(Boolean(b.mustSee)) - Number(Boolean(a.mustSee))),
  })).filter((g) => g.places.length > 0);
}

/** Every kosher place, for the kosher section. */
export function kosherPlaces(dest: Destination): Place[] {
  return dest.places.filter((p) => isKosher(p.category));
}

/**
 * Places worth naming in a family section.
 *
 * The threshold matters: with one or two tagged places the heading promises a
 * family guide and delivers a pair of links, which is worse than not raising the
 * subject. Below `MIN_FAMILY_PLACES` the section does not render at all.
 */
export const MIN_FAMILY_PLACES = 3;

export function familyPlaces(dest: Destination): Place[] {
  return dest.places.filter((p) => p.tags?.includes('families'));
}

export interface ItineraryDay {
  day: number;
  title: string;
  notes?: string;
  places: Place[];
}

/**
 * The curated itinerary with its place ids resolved to real places.
 *
 * An id that does not resolve is dropped rather than rendered as a gap - the
 * catalog validator already errors on dangling itinerary ids, so this is a
 * belt-and-braces guard, not an expected path.
 */
export function itineraryDays(dest: Destination): ItineraryDay[] {
  const byId = new Map(dest.places.map((p) => [p.id, p]));
  return dest.itinerary.map((d) => ({
    day: d.day,
    title: d.title,
    notes: d.notes,
    places: d.placeIds.map((id) => byId.get(id)).filter((p): p is Place => Boolean(p)),
  }));
}

/**
 * Calendar entries that affect this destination.
 *
 * Scoped to the country, then narrowed: an entry with no `destinationSlugs`
 * applies to the whole country, one with a list applies only to those cities.
 *
 * **Entries with confirmed dates sort first**, because they are the ones a
 * traveller can act on. The rest carry only a window in words - 92 of the 161
 * entries have no dates at all, because the dates for the coming year were never
 * officially published - and those render as the curator's own prose, never as a
 * date we computed.
 *
 * Capped, because a country-wide entry set can run long and this is one section
 * of a page, not a calendar.
 */
export function calendarForDestination(dest: Destination, limit = 6): CalendarEntry[] {
  return calendar
    .filter(
      (e) =>
        e.countrySlug === dest.countrySlug &&
        (!e.destinationSlugs ||
          e.destinationSlugs.length === 0 ||
          e.destinationSlugs.includes(dest.slug)),
    )
    .sort((a, b) => Number(b.datesConfirmed) - Number(a.datesConfirmed))
    .slice(0, limit);
}

/**
 * The Hebrew request the planner opens with.
 *
 * Built from the destination's own name and its curated itinerary length, so the
 * agent starts from a real brief rather than an empty box. The day count is
 * load-bearing: the agent refuses to build a trip when no length was stated
 * (`tripBrief.ts`), so a CTA without one would open the planner into a question
 * instead of a plan.
 *
 * `hePrefix` rather than string concatenation - a prefix letter before a
 * word-initial vav doubles it, and Vienna, Venice and Warsaw are all in the
 * promoted set.
 */
export function plannerQuery(dest: Destination): string {
  const days = dest.itinerary.length;
  return `תכננו לי טיול של ${days} ימים ${hePrefix('ב', dest.name)}`;
}

/** `/chat?q=...` for the guide's call to action. */
export function plannerHref(dest: Destination): string {
  return `/chat?q=${encodeURIComponent(plannerQuery(dest))}`;
}
