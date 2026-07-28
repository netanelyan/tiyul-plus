// הדפסת הקטלוג לליטרלים של TypeScript.
//
// **למה זה קובץ נפרד:** כדי ש-`catalog-roundtrip.mjs` יוכל לבדוק את
// המדפיס בלי רשת. בדיקת המיפוי לבדה לא מספיקה - באג ציטוט כאן היה
// משחית טקסט בלי שאף ספירה תשים לב. הפרויקט כבר נשרף על גרשים בתוך
// מחרוזות עבריות, ולכן זה נבדק ולא נסמך על העין.

/**
 * ציטוט מחרוזת. מעדיף גרשיים בודדים; עובר לכפולים כשיש גרש בטקסט
 * (שמות לטיניים כמו "Schindler's", ובעברית משתמשים ב-׳ U+05F3 שאינו
 * דורש דבר). מחרוזת שיש בה גם וגם מטופלת בבריחה מפורשת, ולכן אין מקרה
 * שנשבר. בקסלאש חייב לברוח ראשון, אחרת הוא בורח מהבריחה שאחריו.
 */
export function q(s) {
  const esc = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  return esc.includes("'") ? `"${esc.replace(/"/g, '\\"')}"` : `'${esc}'`;
}

/** ליטרל דטרמיניסטי: אותה כניסה נותנת תמיד אותו פלט, בלי diff מדומה. */
export function lit(v, indent = 0) {
  const pad = ' '.repeat(indent);
  if (v === null) return 'null';
  if (typeof v === 'string') return q(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const flat = v.every((x) => typeof x !== 'object' || x === null);
    const inline = `[${v.map((x) => lit(x, 0)).join(', ')}]`;
    if (flat && inline.length + indent <= 96) return inline;
    return `[\n${v.map((x) => `${pad}  ${lit(x, indent + 2)}`).join(',\n')},\n${pad}]`;
  }
  const entries = Object.entries(v).filter(([, val]) => val !== undefined);
  if (entries.length === 0) return '{}';
  const flat = entries.every(([, val]) => typeof val !== 'object' || val === null);
  const inline = `{ ${entries.map(([k, val]) => `${k}: ${lit(val, 0)}`).join(', ')} }`;
  if (flat && inline.length + indent <= 96) return inline;
  return `{\n${entries.map(([k, val]) => `${pad}  ${k}: ${lit(val, indent + 2)}`).join(',\n')},\n${pad}}`;
}

const banner = (what) => `// ${what}
//
// ** נוצר אוטומטית מ-Supabase על ידי scripts/catalog-pull.mjs. **
// אין לערוך ידנית: עריכה כאן תימחק בהרצה הבאה. מקור האמת הוא הטבלאות
// catalog_* ב-Supabase. אחרי יצירה מחדש הריצו:
//   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/catalog-roundtrip.mjs
//   node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs
`;

export function emitCountries(countries) {
  return `${banner('מדינות הקטלוג (עברית, RTL)')}
import type { Country } from '@/lib/types';

export const countries: Country[] = ${lit(countries, 0)};

export function getCountryBySlug(slug: string): Country | undefined {
  return countries.find((c) => c.slug === slug);
}
`;
}

export function emitDestinations(destinations) {
  return `${banner('יעדי הקטלוג (עברית, RTL)')}
import type { Destination } from '@/lib/types';

export const destinations: Destination[] = ${lit(destinations, 0)};

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}
`;
}
