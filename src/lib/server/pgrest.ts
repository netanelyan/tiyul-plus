/**
 * בניית שאילתות PostgREST - **המקום היחיד שמותר לו להרכיב query string**
 * מול Supabase.
 *
 * ## למה זה קיים
 *
 * ביקורת אבטחה על כל נתיב שנוגע בדאטהבייס לא מצאה הזרקה חיה: כל ערך
 * שמגיע ממשתמש הוא או `encodeURIComponent`, או עבר ולידציה של regex,
 * או uuid שהשרת עצמו קיבל מ-Supabase, ובפונקציות ה-SQL אין SQL דינמי
 * בכלל. אבל **הבטיחות נשענה על כך שכל קורא זוכר להצפין**, וחתימת
 * `adminSelect(table, query: string)` ממש מזמינה לבנות מחרוזת ביד:
 *
 *     adminSelect('profiles', `user_id=eq.${id}`)   // עובד. ובאג ממתין.
 *
 * זה בדיוק סוג הכלל שהיומן הזה מלא בכישלונות שלו: כלל שנשען על זיכרון
 * נשבר ברגע שמישהו ממהר. לכן הערך לא "אמור" להיות מוקדד - הוא **לא
 * יכול** להגיע לשרת בלי קידוד, כי אין דרך אחרת לבנות שאילתה.
 *
 * ## מה זה מונע בפועל
 *
 * PostgREST מפרש פסיק, סוגריים ונקודה בתוך ערך של פילטר. ערך לא-מקודד
 * מאפשר להחליף את הפרדיקט - `1&role=eq.owner`, `x,y` בתוך `in.()`, או
 * `or=(...)` - כלומר לקרוא או לעדכן שורות של מישהו אחר. הקידוד הופך
 * את התווים האלה לחלק מהערך, ולעולם לא לתחביר.
 *
 * שמות עמודות, טבלאות ופונקציות אינם ערכים ולכן אינם מקודדים - הם
 * מאומתים מול regex צר ונדחים אחרת. הם תמיד ליטרלים בקוד; הבדיקה כאן
 * היא כדי שזה יישאר נכון.
 */

const IDENT = /^[a-z_][a-z0-9_]*$/;

export class PgrestError extends Error {}

function ident(name: string): string {
  if (!IDENT.test(name)) throw new PgrestError(`unsafe identifier: ${name}`);
  return name;
}

/** שם טבלה/view/פונקציה שנכנס לנתיב ה-URL */
export function pgIdent(name: string): string {
  return ident(name);
}

/** מזהה uuid שנכנס לנתיב URL (GoTrue admin) - חייב להיות uuid ממש */
export function pgUuid(value: string): string {
  if (!/^[0-9a-fA-F-]{36}$/.test(value)) throw new PgrestError('unsafe uuid');
  return value;
}

type Scalar = string | number | boolean;

/** ערך של פילטר. תמיד מקודד - זו כל הפואנטה של הקובץ. */
export function pgValue(value: Scalar): string {
  const s = typeof value === 'string' ? value : String(value);
  // תווי בקרה לא אמורים להגיע לכאן משום מסלול לגיטימי, ו-encodeURIComponent
  // דווקא יעביר אותם הלאה מקודדים. עדיף להיכשל רועש.
  if (/[\u0000-\u001f\u007f]/.test(s)) throw new PgrestError('control character in filter value');
  // **encodeURIComponent לבדו לא מספיק כאן, וזה נתפס ע"י הטסט ולא בעין.**
  // הוא משאיר `!'()*` כמו שהם, ולשלושה מהם יש משמעות ב-PostgREST:
  // סוגריים סוגרים רשימת `in.(...)` או עץ `or=(...)`, וכוכבית היא
  // התו-הכללי של `like`/`ilike`. מקודדים גם אותם (הצורה של RFC 3986).
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is';

/** `col=op.value` עם ערך מקודד */
export function pgFilter(column: string, op: Op, value: Scalar): string {
  return `${ident(column)}=${op}.${pgValue(value)}`;
}

export const eq = (column: string, value: Scalar) => pgFilter(column, 'eq', value);
export const gte = (column: string, value: Scalar) => pgFilter(column, 'gte', value);
/** `col=neq.value` - שלילה. אותו קידוד בדיוק, ולכן אותה בטיחות. */
export const neq = (column: string, value: Scalar) => pgFilter(column, 'neq', value);

/** `col=in.(a,b,c)` - כל איבר מקודד בנפרד, כך שפסיק בתוך ערך לא מפצל */
export function pgIn(column: string, values: Scalar[]): string {
  return `${ident(column)}=in.(${values.map((v) => pgValue(v)).join(',')})`;
}

/** רשימת עמודות להחזרה. ליטרלים בקוד בלבד - לא קלט משתמש. */
export function pgSelect(columns: string[]): string {
  return `select=${columns.map(ident).join(',')}`;
}

export function pgOrder(column: string, dir: 'asc' | 'desc' = 'asc'): string {
  return `order=${ident(column)}.${dir}`;
}

export function pgLimit(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new PgrestError('bad limit');
  return `limit=${n}`;
}

/** מחבר את החלקים ל-query string אחד */
export function pgQuery(...parts: string[]): string {
  return parts.filter(Boolean).join('&');
}
