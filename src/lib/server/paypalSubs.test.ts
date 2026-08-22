/**
 * The subscription `custom_id` round trip.
 *
 * Why this specific function has a test and the rest of the file does not: it
 * is the single point where a **live, already-paying subscriber** can be broken
 * by a code change. Every subscription created before the pro plan existed
 * carries a bare uuid as its custom_id, and PayPal echoes that same string back
 * on every renewal, cancellation and suspension event for the rest of that
 * subscription's life. If this parser ever stops recognising a bare uuid, those
 * people silently stop being activated and stop being downgraded - and nothing
 * anywhere throws.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSubscriptionCustomId } from './paypalSubs.ts';

const UUID = '3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

test('מזהה ישן (uuid בלבד) נקרא כפרימיום - מנויים קיימים לא נשברים', () => {
  assert.deepEqual(parseSubscriptionCustomId(UUID), { userId: UUID, plan: 'premium' });
});

test('מזהה של פרו נושא את התוכנית באותה מחרוזת חתומה', () => {
  assert.deepEqual(parseSubscriptionCustomId(`${UUID}|pro`), { userId: UUID, plan: 'pro' });
});

test('סיומת לא מוכרת יורדת לפרימיום, לא לתוכנית שהיא טוענת לה', () => {
  /*
    The string arrives through a signature-verified webhook, so it should always
    be one we wrote. If it somehow is not, the safe direction is the cheaper
    plan - an unrecognised suffix must never be able to grant the expensive one.
  */
  for (const suffix of ['enterprise', 'PRO', 'owner', '']) {
    assert.equal(parseSubscriptionCustomId(`${UUID}|${suffix}`)?.plan, 'premium', suffix);
  }
});

test('custom_id שאינו uuid נדחה לגמרי - אין ממי להפעיל מנוי', () => {
  for (const bad of ['', 'not-a-uuid', '|pro', 'abc|pro', `${UUID}x`]) {
    assert.equal(parseSubscriptionCustomId(bad), null, bad);
  }
});
