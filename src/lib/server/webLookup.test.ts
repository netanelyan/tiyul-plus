/**
 * טסטים ל-webLookup.ts: מתי מותר לחפש, כמה פעמים בשיחה, והמטמון.
 *
 * מה שלא נבדק כאן בכוונה: חסימת כשרות. זו אחריות של `kosherIntentText`
 * ב-grounding.ts (route.ts הוא מי שמרכיב `!kosherAsk && lookupEligible(...)`),
 * וזה בדיוק למה `kosherIntentText` נבדקת שם ולא כאן - הקובץ הזה לא יודע
 * שום דבר על כשרות, וזו הנקודה: אין לו שום מסלול שדרכו כשרות יכולה
 * להגיע לחיפוש בכלל.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCachedLookup,
  lookupBudgetLeft,
  lookupEligible,
  lookupsUsedSoFar,
  rememberLookup,
  resetLookupCacheForTest,
  todayIso,
} from './webLookup.ts';
import type { ChatMessage } from './chatMessages.ts';

const asst = (content: string): ChatMessage => ({ role: 'assistant', content });
const usr = (content: string): ChatMessage => ({ role: 'user', content });

test('lookupEligible תופסת שעות/מחיר-כניסה/קיום, ולא שיחה כללית', () => {
  for (const q of [
    'מה שעות הפתיחה של הקולוסיאום?',
    'כמה עולה כרטיס כניסה למוזיאון?',
    'האם המקום עדיין קיים?',
    'is it still open on sundays',
    'what are the opening hours',
  ]) {
    assert.equal(lookupEligible(q), true, q);
  }
  for (const q of [
    'מה כדאי לראות ברומא?',
    'תבנה לי מסלול של 4 ימים',
    'איפה כדאי לאכול?',
    '',
  ]) {
    assert.equal(lookupEligible(q), false, q);
  }
});

test('lookupsUsedSoFar סופרת ציטוטים בתשובות הסוכן בלבד, לא בהודעות המשתמש', () => {
  const messages = [
    usr('מה שעות הפתיחה?'),
    asst('פתוח בין 9:00 ל-19:00 (מקור: site.com, נבדק ב-1.1.2026).'),
    usr('נבדק ב-1.1.2026 - זה כתוב בהודעה שלי'), // לא נספר - זה לא תשובת סוכן
    asst('בלי ציטוט בכלל'),
  ];
  assert.equal(lookupsUsedSoFar(messages), 1);
});

test('lookupBudgetLeft נסגרת אחרי התקרה לשיחה', () => {
  const cited = asst('נבדק ב-1.1.2026 - עובדה כלשהי.');
  const under = Array.from({ length: 2 }, () => cited);
  const atCap = Array.from({ length: 3 }, () => cited);
  assert.equal(lookupBudgetLeft(under), true);
  assert.equal(lookupBudgetLeft(atCap), false);
});

test('מטמון: שאלה זהה פעם שנייה מחזירה את התשובה בלי לחפש שוב', () => {
  resetLookupCacheForTest();
  assert.equal(getCachedLookup('מה שעות הפתיחה של הקולוסיאום?'), null);
  rememberLookup('מה שעות הפתיחה של הקולוסיאום?', 'פתוח 9-19 (נבדק ב-1.1.2026).');
  assert.equal(
    getCachedLookup('  מה שעות הפתיחה של הקולוסיאום?  '), // רווחים/אותיות לא משנים את המפתח
    'פתוח 9-19 (נבדק ב-1.1.2026).',
  );
  assert.equal(getCachedLookup('שאלה אחרת לגמרי'), null);
});

test('todayIso מחזירה תאריך ISO אמיתי, לא מומצא', () => {
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
});
