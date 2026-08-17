/**
 * Places whose coordinate is too coarse to trust - wraps `src/lib/coordPrecision.ts` (see
 * there for the reasoning) and prints a worklist.
 *
 * Why this is a script and not a check that fails on every row: a coarse coordinate is not
 * an error that can be fixed in code - it is a **data gap**, and it needs somebody to open a
 * map and find the right point. `coordPrecision.test.ts` locks the existing list (does not
 * let it grow) without blocking every unrelated commit until it reaches zero.
 *
 * Usage:
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
