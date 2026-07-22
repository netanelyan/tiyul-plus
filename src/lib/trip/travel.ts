/**
 * טבלת קטעי נסיעה סטטית בין ערים (לשני הכיוונים).
 * בהמשך אפשר להחליף ב-API של רכבות/טיסות - הממשק נשאר זהה.
 */

interface Leg {
  emoji: string;
  label: string; // תיאור בעברית
}

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

export function travelLeg(from: string, to: string): Leg {
  const key1 = `${from}|${to}`;
  const key2 = `${to}|${from}`;
  return (
    LEGS[key1] ??
    LEGS[key2] ?? { emoji: '✈️', label: 'טיסה פנימית - לבדוק חיבורים' }
  );
}
