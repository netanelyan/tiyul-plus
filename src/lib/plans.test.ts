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
import { effectivePlan, roleAtLeast, isRole, ROLE_RANK } from './plans.ts';

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
