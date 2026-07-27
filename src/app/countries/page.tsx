import Link from 'next/link';
import { getProvider } from '@/lib/providers';
import DestinationBrowser from '@/components/DestinationBrowser';
import { buildDestinationCards } from '@/lib/destinationFacets';

export const metadata = { title: 'יעדים | טיול+' };

/**
 * קטלוג היעדים.
 *
 * היה רשת של כרטיסי **מדינות**. נתנאל הראה דפדפן יעדים של מתחרה - טאבי
 * יבשת עם מונים וצ׳יפים של אופי - ואמר שזו פיצ׳ר טובה, וזה נכון: כרטיס
 * מדינה לא יכול להגיד לך שהיא רומנטית או טובה למשפחות, ולכן הוא גרוע
 * לגילוי. עכשיו הרשת היא **יעדים**, והמדינות נשארות במרחק לחיצה מכל
 * כרטיס ומהחיפוש.
 *
 * הפאסטים מחושבים בשרת (`buildDestinationCards` מייבא את כל הקטלוג) ומה
 * שעובר ללקוח הוא מערך שטוח - הקטלוג עצמו לא נכנס ל-bundle.
 */
export default async function CountriesPage() {
  const provider = getProvider();
  const [countries, dests] = await Promise.all([
    provider.getCountries(),
    provider.getDestinations(),
  ]);
  const cards = buildDestinationCards();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl text-night">לאן טסים?</h1>
          <p className="mt-2 text-night/60">
            {dests.length} יעדים ב-{countries.length} מדינות, כל אחד עם מסלול מוכן, מפה ושכבת
            כשרות. אפשר לבחור יבשת, ואז לצמצם לפי אופי.
          </p>
        </div>
        <Link
          href="/chat"
          className="rounded-xl bg-shell px-4 py-2.5 text-sm font-bold text-night ring-1 ring-night/15 transition hover:ring-night/30"
        >
          לא בטוחים? לשאול את הסוכן ←
        </Link>
      </div>

      {/*
        אין כאן שדה חיפוש כלל-אתרי. הוא היה, ויצר שני שדות חיפוש זה מעל
        זה - בדיוק הכפילות שהוסרה מהניווט. לדפדפן יש סינון משלו שמסנן את
        הרשת הזו, והחיפוש הכלל-אתרי (שמוצא גם מקומות בתוך ערים) נשאר
        באייקון בניווט ובקיצור Ctrl+K, בכל עמוד באתר.
      */}
      <div className="mt-6">
        <DestinationBrowser cards={cards} />
      </div>

      <div className="mt-10 rounded-2xl bg-night/[0.03] p-5">
        <h2 className="text-sm font-bold text-night/70">לגלוש לפי מדינה</h2>
        <p className="mt-1 text-xs font-medium text-night/50">
          ויזה, מטבע, סים ותשלומים הם מידע ברמת המדינה - שם הוא נמצא.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <Link
              key={c.slug}
              href={`/countries/${c.slug}`}
              className="rounded-full bg-shell px-3 py-1.5 text-xs font-semibold text-night/70 ring-1 ring-night/10 transition hover:text-night hover:ring-night/25"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
