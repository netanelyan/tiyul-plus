import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLimit, dayKey, resetLimitsForTest } from './limits';
import {
  PLAN_LIMITS,
  PROMO_ATTEMPTS_PER_DAY,
  PROMO_ATTEMPTS_PER_HOUR,
} from '../plans';

test('חלון קבוע: עד max, ואז חסום - וגם בקשה חסומה נספרת', () => {
  resetLimitsForTest();
  for (let i = 0; i < 3; i++) assert.ok(checkLimit('b', 'x', 3, 60_000).ok, `בקשה ${i + 1}`);
  assert.equal(checkLimit('b', 'x', 3, 60_000).ok, false);
  // Stays blocked - a flooder who clicks again gains nothing
  assert.equal(checkLimit('b', 'x', 3, 60_000).ok, false);
});

test('זהויות שונות ודליים שונים לא מפריעים אחד לשני', () => {
  resetLimitsForTest();
  assert.ok(checkLimit('b', 'a', 1, 60_000).ok);
  assert.equal(checkLimit('b', 'a', 1, 60_000).ok, false);
  assert.ok(checkLimit('b', 'b', 1, 60_000).ok, 'משתמש אחר');
  assert.ok(checkLimit('other', 'a', 1, 60_000).ok, 'דלי אחר');
});

test('retryAfterSec הוא זמן אמיתי ולא אפס', () => {
  resetLimitsForTest();
  const r = checkLimit('b', 'x', 1, 60_000);
  assert.ok(r.retryAfterSec > 0 && r.retryAfterSec <= 60);
});

test('החלון מתאפס כשעובר זמנו', () => {
  resetLimitsForTest();
  assert.ok(checkLimit('b', 'x', 1, 1).ok);
  assert.equal(checkLimit('b', 'x', 1, 1).ok, false);
  const until = Date.now() + 5;
  while (Date.now() < until) {
    /* a short wait so the 1ms window expires */
  }
  assert.ok(checkLimit('b', 'x', 1, 1).ok, 'חלון חדש');
});

test('פדיון קוד: חמישה ניסיונות בשעה, ואז חסום', () => {
  resetLimitsForTest();
  for (let i = 0; i < PROMO_ATTEMPTS_PER_HOUR; i++)
    assert.ok(checkLimit('promo-hour', 'u', PROMO_ATTEMPTS_PER_HOUR, 3_600_000).ok);
  assert.equal(checkLimit('promo-hour', 'u', PROMO_ATTEMPTS_PER_HOUR, 3_600_000).ok, false);
});

test('מכסת פדיון הקוד אינה תלויה בתוכנית - פרימיום לא קונה זכות לנחש', () => {
  // There is no such field in PlanLimits, and that is deliberate. The test documents the decision.
  assert.equal('promoAttemptsPerHour' in PLAN_LIMITS.premium, false);
  assert.ok(PROMO_ATTEMPTS_PER_DAY > PROMO_ATTEMPTS_PER_HOUR);
});

test('המכסות של השירותים החיצוניים קיימות ופרימיום גדול מחופשי', () => {
  for (const k of ['exploresPerDay', 'geocodesPerDay'] as const) {
    assert.ok(PLAN_LIMITS.free[k] > 0, k);
    assert.ok(PLAN_LIMITS.premium[k] > PLAN_LIMITS.free[k], k);
  }
});

test('מפתח היום הוא UTC בפורמט YYYY-MM-DD', () => {
  assert.match(dayKey(new Date('2026-07-28T23:30:00Z')), /^2026-07-28$/);
});
