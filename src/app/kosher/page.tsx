import { getProvider } from '@/lib/providers';
import { isKosher } from '@/lib/categories';
import KosherSearch, { type KosherCity } from './KosherSearch';

/**
 * חיפוש כשרות עצמאי - נקודת כניסה נפרדת מהפילטר בכל דף יעד: מי שרוצה
 * לדעת "יש כשר בX" בלי לעבור קודם דרך דף היעד המלא. שואב מאותו נתון
 * מתוקף (destinations.ts) - לא ממציא רשומות לערים שלא בקטלוג.
 *
 * הדף נפתח כספרייה: כל הערים שבאמת יש בהן רשומות כשרות מוצגות ככרטיסים
 * עוד לפני שמקלידים משהו, והחיפוש רק מסנן אותן בזמן אמת.
 */
export const metadata = {
  title: 'כשרות | טיול+',
  description:
    'ספריית הכשרות של טיול+: כל הערים בקטלוג שיש בהן מסעדות, חנויות ובתי חב"ד - עם סימון ברור מה כבר אומת ומה עדיין לא.',
};

export default async function KosherPage() {
  const provider = getProvider();
  const [summaries, countries] = await Promise.all([
    provider.getDestinations(),
    provider.getCountries(),
  ]);
  const fullDests = await Promise.all(summaries.map((s) => provider.getDestination(s.slug)));
  const countryName = (slug: string) => countries.find((c) => c.slug === slug)?.name ?? '';

  const cities: KosherCity[] = fullDests
    .filter((d) => d !== null)
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      nameLocal: d.nameLocal,
      flag: d.flag,
      country: countryName(d.countrySlug),
      photo: d.photo,
      center: d.center,
      zoom: d.zoom,
      kosherOverview: d.practical.kosherOverview,
      kosherPlaces: d.places.filter((p) => isKosher(p.category)),
    }));

  return (
    <div>
      <h1 className="display text-3xl text-night sm:text-4xl">כשרות בעולם</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-night/60">
        כל מקום כשר שיש לנו בקטלוג, לפי עיר: מסעדות, חנויות ובתי חב&quot;ד - עם מפה, פרטים
        ואמירה כנה ליד כל רשומה אם היא כבר אומתה מול המקום או לא.
      </p>
      <KosherSearch cities={cities} />
    </div>
  );
}
