import type { KosherStatus, Place, PlaceCategory } from './types';

export const categoryMeta: Record<
  PlaceCategory,
  { label: string; emoji: string; color: string }
> = {
  attraction: { label: 'אטרקציה', emoji: '🏛️', color: '#5c46c9' },
  museum: { label: 'מוזיאון', emoji: '🖼️', color: '#c23c6f' },
  nature: { label: 'טבע', emoji: '🌿', color: '#0f8c46' },
  viewpoint: { label: 'תצפית', emoji: '🌄', color: '#e07c1e' },
  cafe: { label: 'בית קפה', emoji: '☕', color: '#7c4f26' },
  food: { label: 'אוכל', emoji: '🍜', color: '#a8431f' },
  market: { label: 'שוק', emoji: '🧺', color: '#8a6b12' },
  shopping: { label: 'שופינג', emoji: '🛍️', color: '#b93a7c' },
  'kosher-food': { label: 'אוכל כשר', emoji: '🍽️', color: '#00897a' },
  'kosher-market': { label: 'סופר כשר', emoji: '🛒', color: '#076e66' },
};

export const isKosher = (c: PlaceCategory) => c.startsWith('kosher');

/**
 * קטגוריות שאוכלים בהן - בשונה משוק או חנות, שבהם אפשר להסתובב בלי
 * לאכול. הבחנה זו היא מה שקובע אם מטייל ששמר "כשר" יראה את המקום:
 * מסעדה לא כשרה תיחסם, שוק פרחים לא.
 */
const EATING: ReadonlySet<PlaceCategory> = new Set<PlaceCategory>([
  'cafe',
  'food',
  'kosher-food',
]);

export const isEating = (c: PlaceCategory) => EATING.has(c);

/**
 * הסטטוס האפקטיבי. **רשומות kosher-* מחזירות 'kosher' בגזירה ולא
 * מהשדה**, כדי ששום רשומת כשרות קיימת לא תצטרך להשתנות - התוספת של
 * הפיצ׳ר הזה לא נוגעת בהן בכלל.
 *
 * היעדר שדה מחזיר 'unknown' ולא 'kosher'. ברירת המחדל חייבת להיות
 * הזהירה: מקום שלא נבדק מוצג כלא ידוע, לא כמותר.
 */
export function kosherStatusOf(
  p: Pick<Place, 'category' | 'kosherStatus'>,
): KosherStatus {
  if (isKosher(p.category)) return 'kosher';
  return p.kosherStatus ?? 'unknown';
}

export const KOSHER_STATUS_LABEL: Record<KosherStatus, string> = {
  kosher: 'כשר',
  'not-kosher': 'לא כשר',
  unknown: 'כשרות לא ידועה',
};
