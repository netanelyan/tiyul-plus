import { getProvider } from '@/lib/providers';
import { isKosher } from '@/lib/categories';
import KosherSearch, { type KosherCity } from './KosherSearch';

/**
 * Standalone kosher search - a separate entry point from the filter on each
 * destination page: for whoever wants to know "is there kosher food in city X"
 * without going through the full destination page first. Draws from the same
 * validated data (destinations.ts) - never invents entries for cities that are
 * not in the catalog.
 *
 * The page opens as a directory: every city that genuinely has kosher entries
 * is shown as a card before anything is typed, and the search only filters
 * them in real time.
 */
export const metadata = {
  title: 'כשרות | טיול+',
  description:
    'ספריית הכשרות של טיול+: כל הערים בקטלוג שיש בהן מסעדות, חנויות ובתי חב"ד - עם מפה ופרטים. המידע נאסף ממקורות ציבוריים - לוודא מול המקום.',
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
        ופרטי ההשגחה כפי שנמסרו. המידע נאסף ממקורות ציבוריים - חשוב לוודא מול המקום לפני הביקור.
      </p>
      <KosherSearch cities={cities} />
    </div>
  );
}
