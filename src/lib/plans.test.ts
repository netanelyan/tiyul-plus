/**
 * טסטים ל-`effectivePlan` ולדירוג התפקידים.
 *
 * למה דווקא כאן: אלה שתי הפונקציות שבאג בהן הוא **הרשאה שניתנה בטעות**,
 * לא תקלה בתצוגה. `effectivePlan` שגוי אומר שהענקה ל-30 יום נשארת
 * לנצח - וזה בדיוק סוג הבאג שאף אחד לא מדווח עליו, כי הוא נראה כמו
 * נדיבות. `roleAtLeast` שגוי אומר שמשתמש רגיל נכנס לאזור הניהול.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_FEATURE_ROWS,
  PLAN_LIMITS,
  PREMIUM_TRIP_BUILDS_PER_MONTH,
  ROLE_RANK,
  SUBSCRIBER_MONTHLY_CAP_USD,
  effectivePlan,
  isRole,
  periodMsFor,
  roleAtLeast,
} from './plans.ts';
import { BUDGET_MESSAGE, PREMIUM_BUDGET_MESSAGE } from './server/chatGuards.ts';

const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
const iso = (offsetDays: number) => new Date(NOW + offsetDays * 86_400_000).toISOString();

test('חינם נשאר חינם', () => {
  assert.equal(effectivePlan({ plan: 'free' }, NOW), 'free');
  assert.equal(effectivePlan(null, NOW), 'free');
  assert.equal(effectivePlan(undefined, NOW), 'free');
  assert.equal(effectivePlan({}, NOW), 'free');
});

test('פרימיום בלי תאריך = ללא הגבלה (מנוי Stripe פעיל)', () => {
  assert.equal(effectivePlan({ plan: 'premium', plan_until: null }, NOW), 'premium');
  assert.equal(effectivePlan({ plan: 'premium' }, NOW), 'premium');
});

test('הענקה בתוקף = פרימיום', () => {
  assert.equal(effectivePlan({ plan: 'premium', plan_until: iso(1) }, NOW), 'premium');
});

test('הענקה שפגה = חינם. זה כל הטעם של הפונקציה', () => {
  assert.equal(effectivePlan({ plan: 'premium', plan_until: iso(-1) }, NOW), 'free');
});

test('פקיעה היא רגע, לא יום: שנייה אחרי - חינם', () => {
  const exact = new Date(NOW).toISOString();
  assert.equal(effectivePlan({ plan: 'premium', plan_until: exact }, NOW), 'free');
  assert.equal(effectivePlan({ plan: 'premium', plan_until: exact }, NOW - 1000), 'premium');
});

test('תאריך פגום לא שולל מנוי שכבר שולם', () => {
  // ההטיה כאן מכוונת: עמודה מקולקלת היא באג שלנו, ולא סיבה להוריד
  // פרימיום ממי ששילם עליו. מתקנים את הדאטה, לא מענישים את המשתמש.
  assert.equal(effectivePlan({ plan: 'premium', plan_until: 'לא-תאריך' }, NOW), 'premium');
});

test('plan אחר לגמרי (דאטה לא צפויה) נחשב חינם', () => {
  assert.equal(effectivePlan({ plan: 'PREMIUM', plan_until: null }, NOW), 'free');
  assert.equal(effectivePlan({ plan: 'owner' }, NOW), 'free');
});

test('דירוג התפקידים: כל שער מחייב את התפקיד שלו ומעלה', () => {
  assert.equal(roleAtLeast('owner', 'admin'), true);
  assert.equal(roleAtLeast('owner', 'owner'), true);
  assert.equal(roleAtLeast('admin', 'admin'), true);
  assert.equal(roleAtLeast('admin', 'owner'), false, 'אדמין אינו בעלים');
  assert.equal(roleAtLeast('user', 'admin'), false, 'משתמש רגיל אינו אדמין');
  assert.equal(roleAtLeast('user', 'user'), true);
});

test('הדירוג סידורי ועולה - שער שנוסף בעתיד לא יישבר בשקט', () => {
  assert.ok(ROLE_RANK.user < ROLE_RANK.admin);
  assert.ok(ROLE_RANK.admin < ROLE_RANK.owner);
});

test('isRole דוחה כל מה שאינו אחד משלושת התפקידים', () => {
  for (const good of ['user', 'admin', 'owner']) assert.equal(isRole(good), true);
  for (const bad of ['Owner', 'ADMIN', 'superuser', '', null, undefined, 0, 1, {}, ['admin']]) {
    assert.equal(isRole(bad), false, `${JSON.stringify(bad)} אינו תפקיד`);
  }
});

/* ============================================================
   שני חוקים של נתנאל על המכסות הנראות, נעולים כטסטים
   ============================================================

   1. **"אם מישהו נחסם על ידי תקרת הדולרים בזמן שהעמוד אמר לו שנשארו
      לו טיולים - זו הבטחה שבורה והחזר כספי."** כלומר: העלות של כל
      המכסות הנראות ביחד, במחירים הגרועים-המציאותיים שנמדדו, חייבת
      להיכנס מתחת לתקרת הדולרים הפנימית - עם מרווח. מי שמעלה מספר
      מוצג חייב להפיל את הטסט הזה קודם, ואז לחשב מחדש.

   2. **"אסור שדולר יופיע בשום מקום שמשתמש רואה - רק ספירות."** שקלים
      של מחיר מוצר מותרים (מחיר הוא לא תקרת עלות); דולרים לא.
*/

/*
  המחירים שנמדדו (31.7, ומדידת ה-tt): אלה ה**עובדות** שהחשבון נשען
  עליהן. אם מדידה חדשה תזיז אותם - לעדכן כאן ולתת לטסט להגיד אם
  המכסות עדיין נכנסות.
*/
const COLD_TRIP_USD = 0.53; // בניית טיול מלאה, כולל כתיבת מטמון קרה
const HEAVY_TURN_USD = 0.063; // תור Sonnet ממטמון חם
const WIZARD_BUILD_USD = 0.02; // בנייה מהירה ב-Haiku (נמדד ~$0.01, שמרני כפול)
const LOOKUP_USD = 0.01; // חיפוש אינטרנט חי (מחיר Anthropic קבוע)
const IMAGE_EXTRA_USD = 0.01; // תוספת של תמונה מעל תור רגיל

test('העלות הגרועה-המציאותית של כל המכסות הנראות של פרימיום נכנסת מתחת לתקרה - עם מרווח', () => {
  const p = PLAN_LIMITS.premium;
  /*
    הבניות המלאות נספרות בתוך מכסת השיחות (בנייה היא שיחה), ולכן
    השיחות שאינן-בנייה הן ההפרש. זה בדיוק איך שהשער בפועל עובד
    ב-chat/route.ts.
  */
  const editTurns = p.chatPerDay - PREMIUM_TRIP_BUILDS_PER_MONTH;
  const worst =
    PREMIUM_TRIP_BUILDS_PER_MONTH * COLD_TRIP_USD +
    editTurns * HEAVY_TURN_USD +
    p.generatePerDay * WIZARD_BUILD_USD +
    p.lookupsPerDay * LOOKUP_USD +
    p.imagesPerDay * IMAGE_EXTRA_USD;

  /*
    ‎90%‎ מהתקרה הוא הקו: המרווח הנותר סופג קריאה קרה תועה אחת-חלקית
    (מקרה שהמחמם שלנו אמור למנוע) וסטיות תמחור. מעבר למכסות הנראות
    אין מסלול מציאותי אל התקרה - רק ניצול מכוון של לולאות כלים, שחסום
    ממילא ב-MAX_TURN_USD לתור, וזה בדיוק סוג השימוש שהתקרה קיימת בשבילו.
  */
  assert.ok(
    worst <= SUBSCRIBER_MONTHLY_CAP_USD * 0.9,
    `worst=$${worst.toFixed(3)} מול תקרה $${SUBSCRIBER_MONTHLY_CAP_USD} - המכסות הנראות גדולות מדי, ` +
      'המשתמש עלול להיחסם על ידי תקרת הדולרים לפני שהמכסה המוצגת נגמרת',
  );
});

test('הבניות המלאות לא יכולות לעלות לבדן על התקרה, גם אם כל השאר אפס', () => {
  assert.ok(PREMIUM_TRIP_BUILDS_PER_MONTH * COLD_TRIP_USD < SUBSCRIBER_MONTHLY_CAP_USD);
});

test('אף דולר בשורות ההשוואה של עמוד הפרימיום - רק ספירות ושקלים', () => {
  for (const row of PLAN_FEATURE_ROWS) {
    for (const text of [row.label, row.free, row.premium]) {
      assert.ok(!text.includes('$'), `דולר בשורת השוואה: "${text}"`);
      assert.ok(!/USD|דולר/i.test(text), `אזכור דולר בשורת השוואה: "${text}"`);
    }
  }
});

test('אף דולר בהודעות החסימה שהמשתמש רואה', () => {
  for (const msg of [BUDGET_MESSAGE, PREMIUM_BUDGET_MESSAGE]) {
    assert.ok(!msg.includes('$'), `דולר בהודעת משתמש: "${msg.slice(0, 60)}..."`);
    assert.ok(!/דולר/.test(msg), `אזכור דולר בהודעת משתמש`);
  }
});

test('חלון המכסה: יממה לאנונימי/חינם, 30 יום לפרימיום', () => {
  const DAY = 24 * 60 * 60 * 1000;
  assert.equal(periodMsFor('anon'), DAY);
  assert.equal(periodMsFor('free'), DAY);
  assert.equal(periodMsFor('premium'), 30 * DAY);
});
