import type { Destination } from '@/lib/types';

/**
 * קטע מעבר בין שתי ערים בטיול.
 *
 * שתי שכבות, בסדר הזה:
 * 1. טבלה ידנית קצרה לזוגות ערים שבדקנו (ניסוח אנושי טוב יותר).
 * 2. חישוב כן מתוך הקואורדינטות האמיתיות של הערים - מרחק haversine,
 *    מקדם דרכים, והאם למשתמש יש רכב.
 *
 * מה שאסור (חוק ברזל 2 - לא ממציאים): לא מכריזים "טיסה" על מעבר
 * שאפשר לעשות ברכב באותה מדינה, ולא מכריזים "נסיעה" על מעבר שחוצה ים.
 * כשאין נתונים - אומרים את זה, לא ממציאים אמצעי תחבורה.
 */

export interface Leg {
  emoji: string;
  label: string; // תיאור בעברית
}

export interface LegOptions {
  /** היעדים המלאים (עם center) - מאפשרים חישוב מרחק אמיתי */
  from?: Destination;
  to?: Destination;
  /** למשתמש יש רכב (או מתכנן לשכור) - אז נסיעה היא ברירת המחדל */
  hasCar?: boolean;
}

/** זוגות שנוסחו ידנית - הניסוח האנושי עדיף כשאין רכב */
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
 * יעדים שמופרדים בים מהיבשת (או זה מזה). מפתח = קבוצת יבשה/אי.
 * יעד שלא ברשימה נחשב מחובר בכביש ליבשת שלו - וזה נכון:
 * פוקט מחוברת לתאילנד דרך גשר סאראסין, ולופוטן מחוברת בכביש E10.
 * יעדים משתי קבוצות שונות (או אחד בקבוצה והשני לא) = חציית ים.
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

/** מרחק אווירי בק"מ (haversine) */
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

/** שעות נסיעה משוערות - מהירות ממוצעת נמוכה יותר בקטעים קצרים */
function drivingHours(roadKm: number): number {
  const avg = roadKm > 150 ? 85 : 65;
  return Math.round((roadKm / avg) * 2) / 2; // עיגול לחצי שעה
}

const hoursLabel = (h: number) =>
  h <= 1 ? 'כשעה נסיעה' : `כ-${h % 1 === 0 ? h : h.toFixed(1)} שעות נסיעה`;

/** מעבר יבשתי בכלל אפשרי? (אותה קבוצת יבשה/אי) */
function sameLandmass(fromSlug: string, toSlug: string): boolean {
  return (ISLAND_GROUP[fromSlug] ?? '') === (ISLAND_GROUP[toSlug] ?? '');
}

/**
 * מחזיר את קטע המעבר בין שתי ערים.
 * מומלץ להעביר את היעדים המלאים ואת סטטוס הרכב - בלעדיהם נופלים
 * לתשובה כללית וכנה במקום לנחש אמצעי תחבורה.
 */
export function travelLeg(from: string, to: string, opts: LegOptions = {}): Leg {
  const { from: fromDest, to: toDest, hasCar = false } = opts;

  const curated = LEGS[`${from}|${to}`] ?? LEGS[`${to}|${from}`];
  const a = fromDest?.center;
  const b = toDest?.center;

  // אין קואורדינטות: הטבלה הידנית אם קיימת, אחרת תשובה כנה בלי המצאה
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

  // מרחק יבשתי ענק - גם עם רכב זו כבר החלטה של טיסה פנימית
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

  // בלי רכב: הניסוח הידני עדיף כשיש, אחרת ציבורית לפי מרחק
  if (curated) return curated;

  if (roadKm <= 400) {
    return { emoji: '🚆', label: `כ-${roadKm} ק"מ ברכבת/אוטובוס - לבדוק חיבורים` };
  }
  return {
    emoji: '🚆',
    label: `כ-${roadKm} ק"מ - רכבת/אוטובוס ארוך או טיסה פנימית`,
  };
}
