/**
 * שרת בלבד - דגלי מערכת, כלומר מפסק חירום בלי דיפלוי.
 *
 * למה זה קיים: הסוכן הוא ההוצאה הגדולה של המוצר. אם משהו נשבר - קמפיין
 * שמביא מאות אנשים בבת אחת, באג שמייצר לופ, מפתח שנחשף - הדרך לעצור
 * חייבת להיות מהירה יותר מדיפלוי. `agent_enabled=false` מפיל את
 * `/api/chat` לתשובות מבוססות הכללים שכבר קיימות למצב ללא מפתח, כך
 * שהאתר ממשיך לעבוד וההוצאה נעצרת מיד.
 *
 * מטמון של 30 שניות: מספיק קצר כדי שהמפסק ירגיש מיידי, ומספיק ארוך כדי
 * לא להוסיף קריאת דאטהבייס לכל הודעה.
 */

import { adminSelect, adminDbEnabled } from '@/lib/server/supabaseAdmin';

const TTL = 30_000;
let cache: { at: number; flags: Record<string, unknown> } | null = null;

async function load(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < TTL) return cache.flags;
  if (!adminDbEnabled()) return {};
  const rows = await adminSelect<{ key: string; value: unknown }>('app_flags', 'select=key,value');
  // כישלון קריאה לא מפעיל את המפסק: ברירת המחדל היא "הסוכן פועל", אחרת
  // תקלה רגעית בדאטהבייס הייתה משתיקה את המוצר כולו.
  if (!rows) return cache?.flags ?? {};
  const flags: Record<string, unknown> = {};
  for (const r of rows) flags[r.key] = r.value;
  cache = { at: Date.now(), flags };
  return flags;
}

/** האם הסוכן החכם פעיל. ברירת המחדל, בכל מקרה של ספק: כן. */
export async function agentEnabled(): Promise<boolean> {
  const flags = await load();
  return flags.agent_enabled === false ? false : true;
}

export async function allFlags(): Promise<Record<string, unknown>> {
  return load();
}

/** אחרי כתיבה - כדי שהמפסק לא יחכה 30 שניות */
export function invalidateFlags() {
  cache = null;
}
