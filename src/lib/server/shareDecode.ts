import { destinations } from '@/data/destinations';
import { fromBase64Url, type ShareDay, type SharedTrip } from '@/lib/trip/share';

/**
 * פענוח קוד שיתוף - **צד שרת בלבד**, כי הוא מאמת מול הקטלוג המלא.
 * ראו ההסבר ב-`share.ts`: הפרדה זו היא מה שמאפשר למסך הטיול לייצר
 * קישור בלי להוריד את הקטלוג ל-bundle.
 */
type SharePayload = [version: 1, name: string, days: ShareDay[]];

export function decodeTripShare(code: string): SharedTrip | null {
  const json = fromBase64Url(code);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed[0] !== 1) return null;
  const [, name, days] = parsed as SharePayload;
  if (typeof name !== 'string' || !Array.isArray(days)) return null;

  const cleanDays: SharedTrip['days'] = [];
  for (const d of days) {
    if (!Array.isArray(d) || typeof d[0] !== 'string' || !Array.isArray(d[1])) return null;
    const dest = destinations.find((x) => x.slug === d[0]);
    if (!dest) continue; // עיר שלא קיימת בקטלוג - מדלגים, לא ממציאים
    // רק מזהי מקומות אמיתיים מהדאטה - כלל הברזל חל גם על קישורים
    const placeIds = d[1].filter(
      (id): id is string => typeof id === 'string' && dest.places.some((p) => p.id === id),
    );
    cleanDays.push({
      citySlug: d[0],
      placeIds,
      notes: typeof d[2] === 'string' ? d[2].slice(0, 500) : undefined,
    });
  }
  if (cleanDays.length === 0) return null;
  return { name: name.slice(0, 80) || 'טיול משותף', days: cleanDays };
}
