/**
 * Tests for webLookup.ts: when a search is allowed, how many times per conversation, and the cache.
 *
 * What is deliberately not tested here: the kashrut block. That is the responsibility of
 * `kosherIntentText` in grounding.ts (route.ts is what composes
 * `!kosherAsk && lookupEligible(...)`), and that is exactly why `kosherIntentText` is tested
 * there and not here - this file knows nothing at all about kashrut, and that is the point:
 * it has no path by which kashrut can reach a search in the first place.
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
    usr('נבדק ב-1.1.2026 - זה כתוב בהודעה שלי'), // not counted - this is not an agent reply
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
    getCachedLookup('  מה שעות הפתיחה של הקולוסיאום?  '), // whitespace and case do not change the key
    'פתוח 9-19 (נבדק ב-1.1.2026).',
  );
  assert.equal(getCachedLookup('שאלה אחרת לגמרי'), null);
});

test('todayIso מחזירה תאריך ISO אמיתי, לא מומצא', () => {
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
});
