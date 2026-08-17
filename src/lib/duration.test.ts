import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysHe, formatDurationHe } from './duration.ts';

test('formatDurationHe: the two forms the old expression got wrong', () => {
  // 60 and 45 are the most common durations in the catalog (248 places), and both displayed the
  // broken singular form before the fix. This is the check that the bug does not come back.
  assert.equal(formatDurationHe(60), 'כשעה');
  assert.equal(formatDurationHe(45), 'כשעה');
  assert.equal(formatDurationHe(30), 'כחצי שעה');
  assert.equal(formatDurationHe(20), 'כחצי שעה');
});

test('formatDurationHe: dual form for two hours', () => {
  assert.equal(formatDurationHe(120), 'כשעתיים');
  assert.equal(formatDurationHe(150), 'כשעתיים וחצי');
  assert.equal(formatDurationHe(90), 'כשעה וחצי');
});

test('formatDurationHe: numeric form from three hours up', () => {
  assert.equal(formatDurationHe(180), 'כ-3 שעות');
  assert.equal(formatDurationHe(240), 'כ-4 שעות');
  assert.equal(formatDurationHe(270), 'כ-4.5 שעות');
  assert.equal(formatDurationHe(300), 'כ-5 שעות');
});

test('formatDurationHe: nothing to show returns null, never a stray label', () => {
  assert.equal(formatDurationHe(0), null);
  assert.equal(formatDurationHe(undefined), null);
  assert.equal(formatDurationHe(null), null);
  assert.equal(formatDurationHe(NaN), null);
  // Under a quarter of an hour rounds to zero - better to show nothing than "about 0 hours"
  assert.equal(formatDurationHe(5), null);
});

test('formatDurationHe: no output ever contains the broken singular', () => {
  for (let m = 1; m <= 600; m += 1) {
    const s = formatDurationHe(m);
    if (s === null) continue;
    assert.ok(!/^כ-1 שעות$/.test(s), `${m} -> ${s}`);
    assert.ok(!/כ-0(\.5)? שעות/.test(s), `${m} -> ${s}`);
  }
});

test('אורך טיול בעברית: יחיד, זוגי ורבים', () => {
  assert.equal(daysHe(1), 'יום אחד');
  assert.equal(daysHe(2), 'יומיים');
  assert.equal(daysHe(3), '3 ימים');
  assert.equal(daysHe(14), '14 ימים');
  // No output returns to the broken form
  for (let n = 1; n <= 60; n++) assert.ok(!/^[12] ימים$/.test(daysHe(n)), String(n));
  assert.equal(daysHe(0), 'בלי ימים');
  assert.equal(daysHe(NaN), 'בלי ימים');
});
