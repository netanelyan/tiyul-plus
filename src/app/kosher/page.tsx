import { getProvider } from '@/lib/providers';
import { isKosher } from '@/lib/categories';
import KosherSearch, { type KosherCity } from './KosherSearch';

/**
 * חיפוש כשרות עצמאי - נקודת כניסה נפרדת מהפילטר בכל דף יעד: מי שרוצה
 * לדעת "יש כשר בX" בלי לעבור קודם דרך דף היעד המלא. שואב מאותו נתון
 * מתוקף (destinations.ts) - לא ממציא רשומות לערים שלא בקטלוג.
 */
export const metadata = {
  title: 'כשרות | טיול+',
  description: 'חיפוש אוכל ומקומות כשרים לפי עיר - מתוך הקטלוג של טיול+, עם סימון ברור מה כבר אומת ומה עדיין לא.',
};

export default async function KosherPage() {
  const provider = getProvider();
  const summaries = await provider.getDestinations();
  const fullDests = await Promise.all(summaries.map((s) => provider.getDestination(s.slug)));

  const cities: KosherCity[] = fullDests
    .filter((d) => d !== null)
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      nameLocal: d.nameLocal,
      flag: d.flag,
      center: d.center,
      zoom: d.zoom,
      kosherOverview: d.practical.kosherOverview,
      kosherPlaces: d.places.filter((p) => isKosher(p.category)),
    }));

  return (
    <div>
      <h1 className="display text-3xl text-night sm:text-4xl">כשרות בעולם</h1>
      <p className="mt-3 max-w-xl leading-relaxed text-night/60">
        מחפשים עיר, ורואים בדיוק מה יש בה: מסעדות, חנויות ובתי חב"ד מהקטלוג של
        טיול+ - וליד כל רשומה נאמר בכנות אם היא כבר אומתה מול המקום או לא. רוב
        הרשומות שלנו עדיין מסומנות כלא מאומתות, וצריך לוודא אותן לפני שמסתמכים.
      </p>
      <KosherSearch cities={cities} />
    </div>
  );
}
