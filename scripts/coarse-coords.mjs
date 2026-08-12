/**
 * מקומות שהקואורדינטה שלהם גסה מכדי לסמוך עליה.
 *
 * ## למה זה סקריפט ולא בדיקה שנכשלת
 *
 * קואורדינטה גסה אינה שגיאה שאפשר לתקן בקוד - היא **פער דאטה**, וצריך
 * מישהו שיפתח מפה וימצא את הנקודה הנכונה. סקריפט מייצר רשימת עבודה;
 * טסט שנכשל רק חוסם קומיטים שאינם קשורים.
 *
 * ## למה הציר הגס קובע
 *
 * הדיוק של זוג נקבע ע"י הצלע החלשה: `45.66666793823242, 14` נראית
 * מדויקת עד שמסתכלים על הרכיב השני. הספרה הראשונה היא ארטיפקט של
 * float32, לא מדידה. לכן הדירוג הוא לפי `min(ספרות)`.
 *
 * שגיאה משוערת בקו הרוחב: 0 ספרות ~111 ק"מ, 1 ~11 ק"מ, 2 ~1.1 ק"מ.
 *
 * ## שדה גדול מול נקודה
 *
 * פארק לאומי או אגם הם שטח, ומרכז גס עבורם הוא לגיטימי. בית כנסת או
 * מסעדה הם נקודה, ושם קילומטר הוא ההבדל בין להגיע לבין לא. הפלט מפריד
 * ביניהם לפי הקטגוריה, כי זה מה שקובע אם זו באמת עבודה.
 *
 * הרצה:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/coarse-coords.mjs [--json]
 */
import { destinations } from '../src/data/destinations.ts';

/** קטגוריות שהן שטח ולא נקודה - מרכז גס עבורן סביר */
const AREA_CATEGORIES = new Set(['nature', 'viewpoint']);

const decimals = (n) => {
  const s = String(n);
  const i = s.indexOf('.');
  if (i === -1) return 0;
  /*
    חיתוך ארטיפקטים של float32: `45.66666793823242` הוא 45.666667
    שעבר עיגול כפול, ואין טעם לספור 14 ספרות משמעותיות שאיש לא מדד.
  */
  return Math.min(s.length - i - 1, 6);
};

const rows = [];
for (const d of destinations) {
  for (const p of d.places ?? []) {
    const dec = Math.min(decimals(p.lat), decimals(p.lng));
    if (dec > 2) continue;
    rows.push({
      destination: d.slug,
      id: p.id,
      name: p.name,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      decimals: dec,
      kmError: [111, 11, 1.1][dec],
      shape: AREA_CATEGORIES.has(p.category) ? 'area' : 'point',
    });
  }
}
rows.sort((a, b) => a.decimals - b.decimals || a.destination.localeCompare(b.destination));

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
} else {
  const total = destinations.reduce((n, d) => n + (d.places?.length ?? 0), 0);
  const points = rows.filter((r) => r.shape === 'point');
  console.log(`\n${rows.length} מקומות מתוך ${total} עם קואורדינטה של 2 ספרות עשרוניות או פחות.`);
  console.log(`מתוכם ${points.length} הם נקודה ולא שטח - אלה שבאמת צריך לתקן.\n`);
  for (const dec of [0, 1, 2]) {
    const g = rows.filter((r) => r.decimals === dec);
    if (!g.length) continue;
    console.log(`--- ${dec} ספרות (~${[111, 11, 1.1][dec]} ק"מ) : ${g.length} ---`);
    for (const r of g) {
      const mark = r.shape === 'point' ? '!' : ' ';
      console.log(`${mark} ${r.destination}/${r.id}  ${r.name}  (${r.lat},${r.lng})  ${r.category}`);
    }
    console.log('');
  }
  console.log('שורות עם ! הן נקודות - בית כנסת, מסעדה, מבנה - ושם קילומטר הוא פספוס.');
}
