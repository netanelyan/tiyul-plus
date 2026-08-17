import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackUncoveredQuickReplies } from './uncoveredReplies.ts';

/* Five real texts from the live model, all about Kyiv - two of them arrived without suggest_quick_replies in practice */

test('טקסט אמיתי בלי כפתורים - מקבל ברירת מחדל', () => {
  const text =
    'קייב אינה בקטלוג שלי כרגע, אבל אני יכול לנסות לחקור אותה אוטומטית ממקורות ציבוריים ולבנות לך תוכנית. ' +
    'חשוב לדעת שהמידע יהיה לא מאומת ויצטרך אימות מצדך.\n\n' +
    'אני לא יכול לבדוק מחירים או זמינות בעצמי, ולכן לא אנקוב במספרים.\n\n' +
    'רוצה שאנסה לחקור את קייב, או שמעדיף יעד אחר?';
  const replies = fallbackUncoveredQuickReplies(text);
  assert.ok(replies && replies.length > 0);
});

test('טקסט אמיתי עם ניסוח שונה - "אינה נמצאת במאגר" עדיין נתפס', () => {
  const text =
    'קייב אינה נמצאת במאגר היעדים המאומתים שלי כרגע. ' +
    'אני יכול לנסות לחקור אותה אוטומטית מהמקורות הפומביים כדי לבנות לך תוכנית, אבל חשוב שתדעי שהנתונים לא מאומתים.';
  assert.ok(fallbackUncoveredQuickReplies(text));
});

test('"כרגע לא נמצאת בקטלוג" עדיין נתפס', () => {
  const text = 'קייב כרגע לא נמצאת בקטלוג שלי בגלל המצב הביטחוני. אני יכול לנסות לחקור את היעד אוטומטית.';
  assert.ok(fallbackUncoveredQuickReplies(text));
});

test('שאלה כללית על כיסוי בלי הצעת חקירה - לא נתפס', () => {
  // "not in the catalog" without "explore" is not necessarily an explore offer - an entirely different conversation
  const text = 'יש לי כיסוי של 166 ערים ב-83 מדינות - וינה, פראג ורומא לא בקטלוג המורחב אבל כן בעיקרי.';
  assert.equal(fallbackUncoveredQuickReplies(text), null);
});

test('תשובה רגילה על טיול בכיסוי - לא נתפס', () => {
  const text = 'בניתי לך טיול 4 ימים בוינה עם 12 עצירות. רוצה שאוסיף עוד יום?';
  assert.equal(fallbackUncoveredQuickReplies(text), null);
});

test('המודל כן צירף כפתורים בעצמו - הפונקציה עדיין מחזירה ברירת מחדל (הקורא הוא זה שמחליט אם להשתמש)', () => {
  // The responsibility not to override belongs to the caller (route.ts: !quickReplies), not to the function itself
  const text = 'קייב אינה בקטלוג שלי. רוצה שאנסה לחקור?';
  assert.ok(fallbackUncoveredQuickReplies(text));
});
