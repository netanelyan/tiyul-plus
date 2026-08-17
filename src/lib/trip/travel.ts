import type { Destination } from '@/lib/types';

/**
 * A travel leg between two cities in a trip.
 *
 * Two layers, in this order:
 * 1. A short hand-written table for city pairs we checked (better human wording).
 * 2. An honest computation from the cities' real coordinates - haversine distance,
 *    a road factor, and whether the user has a car.
 *
 * What is forbidden (hard rule 2 - do not invent): we do not declare a "flight" for
 * a leg that can be driven within the same country, and we do not declare a "drive"
 * for a leg that crosses a sea. When there is no data - say so, do not invent a mode
 * of transport.
 */

export interface Leg {
  emoji: string;
  label: string; // Hebrew description
}

export interface LegOptions {
  /** The full destinations (with center) - these allow a real distance computation */
  from?: Destination;
  to?: Destination;
  /** The user has a car (or plans to rent one) - so driving is the default */
  hasCar?: boolean;
}

/** Hand-written pairs - the human wording is preferable when there is no car */
const LEGS: Record<string, Leg> = {
  'vienna|bratislava': { emoji: '🚌', label: 'כשעה באוטובוס/רכבת' },
  'vienna|budapest': { emoji: '🚆', label: 'כ-2.5 שעות ברכבת' },
  'bratislava|budapest': { emoji: '🚆', label: 'כשעתיים ברכבת' },
  'vienna|prague': { emoji: '🚆', label: 'כ-4 שעות ברכבת' },
  'bratislava|prague': { emoji: '🚆', label: 'כ-4 שעות ברכבת' },
  'budapest|prague': { emoji: '🚆', label: 'כ-6 שעות ברכבת (או טיסה קצרה)' },
  'prague|berlin': { emoji: '🚆', label: 'כ-4.5 שעות ברכבת' },
  'vienna|berlin': { emoji: '✈️', label: 'טיסה פנימית כשעה (או רכבת לילה)' },
  'rome|athens': { emoji: '✈️', label: 'טיסה כשעתיים' },
  'rome|barcelona': { emoji: '✈️', label: 'טיסה כשעה וחצי' },
};

/**
 * Destinations separated by sea from the mainland (or from each other). Key = a
 * landmass/island group. A destination not on the list is treated as connected by
 * road to its own landmass - and that is correct: Phuket is connected to Thailand by
 * the Sarasin bridge, and Lofoten by the E10 road. Destinations from two different
 * groups (or one in a group and the other not) = a sea crossing.
 */
const ISLAND_GROUP: Record<string, string> = {
  crete: 'crete',
  mallorca: 'mallorca',
  larnaca: 'cyprus',
  reykjavik: 'iceland',
  tokyo: 'japan',
  kyoto: 'japan',
  queenstown: 'nz',
};

/** Straight-line distance in km (haversine) */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated driving hours - a lower average speed on short legs */
function drivingHours(roadKm: number): number {
  const avg = roadKm > 150 ? 85 : 65;
  return Math.round((roadKm / avg) * 2) / 2; // rounded to the half hour
}

const hoursLabel = (h: number) =>
  h <= 1 ? 'כשעה נסיעה' : `כ-${h % 1 === 0 ? h : h.toFixed(1)} שעות נסיעה`;

/** Is an overland crossing possible at all? (the same landmass/island group) */
function sameLandmass(fromSlug: string, toSlug: string): boolean {
  return (ISLAND_GROUP[fromSlug] ?? '') === (ISLAND_GROUP[toSlug] ?? '');
}

/**
 * Returns the travel leg between two cities.
 * Pass the full destinations and the car status where possible - without them we
 * fall back to a general, honest answer rather than guessing a mode of transport.
 */
export function travelLeg(from: string, to: string, opts: LegOptions = {}): Leg {
  const { from: fromDest, to: toDest, hasCar = false } = opts;

  const curated = LEGS[`${from}|${to}`] ?? LEGS[`${to}|${from}`];
  const a = fromDest?.center;
  const b = toDest?.center;

  // No coordinates: the hand-written table if it exists, otherwise an honest answer with no invention
  if (!a || !b) {
    return curated ?? { emoji: '🧭', label: 'מעבר בין הערים - לבדוק חיבורים' };
  }

  const airKm = Math.round(haversineKm(a, b));
  const overSea = !sameLandmass(from, to);

  if (overSea) {
    return {
      emoji: '✈️',
      label: `כ-${airKm} ק"מ, מעבר ימי - טיסה או מעבורת`,
    };
  }

  const roadKm = Math.round(airKm * 1.25);

  // A huge overland distance - even with a car this is already a domestic-flight decision
  if (roadKm > 900) {
    return {
      emoji: '✈️',
      label: `כ-${roadKm} ק"מ ביבשה - טיסה פנימית או נסיעה ארוכה`,
    };
  }

  if (hasCar) {
    return {
      emoji: '🚗',
      label: `כ-${roadKm} ק"מ · ${hoursLabel(drivingHours(roadKm))}`,
    };
  }

  // No car: the hand-written wording is preferable where it exists, otherwise public transport by distance
  if (curated) return curated;

  if (roadKm <= 400) {
    return { emoji: '🚆', label: `כ-${roadKm} ק"מ ברכבת/אוטובוס - לבדוק חיבורים` };
  }
  return {
    emoji: '🚆',
    label: `כ-${roadKm} ק"מ - רכבת/אוטובוס ארוך או טיסה פנימית`,
  };
}
