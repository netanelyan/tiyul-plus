import type { PlacesProvider } from '@/lib/types';
import { sampleProvider } from './sample';
import { googleProvider } from './google';
import { tripadvisorProvider } from './tripadvisor';

/**
 * בחירת ספק הנתונים דרך משתנה סביבה - החלפת ספק היא שינוי קונפיגורציה,
 * לא שכתוב. ברירת מחדל: נתוני הדוגמה המקומיים (עובד בלי מפתחות).
 *
 *   NEXT_PUBLIC_PLACES_PROVIDER=sample | google | tripadvisor
 */
const providers: Record<string, PlacesProvider> = {
  sample: sampleProvider,
  google: googleProvider,
  tripadvisor: tripadvisorProvider,
};

export function getProvider(): PlacesProvider {
  const name = process.env.NEXT_PUBLIC_PLACES_PROVIDER ?? 'sample';
  return providers[name] ?? sampleProvider;
}
