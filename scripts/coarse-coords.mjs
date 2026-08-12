/**
 * מקומות שהקואורדינטה שלהם גסה מכדי לסמוך עליה - עוטף
 * `src/lib/coordPrecision.ts` (ראו שם את הנימוקים) ומדפיס worklist.
 *
 * למה זה סקריפט ולא בדיקה שנכשלת על כל שורה: קואורדינטה גסה אינה
 * שגיאה שאפשר לתקן בקוד - היא **פער דאטה**, וצריך מישהו שיפתח מפה
 * וימצא את הנקודה הנכונה. `coordPrecision.test.ts` נועל את הרשימה
 * הקיימת (לא מרשה לה לגדול) בלי לחסום כל קומיט שאינו קשור עד שהיא
 * תרד לאפס.
 *
 * הרצה:
 *   node --experimental-strip-types --import ./scripts/alias-loader.mjs \
 *     scripts/coarse-coords.mjs [--json]
 */
import { destinations } from '../src/data/destinations.ts';
import { coarseCoordRows } from '../src/lib/coordPrecision.ts';

const rows = coarseCoordRows(destinations, 2);

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
    console.log(`--- ${dec} ספרות (~${g[0].kmError} ק"מ) : ${g.length} ---`);
    for (const r of g) {
      const mark = r.shape === 'point' ? '!' : ' ';
      console.log(`${mark} ${r.destination}/${r.id}  ${r.name}  (${r.lat},${r.lng})  ${r.category}`);
    }
    console.log('');
  }
  console.log('שורות עם ! הן נקודות - בית כנסת, מסעדה, מבנה - ושם קילומטר הוא פספוס.');
}
