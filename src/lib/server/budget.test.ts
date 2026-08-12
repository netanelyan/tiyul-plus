/**
 * שני הארנקים והתקרה האישית.
 *
 * הטענה המרכזית שנבדקת כאן היא **שלילית**: אין שום מסלול שבו תנועה
 * אנונימית מכבה את הסוכן למי שמחובר. זו הייתה הבעיה שנתנאל הצביע
 * עליה, והיא הופכת בעיית עלות לנפילה.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANON_CALLER_CAP_USD,
  ANON_SHARE,
  CALLER_ALERT_AT,
  CALLER_CAP_USD,
  IP_BACKSTOP_MULTIPLE,
  budgetFor,
  isAnonIdentity,
  measuredCost,
  recordSpend,
  resetBudgetForTest,
} from './budget.ts';

import { DEFAULT_DAILY_BUDGET_USD } from './budget.ts';

// נקרא מהקוד ולא נכתב כאן: מספר קשיח בבדיקה נשבר בכל כוונון תקציב,
// והבדיקות האלה בודקות **יחסים**, לא את גובה התקרה.
const BUDGET = DEFAULT_DAILY_BUDGET_USD;

const spend = (identity: string, usd: number) => {
  // רישום ישיר: המחיר מחושב מטוקנים, אז מייצרים usage שמגיע לסכום
  // הרצוי בדיוק - פלט של haiku הוא $5 למיליון, כלומר 200,000 טוקן לדולר
  recordSpend({
    identity,
    userId: identity.startsWith('user:') ? 'u' : null,
    tripId: null,
    route: 'chat',
    model: 'claude-haiku-4-5',
    usage: { output_tokens: Math.round(usd * 200_000) },
  });
};

/* ---------- הפרדת הארנקים ---------- */

test('אנונימי מוגבל לחלק שלו מהיום', async () => {
  resetBudgetForTest();
  const s = await budgetFor('anon:aaaaaaaaaaaaaaaa');
  assert.equal(s.poolBudget, BUDGET * ANON_SHARE);
  assert.equal(s.exceeded, false);
});

test('**אנונימיים ששרפו את הארנק שלהם לא נוגעים במחוברים**', async () => {
  resetBudgetForTest();
  /*
    אחד-עשר מבקרים אנונימיים, כל אחד עשירית מהארנק - כלומר מעט מעל
    הארנק כולו. ההצפה המכוונת היא כדי לא לשבת בדיוק על הגבול: סכימה
    של עשירית עשר פעמים היא 1.4999999999999998 בנקודה צפה, ובדיקה
    שנשענת על שוויון מדויק שם היא בדיקה שבורה ולא פיצ׳ר שבור.
  */
  for (let i = 0; i < 11; i++) spend(`anon:${'b'.repeat(15)}${i}`, (BUDGET * ANON_SHARE) / 10);

  const anon = await budgetFor('anon:cccccccccccccccc');
  assert.equal(anon.exceeded, true, 'אנונימי חדש נחסם');
  assert.equal(anon.reason, 'anon-pool');

  const user = await budgetFor('user:someone');
  assert.equal(user.exceeded, false, 'מחובר ממשיך כרגיל - זו כל הנקודה');
  /*
    **הרצפה מוחלטת.** אנונימיים חרגו כאן מהארנק שלהם ($1.65 מתוך
    $1.50), כי התקרה נבדקת לפני הקריאה ולא אחריה - ואסור שהחריגה
    תיגרע מהמחוברים. הבדיקה הזאת נכשלה בגרסה הראשונה ובעקבותיה נוסף
    ה-min ב-budget.ts.
  */
  assert.ok(user.poolBudget >= BUDGET * (1 - ANON_SHARE) - 1e-9, String(user.poolBudget));
});

test('ביום שקט מבחינת אנונימיים, מחוברים מקבלים את כל התקציב', async () => {
  /*
    שני ארנקים קשיחים היו יוצרים את הבעיה ההפוכה - חסימת מחוברים בזמן
    ש-30% יושבים ללא שימוש. זה הטסט שמונע חזרה לשם.
  */
  resetBudgetForTest();
  const user = await budgetFor('user:someone');
  assert.equal(user.poolBudget, BUDGET);
});

/* ---------- התקרה האישית ---------- */

test('זהות אחת לא יכולה לקחת חלק גדול מהיום', async () => {
  resetBudgetForTest();
  const id = 'user:heavy';
  spend(id, CALLER_CAP_USD);
  const s = await budgetFor(id);
  assert.equal(s.exceeded, true);
  assert.equal(s.reason, 'caller');
  // ואחרים לא נפגעו
  assert.equal((await budgetFor('user:other')).exceeded, false);
});

/**
 * **התקרה האישית היא מספר מוחלט ואינה נגזרת מהיום** - זה השינוי שמאפשר
 * להוריד את התקרה היומית בלי לחתוך אף אחד באמצע סשן. הטסט בודק את
 * שתי הטענות: אותו סכום לאנונימי ולמחובר, ואי-תלות בגובה היום.
 */
test('התקרה האישית מוחלטת, זהה לשתי השכבות, ולא זזה עם היום', async () => {
  resetBudgetForTest();
  const s = await budgetFor('anon:dddddddddddddddd');
  assert.equal(s.callerBudget, ANON_CALLER_CAP_USD);
  assert.equal(s.callerBudget, CALLER_CAP_USD, 'אותה תקרה שמקבל מחובר');

  /*
    הטענה המרכזית: היום זז פי ארבעה - $40 ואז $10 - **והתקרה האישית לא
    זזה בכלל**. בגרסה הקודמת (12% מהיום) היא הייתה $4.80 ואז $1.20,
    כלומר במקרה השני פחות מסשן אחד. שני הערכים כאן מעל $3 בכוונה, כדי
    שהטענה תהיה על אי-התלות ולא על הגזימה.
  */
  for (const day of [40, 10]) {
    resetBudgetForTest();
    process.env.AI_DAILY_BUDGET_USD = String(day);
    const at = await budgetFor('anon:dddddddddddddddd');
    delete process.env.AI_DAILY_BUDGET_USD;
    assert.equal(at.budget, day, 'היום באמת השתנה');
    assert.equal(at.callerBudget, CALLER_CAP_USD, `התקרה האישית נגררה אחרי יום של $${day}`);
  }
});

/** השומר היחיד שנשאר: תקרה אישית לא יכולה להיות גדולה מהיום כולו */
test('תקרה יומית קטנה מהתקרה האישית גוזמת אותה', async () => {
  resetBudgetForTest();
  process.env.AI_DAILY_BUDGET_USD = '1';
  const s = await budgetFor('user:x');
  delete process.env.AI_DAILY_BUDGET_USD;
  assert.equal(s.callerBudget, 1);
});

/**
 * הטענה שכל הכיול הזה קיים בשבילה: **סשן תכנון אנונימי מלא נכנס
 * בתקרה האישית**. המספרים הם מדידה (31.7): קריאה קרה $0.447, קריאה
 * חמה $0.063, ומכסת ההודעות של השכבה האנונימית היא 25.
 */
test('סשן תכנון אנונימי מלא לא נחסם', async () => {
  resetBudgetForTest();
  const id = 'anon:eeeeeeeeeeeeeeee';
  const COLD = 0.447;
  const WARM = 0.063;
  // התרחיש הגרוע: שתי קריאות קרות (הפסקה ארוכה באמצע) ועוד 23 חמות
  spend(id, COLD * 2 + WARM * 23);
  const s = await budgetFor(id);
  assert.equal(s.exceeded, false, `סשן מלא עלה ${s.callerSpent} מול תקרה ${s.callerBudget}`);
  assert.ok(s.callerBudget > COLD * 2 + WARM * 23, 'ובנוחות, לא בדיוק');
});

/**
 * המספר הזה ירד במכוון כשהיום ירד מ-$25 ל-$10: צריך עכשיו **ארבעה**
 * מנצלים כדי למצות יום, ולא שמונה. זו העלות המודעת של הורדת החשיפה
 * מ-$750 ל-$300 בחודש - והבלם האמיתי ממילא אינו הכסף אלא מכסת
 * ההודעות היומית ומגבלת הפרץ, שנתקלים בהן הרבה קודם.
 */
test('עדיין צריך כמה מנצלים כדי למצות את היום', () => {
  const perDay = DEFAULT_DAILY_BUDGET_USD / CALLER_CAP_USD;
  assert.ok(perDay >= 3, String(perDay));
});

/** הרצפה של המחוברים לא נפגעה מהעלאת חלקם של האנונימיים */
test('למחוברים נשארת רצפה אמיתית', () => {
  assert.ok(1 - ANON_SHARE >= 0.4, String(1 - ANON_SHARE));
});

/* ---------- IP כרשת ביטחון ולא כמכסה ---------- */

test('תקרת ה-IP רחבה בהרבה מתקרת אדם - בגלל CGNAT', async () => {
  resetBudgetForTest();
  const person = await budgetFor('anon:eeeeeeeeeeeeeeee');
  const ip = await budgetFor('ip:1.2.3.4');
  // הרשת נבדקת ב-route ככפולה; כאן מוודאים שהמכפיל אכן רחב
  assert.ok(IP_BACKSTOP_MULTIPLE >= 20, String(IP_BACKSTOP_MULTIPLE));
  assert.ok(ip.callerBudget * IP_BACKSTOP_MULTIPLE > person.callerBudget * 10);
});

test('מזהה דפדפן נחשב אנונימי בדיוק כמו IP', () => {
  assert.equal(isAnonIdentity('anon:ffffffffffffffff'), true);
  assert.equal(isAnonIdentity('ip:1.2.3.4'), true);
  assert.equal(isAnonIdentity('user:abc'), false);
});

/* ---------- מדידה שנכשלת סגור ---------- */

test('קריאה בלי output_tokens מוערכת ולא נספרת כחינם', () => {
  /*
    תשובה שנקטעה לפני message_delta - הטוקנים כבר חויבו. אפס כאן הוא
    בדיוק הדרך שבה הסכום היומי סוטה כלפי מטה.
  */
  const withText = measuredCost('claude-haiku-4-5', { input_tokens: 1000 }, 4000);
  const withoutText = measuredCost('claude-haiku-4-5', { input_tokens: 1000 }, 0);
  assert.ok(withText > withoutText, `${withText} > ${withoutText}`);
});

test('קריאה שלא דיווחה כלום מקבלת עלות שמרנית ולא אפס', () => {
  const c = measuredCost('claude-sonnet-4-5', {}, 0);
  assert.ok(c > 0, String(c));
});

test('דיווח מלא מחושב מהמספרים ולא מאומדן', () => {
  const c = measuredCost('claude-haiku-4-5', { input_tokens: 1_000_000, output_tokens: 0 }, 9999);
  assert.equal(c, 1);
});

/* ---------- ההתראות ---------- */

test('התראת מקור בודד יורה לפני החסימה ולא אחריה', () => {
  assert.ok(CALLER_ALERT_AT < 1, String(CALLER_ALERT_AT));
  assert.ok(CALLER_ALERT_AT >= 0.5, 'מוקדם מדי היה מתריע על שימוש רגיל');
});

test('התקרה נעולה כשהתקציב אפס', async () => {
  resetBudgetForTest();
  process.env.AI_DAILY_BUDGET_USD = '0';
  const s = await budgetFor('user:x');
  assert.equal(s.exceeded, true);
  assert.equal(s.reason, 'total');
  delete process.env.AI_DAILY_BUDGET_USD;
});
