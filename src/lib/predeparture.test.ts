/**
 * זכאות ההצעה - **מתי בכלל שווה להציע את הבדיקה**. כל הטענות כאן על
 * תאריך אמיתי שנמסר מבחוץ (`todayISO`), בלי `Date.now()` בפנים.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOfferEligibility, OFFER_WINDOW_DAYS, PRICE_ILS, priceLabel } from './predeparture.ts';

const TODAY = '2026-08-12';

test('בלי תאריכים - לא זכאי, בלי לזרוק', () => {
  const r = checkOfferEligibility({}, TODAY);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'no-dates');
});

test('רחוק מדי מהיציאה - לא זכאי', () => {
  const r = checkOfferEligibility({ startDate: '2026-12-01' }, TODAY);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'too-early');
});

test('בדיוק בגבול החלון - זכאי', () => {
  const d = new Date(2026, 7, 12);
  d.setDate(d.getDate() + OFFER_WINDOW_DAYS);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(checkOfferEligibility({ startDate: iso }, TODAY).eligible, true);
});

test('יום אחד מעבר לחלון - לא זכאי', () => {
  const d = new Date(2026, 7, 12);
  d.setDate(d.getDate() + OFFER_WINDOW_DAYS + 1);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(checkOfferEligibility({ startDate: iso }, TODAY).eligible, false);
});

test('יוצאים היום - זכאי', () => {
  assert.equal(checkOfferEligibility({ startDate: TODAY }, TODAY).eligible, true);
});

test('באמצע הטיול - לא זכאי (כבר בדרך)', () => {
  const r = checkOfferEligibility({ startDate: '2026-08-10', endDate: '2026-08-20' }, TODAY);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'in-progress-or-past');
});

test('הטיול הסתיים - לא זכאי', () => {
  const r = checkOfferEligibility({ startDate: '2026-07-01', endDate: '2026-07-10' }, TODAY);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, 'in-progress-or-past');
});

test('תאריך פגום - לא זכאי, לא נופל', () => {
  assert.equal(checkOfferEligibility({ startDate: 'not-a-date' }, TODAY).eligible, false);
});

test('המחיר קבוע ובעל שתי ספרות עשרוניות בתצוגה', () => {
  assert.equal(PRICE_ILS, 29.9);
  assert.equal(priceLabel(), '29.90 ₪');
});
