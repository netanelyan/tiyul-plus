/**
 * ה-resolve hook עצמו. חי בקובץ נפרד ונרשם לפי נתיב (ולא כ-data: URL עם
 * import דינמי) בכוונה: גרסה קודמת ייבאה את קובץ העזר מתוך ה-hook, וה-
 * import הזה עבר שוב דרך ה-hook - רקורסיה אינסופית ו-"Maximum call stack
 * size exceeded". static import כאן נפתר לפני שה-hook פעיל, ולכן בטוח.
 *
 * מה הוא פותר, ולמה זה נדרש - ראו alias-loader.mjs.
 */
import { existsSync } from 'node:fs';

const SRC = new URL('../src/', import.meta.url);

function firstExisting(base, rest) {
  for (const candidate of [rest, `${rest}.ts`, `${rest}.tsx`, `${rest}/index.ts`]) {
    const url = new URL(candidate, base);
    if (existsSync(url)) return url.href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  // הכינוי של הפרויקט: "@/data/x" -> src/data/x
  if (specifier.startsWith('@/')) {
    const url = firstExisting(SRC, specifier.slice(2));
    if (url) return { url, shortCircuit: true };
  }
  // ייבוא יחסי בלי סיומת: type-stripping דורש נתיב מפורש
  if (context.parentURL && /^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    const url = firstExisting(context.parentURL, specifier);
    if (url) return { url, shortCircuit: true };
  }
  return next(specifier, context);
}
