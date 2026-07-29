import { destinations } from '@/data/destinations';
import type { CityNames } from '@/lib/trip/label';

/**
 * slug → שם העיר בעברית, ותו לא.
 *
 * נבנה בשרת ויורד ל-`SiteNav` כ-props. ~166 רשומות, בערך 4kB לפני דחיסה,
 * במקום 492kB של קטלוג דחוס ב-bundle של כל עמוד. ראו ההסבר ב-`label.ts`.
 *
 * מיוצר בכל רינדור שרת ולא נשמר במטמון בכוונה: הדאטה סטטית, `Object.
 * fromEntries` על 166 איברים הוא כלום, ומטמון מודול היה עוד מצב לתחזק.
 */
export function cityNames(): CityNames {
  return Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
}
