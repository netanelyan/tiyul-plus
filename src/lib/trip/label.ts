import { destinations } from '@/data/destinations';
import type { Trip } from './types';

/** כותרת קצרה לטיול לפי הערים בו - "וינה" ליעד יחיד, "ברטיסלבה + וינה" למספר ערים. */
export function tripLabel(trip: Trip): string {
  const names = trip.citySlugs
    .map((slug) => destinations.find((d) => d.slug === slug)?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return trip.name || 'טיול';
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names[names.length - 1]}`;
}
