/**
 * ---------- מה הפוטר מקשר אליו, נגזר מהדאטה ----------
 *
 * **שרת בלבד.** הקובץ מייבא את הקטלוג, ולכן אסור שרכיב לקוח ייגע בו -
 * זו בדיוק הדרך שבה 492kB דחוסים נכנסו פעם לכל עמוד באתר דרך `SiteNav`.
 * הפוטר הוא רכיב שרת, וכל מה שיוצא מכאן הוא רשימת קישורים קטנה.
 *
 * ## למה נגזר ולא כתוב ביד
 *
 * רשימת "היעדים הפופולריים" בפוטר היא בדיוק סוג הדבר שנכתב פעם אחת
 * ומזדקן בשקט: סשן הדאטה מוסיף יעדים כל לילה, ורשימה קבועה תמשיך להצביע
 * על אותן שמונה ערים מ-2026 בזמן שהקטלוג הכפיל את עצמו. אותו דבר
 * למספרים - "1,800 מקומות" בפוטר הוא מספר שיהיה שגוי בתוך שבוע.
 *
 * ## איך נבחרים היעדים
 *
 * לפי הדירוג העורכי שכבר קיים על כל יעד (`editorialRating.score`), עם
 * שובר-שוויון לפי מספר המקומות. ועוד כלל אחד שחשוב יותר מהדירוג:
 * **לכל היותר שני יעדים לאותה מדינה.** בלעדיו הרשימה מתמלאת באיטליה
 * ויוון ונראית כמו טעות, לא כמו בחירה.
 */

import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';

export interface FooterLink {
  href: string;
  label: string;
}

/** כמה מכל סוג. שורה של צ׳יפים, לא עמודה - ולכן מספרים קטנים. */
const MAX_DESTINATIONS = 10;
const MAX_COUNTRIES = 6;
const MAX_PER_COUNTRY = 2;

/** מעל זה השם כבר לא נכנס לצ׳יפ בלי לשבור את השורה */
const MAX_NAME_CHARS = 12;

/**
 * שם שמתאים לצ׳יפ.
 *
 * הדירוג העורכי לבדו העלה לפוטר את "הגרנד קניון ופארקי הדרום-מערב"
 * ו"קווינסטאון והאי הדרומי" - שמות נכונים לגמרי, שבשורת צ׳יפים נראים
 * מרופטים ודוחפים כל שורה לשתיים. שני הפוסלים הם אורך, ו-ו׳ החיבור
 * שמסגירה שם מורכב ("X ו-Y"), ומקף שעושה את אותו הדבר.
 *
 * זה מסנן **מאיזה מאגר בוחרים**, לא מה נכון: היעדים האלה נשארים
 * בקטלוג ובקישור "כל היעדים" שבסוף השורה.
 */
const isChipName = (name: string) =>
  name.length <= MAX_NAME_CHARS && !/\sו/.test(name) && !name.includes('-');

const score = (d: (typeof destinations)[number]) => d.editorialRating?.score ?? 0;

/** היעדים המשמעותיים ביותר, בפיזור סביר בין מדינות */
export const footerDestinations: FooterLink[] = (() => {
  const ranked = [...destinations]
    .filter((d) => isChipName(d.name))
    .sort(
      (a, b) => score(b) - score(a) || b.places.length - a.places.length || a.slug.localeCompare(b.slug),
    );
  const perCountry = new Map<string, number>();
  const picked: FooterLink[] = [];
  for (const d of ranked) {
    if (picked.length >= MAX_DESTINATIONS) break;
    const used = perCountry.get(d.countrySlug) ?? 0;
    if (used >= MAX_PER_COUNTRY) continue;
    perCountry.set(d.countrySlug, used + 1);
    picked.push({ href: `/destinations/${d.slug}`, label: d.name });
  }
  return picked;
})();

/** המדינות שהקטלוג הכי עמוק בהן - לפי מספר היעדים, ואז מקומות */
export const footerCountries: FooterLink[] = (() => {
  const byCountry = new Map<string, { dests: number; places: number }>();
  for (const d of destinations) {
    const acc = byCountry.get(d.countrySlug) ?? { dests: 0, places: 0 };
    acc.dests += 1;
    acc.places += d.places.length;
    byCountry.set(d.countrySlug, acc);
  }
  return [...countries]
    .filter((c) => byCountry.has(c.slug) && isChipName(c.name))
    .sort((a, b) => {
      const x = byCountry.get(a.slug)!;
      const y = byCountry.get(b.slug)!;
      return y.dests - x.dests || y.places - x.places || a.slug.localeCompare(b.slug);
    })
    .slice(0, MAX_COUNTRIES)
    .map((c) => ({ href: `/countries/${c.slug}`, label: c.name }));
})();

/**
 * היקף הקטלוג. **אף מספר כאן לא נכתב ביד** - ראו את הטסט שסופר מהדאטה
 * ומשווה, כדי שאי אפשר יהיה להחליף את זה במחרוזת "נוחה" בעתיד.
 */
export const catalogCounts = {
  places: destinations.reduce((n, d) => n + d.places.length, 0),
  destinations: destinations.length,
  countries: countries.filter((c) => destinations.some((d) => d.countrySlug === c.slug)).length,
};

/** "1,814 מקומות · 166 יעדים · 83 מדינות" - מספרים בפורמט עברי קריא */
export const coverageCountsLine = (): string =>
  [
    `${catalogCounts.places.toLocaleString('he-IL')} מקומות`,
    `${catalogCounts.destinations} יעדים`,
    `${catalogCounts.countries} מדינות`,
  ].join(' · ');
