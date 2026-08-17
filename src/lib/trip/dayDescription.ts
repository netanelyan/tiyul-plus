import type { Destination, Place, PlaceCategory } from '@/lib/types';
import type { TripDay } from './types';

/**
 * A short description for a day in the trip - derived solely from the real stops already
 * in that day (their categories and names from the curated data). There is no invention
 * here: no hours, no events, no "atmosphere" - only a summary of what the day actually
 * contains.
 * An empty day gets an explicit neutral wording and not an invented description (the
 * project's iron rule).
 */

// A short subject word per category - chosen so it joins nicely into "X and Y" in Hebrew
const THEME_WORD: Record<PlaceCategory, string> = {
  historic: 'אתרים היסטוריים',
  attraction: 'אתרים',
  museum: 'מוזיאונים',
  nature: 'טבע',
  viewpoint: 'תצפיות',
  cafe: 'בתי קפה',
  food: 'אוכל',
  market: 'שווקים',
  shopping: 'שופינג',
  'kosher-food': 'אוכל כשר',
  'kosher-market': 'קניות כשרות',
};

export const EMPTY_DAY_DESCRIPTION = 'עדיין אין עצירות ביום הזה';

/** The day's stops, in order, filtered to places that genuinely exist in the data */
export function dayPlaces(day: TripDay, dest?: Destination | null): Place[] {
  if (!dest) return [];
  return day.placeIds
    .map((id) => dest.places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p));
}

/** "Sights and museums" / "nature" - up to the two most common categories in the day */
function themeOf(places: Place[]): string {
  const order: PlaceCategory[] = [];
  const counts = new Map<PlaceCategory, number>();
  for (const p of places) {
    if (!counts.has(p.category)) order.push(p.category);
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  const top = order
    .slice()
    .sort((a, b) => (counts.get(b)! - counts.get(a)!) || order.indexOf(a) - order.indexOf(b))
    .slice(0, 2)
    .map((c) => THEME_WORD[c]);
  return top.length === 2 ? `${top[0]} ו${top[1]}` : top[0];
}

const stopsWord = (n: number) => (n === 1 ? 'עצירה אחת' : `${n} עצירות`);

/**
 * One line: the day's subject from the categories + the standout stop (mustSee if there is
 * one, otherwise the first on the route) + how many further stops. All from the data,
 * nothing from imagination.
 * For example: "nature and viewpoints - Turtle Lake and 3 more stops".
 */
export function dayDescription(day: TripDay, dest?: Destination | null): string {
  const places = dayPlaces(day, dest);
  if (places.length === 0) return EMPTY_DAY_DESCRIPTION;

  const highlight = places.find((p) => p.mustSee) ?? places[0];
  const rest = places.length - 1;
  const tail = rest > 0 ? `${highlight.name} ועוד ${stopsWord(rest)}` : highlight.name;
  return `${themeOf(places)} · ${tail}`;
}
