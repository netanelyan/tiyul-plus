/**
 * Tests for trip dates.
 *
 * Two things here are not a "sanity check": the first is that a date stays
 * the same date in every timezone (the classic bug is
 * `new Date('2026-08-12')` being read as UTC and displayed as August 11 to
 * anyone browsing west of Greenwich), and the second is that range
 * completion **does not touch the trip's days** - picking a date does not
 * delete stops.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  completeRange,
  countdown,
  dayDate,
  formatHebrewDate,
  formatHebrewRange,
  isISODate,
  parseISODate,
  rangeDays,
  toISODate,
} from './dates.ts';

test('ולידציה: תאריך שלא קיים נדחה, לא "מתגלגל" לחודש הבא', () => {
  assert.ok(isISODate('2026-08-12'));
  assert.ok(isISODate('2028-02-29'), 'שנה מעוברת');
  for (const bad of ['2026-02-31', '2026-13-01', '2026-8-12', '12/08/2026', '', 'today', '2026-00-10'])
    assert.equal(isISODate(bad), false, bad);
});

test('התאריך לא זז עם אזור הזמן', () => {
  // UTC midnight of 2026-08-12 is August 11 in New York. If we used
  // new Date(string), the display there would be one day behind.
  const d = parseISODate('2026-08-12')!;
  assert.equal(d.getDate(), 12);
  assert.equal(d.getHours(), 12, 'צהריים מקומיים - שעון קיץ לא יכול לחצות יום');
  assert.equal(toISODate(d), '2026-08-12');
});

test('חיבור ימים חוצה חודש, שנה ומעבר שעון קיץ', () => {
  assert.equal(addDays('2026-08-30', 3), '2026-09-02');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  // Late March is the daylight-saving switch in Israel and Europe
  assert.equal(addDays('2026-03-27', 1), '2026-03-28');
  assert.equal(addDays('2026-10-24', 1), '2026-10-25');
});

test('אורך הטווח כולל את שני הקצוות', () => {
  assert.equal(rangeDays('2026-08-12', '2026-08-12'), 1);
  assert.equal(rangeDays('2026-08-12', '2026-08-18'), 7);
  assert.equal(rangeDays('2026-08-18', '2026-08-12'), null, 'סוף לפני התחלה');
  assert.equal(rangeDays('2026-08-12', undefined), null);
});

test('תאריך של יום N נגזר מתאריך היציאה', () => {
  const trip = { startDate: '2026-08-12' };
  assert.equal(dayDate(trip, 0), '2026-08-12');
  assert.equal(dayDate(trip, 2), '2026-08-14');
  assert.equal(dayDate({}, 0), null);
});

test('תצוגה בעברית - עצמאית מ-ICU', () => {
  assert.equal(formatHebrewDate('2026-08-12'), '12 באוגוסט');
  assert.equal(formatHebrewDate('2026-08-12', { weekday: true }), 'רביעי, 12 באוגוסט');
  assert.equal(formatHebrewDate('2026-08-12', { year: true }), '12 באוגוסט 2026');
  assert.equal(formatHebrewDate('nope'), '');
});

test('טווח: אותו חודש מקצר, חציית חודש ושנה לא', () => {
  assert.equal(formatHebrewRange('2026-08-12', '2026-08-18'), '12-18 באוגוסט');
  assert.equal(formatHebrewRange('2026-08-28', '2026-09-03'), '28 באוגוסט - 3 בספטמבר');
  assert.equal(formatHebrewRange('2026-12-28', '2027-01-03'), '28 בדצמבר 2026 - 3 בינואר 2027');
  assert.equal(formatHebrewRange('2026-08-12', '2026-08-12'), '12 באוגוסט');
  assert.equal(formatHebrewRange(undefined, '2026-08-12'), '');
});

test('ספירה לאחור בכל ארבעת המצבים', () => {
  const s = '2026-08-12';
  const e = '2026-08-18';
  assert.deepEqual(countdown('2026-07-29', s, e), {
    kind: 'future',
    days: 14,
    label: 'עוד 14 ימים לטיול',
  });
  assert.equal(countdown('2026-08-11', s, e)?.label, 'יוצאים מחר');
  assert.equal(countdown('2026-08-12', s, e)?.label, 'יוצאים היום');
  assert.equal(countdown('2026-08-15', s, e)?.label, 'יום 4 בטיול');
  assert.equal(countdown('2026-08-19', s, e)?.label, 'הטיול הסתיים');
  assert.equal(countdown('2026-07-29', undefined, undefined), null);
});

test('השלמת טווח: קצה אחד משלים את השני לפי אורך הטיול', () => {
  assert.deepEqual(completeRange(5, '2026-08-12', undefined), {
    startDate: '2026-08-12',
    endDate: '2026-08-16',
  });
  assert.deepEqual(completeRange(5, undefined, '2026-08-16'), {
    startDate: '2026-08-12',
    endDate: '2026-08-16',
  });
  // A reversed range - fix the end rather than store an impossible state
  assert.deepEqual(completeRange(3, '2026-08-12', '2026-08-01'), {
    startDate: '2026-08-12',
    endDate: '2026-08-14',
  });
  // A valid range that does not match the trip length **is kept as is**:
  // the mismatch is shown to the user and they decide. Silent completion
  // here would change their plan for them.
  assert.deepEqual(completeRange(3, '2026-08-12', '2026-08-20'), {
    startDate: '2026-08-12',
    endDate: '2026-08-20',
  });
  // With no endpoint at all - both fields come back as **explicit**
  // undefined, because the caller does `{...trip, ...completeRange(...)}`
  // and this is the form that clears an existing date instead of leaving it
  // hanging in the air.
  assert.deepEqual(completeRange(4), { startDate: undefined, endDate: undefined });
});
