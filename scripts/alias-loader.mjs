/**
 * מגשר בין דרך הייבוא של הפרויקט לדרך שבה Node פותר מודולים, כדי ש-
 * `npm test` יוכל לייבא מ-`src/lib` בדיוק כמו שהאפליקציה מייבאת - בלי
 * להוסיף תלות פיתוח (vitest/jest דורש אישור לפי חוק קשיח 6).
 *
 * שני פערים, שניהם חוזים בין TypeScript ל-bundler של Next שאין ל-Node
 * מושג עליהם:
 *   1. הכינוי `@/...` (מוגדר ב-tsconfig `paths`) - `@/data/x` → `src/data/x`.
 *   2. ייבוא יחסי בלי סיומת (`./travel`) - type-stripping דורש נתיב מלא.
 *
 * בלי שניהם כל ייבוא בתוך הספרייה נכשל ב-ERR_MODULE_NOT_FOUND, וזו הסיבה
 * שלא היו כאן טסטים עד עכשיו. ה-hook עצמו יושב ב-alias-hooks.mjs.
 */
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
