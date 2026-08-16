import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackUncoveredQuickReplies } from './uncoveredReplies.ts';

/* חמישה טקסטים אמיתיים מהמודל החי, כולם על קייב - שניים מהם הגיעו בלי suggest_quick_replies בפועל */

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
  // "לא בקטלוג" בלי "לחקור" הוא לא בהכרח הצעת חקירה - שיחה אחרת לגמרי
  const text = 'יש לי כיסוי של 166 ערים ב-83 מדינות - וינה, פראג ורומא לא בקטלוג המורחב אבל כן בעיקרי.';
  assert.equal(fallbackUncoveredQuickReplies(text), null);
});

test('תשובה רגילה על טיול בכיסוי - לא נתפס', () => {
  const text = 'בניתי לך טיול 4 ימים בוינה עם 12 עצירות. רוצה שאוסיף עוד יום?';
  assert.equal(fallbackUncoveredQuickReplies(text), null);
});

test('המודל כן צירף כפתורים בעצמו - הפונקציה עדיין מחזירה ברירת מחדל (הקורא הוא זה שמחליט אם להשתמש)', () => {
  // האחריות לא-לדרוס שייכת לקורא (route.ts: !quickReplies), לא לפונקציה עצמה
  const text = 'קייב אינה בקטלוג שלי. רוצה שאנסה לחקור?';
  assert.ok(fallbackUncoveredQuickReplies(text));
});
