/**
 * המספרים האמיתיים של הקטלוג, במקום אחד.
 *
 * ## למה זה סקריפט
 *
 * מספרי הקטלוג מופיעים בחומר שיווקי, בעמוד האודות ובסיכומי סשן, והם
 * מתיישנים **בכל פעם שמישהו מוסיף עיר** - כלומר כמעט כל יום. היומן הזה
 * כבר מתעד פעם אחת שבה דווח מספר שגוי בסיכום ("39 רשומות ב-29 יעדים"
 * כשבפועל היו 42 ב-28), והמסקנה שנרשמה שם הייתה לספור לפני שמצטטים.
 *
 * זה הסקריפט שהופך את המסקנה הזאת לזולה.
 *
 * הרצה:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/catalog-counts.mjs [--json]
 */
import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';
import { calendar } from '../src/data/calendar.ts';

const places = destinations.flatMap((d) => d.places ?? []);
const isKosher = (p) => String(p.category ?? '').startsWith('kosher');

const counts = {
  countries: countries.length,
  destinations: destinations.length,
  places: places.length,
  placesWithPhoto: places.filter((p) => p.photo).length,
  kosherPlaces: places.filter(isKosher).length,
  kosherCities: destinations.filter((d) => (d.places ?? []).some(isKosher)).length,
  calendarEntries: calendar.length,
  calendarConfirmed: calendar.filter((e) => e.datesConfirmed).length,
  ratedDestinations: destinations.filter((d) => d.editorialRating).length,
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(counts, null, 2) + '\n');
} else {
  const n = (x) => x.toLocaleString('en-US');
  console.log(`
מספרי הקטלוג, נכון להרצה הזאת
─────────────────────────────
מדינות                ${n(counts.countries)}
יעדים                 ${n(counts.destinations)}
מקומות                ${n(counts.places)}
  מתוכם עם תמונה      ${n(counts.placesWithPhoto)}
רשומות כשרות          ${n(counts.kosherPlaces)}  ב-${n(counts.kosherCities)} ערים
לוח אירועים וסגירות   ${n(counts.calendarEntries)}  (${n(counts.calendarConfirmed)} עם תאריכים מאושרים)
יעדים עם דירוג מערכת  ${n(counts.ratedDestinations)}

לצטט מכאן, לא מהזיכרון ולא מסיכום סשן ישן.
`);
}
