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
  /*
    The window is 50ms rather than 1ms, and that is the fix for a flake that
    failed about one run in three.

    `checkLimit` reads `Date.now()` itself, so the only lever here is the window
    length. At 1ms the FIRST two calls were the race: the first sets resetAt to
    now+1, and a single clock tick before the second means the window has already
    expired, so the call that is supposed to be blocked succeeds. Two adjacent
    calls cannot span 50ms, and the busy-wait below then clears it with margin.
  */
  const WINDOW_MS = 50;
  resetLimitsForTest();
  assert.ok(checkLimit('b', 'x', 1, WINDOW_MS).ok);
  assert.equal(checkLimit('b', 'x', 1, WINDOW_MS).ok, false, 'השני בתוך החלון חייב להיחסם');
  const until = Date.now() + WINDOW_MS + 20;
  while (Date.now() < until) {
    /* wait out the window */
  }
  assert.ok(checkLimit('b', 'x', 1, WINDOW_MS).ok, 'חלון חדש');
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
