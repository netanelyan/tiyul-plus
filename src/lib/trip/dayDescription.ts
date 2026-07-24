import type { Destination, Place, PlaceCategory } from '@/lib/types';
import type { TripDay } from './types';

/**
 * תיאור קצר ליום בטיול - נגזר אך ורק מהעצירות האמיתיות שכבר נמצאות ביום
 * (הקטגוריות והשמות שלהן מהדאטה האוצרת). אין כאן שום המצאה: לא שעות,
 * לא אירועים, לא "אווירה" - רק סיכום של מה שהיום באמת מכיל.
 * יום ריק מקבל ניסוח ניטרלי מפורש ולא תיאור מומצא (כלל הברזל של הפרויקט).
 */

// מילת נושא קצרה לכל קטגוריה - נבחרה כך שתצטרף יפה ל"X ו-Y" בעברית
const THEME_WORD: Record<PlaceCategory, string> = {
  attraction: 'אתרים',
  museum: 'מוזיאונים',
  nature: 'טבע',
  viewpoint: 'תצפיות',
  cafe: 'בתי קפה',
  shopping: 'שופינג',
  'kosher-food': 'אוכל כשר',
  'kosher-market': 'קניות כשרות',
};

export const EMPTY_DAY_DESCRIPTION = 'עדיין אין עצירות ביום הזה';

/** העצירות של היום, לפי הסדר, מסוננות למקומות שבאמת קיימים בדאטה */
export function dayPlaces(day: TripDay, dest?: Destination | null): Place[] {
  if (!dest) return [];
  return day.placeIds
    .map((id) => dest.places.find((p) => p.id === id))
    .filter((p): p is Place => Boolean(p));
}

/** "אתרים ומוזיאונים" / "טבע" - עד שתי הקטגוריות הנפוצות ביום */
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
 * שורה אחת: נושא היום לפי הקטגוריות + העצירה הבולטת (mustSee אם יש,
 * אחרת הראשונה במסלול) + כמה עצירות נוספות. הכול מהדאטה, כלום מהדמיון.
 * דוגמה: "טבע ותצפיות · אגם הצב ועוד 3 עצירות".
 */
export function dayDescription(day: TripDay, dest?: Destination | null): string {
  const places = dayPlaces(day, dest);
  if (places.length === 0) return EMPTY_DAY_DESCRIPTION;

  const highlight = places.find((p) => p.mustSee) ?? places[0];
  const rest = places.length - 1;
  const tail = rest > 0 ? `${highlight.name} ועוד ${stopsWord(rest)}` : highlight.name;
  return `${themeOf(places)} · ${tail}`;
}
