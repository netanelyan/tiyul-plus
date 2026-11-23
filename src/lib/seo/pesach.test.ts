import test from 'node:test';
import assert from 'node:assert/strict';
import { heDateRange, heDayMonth, upcomingPesach } from './pesach';

test('in November 2026 the coming Passover is 2027, with the ministry break', () => {
  const p = upcomingPesach('2026-11-23');
  assert.ok(p);
  assert.equal(p.year, 2027);
  assert.equal(p.seder, '2027-04-21');
  assert.equal(p.firstDay, '2027-04-22');
  assert.equal(p.seventhDay, '2027-04-28');
  assert.equal(p.secondDayAbroad, '2027-04-23');
  assert.equal(p.lastDayAbroad, '2027-04-29');
  assert.deepEqual(
    p.schoolBreak && [p.schoolBreak.from, p.schoolBreak.to, p.schoolBreak.back],
    ['2027-04-13', '2027-04-28', '2027-04-29'],
  );
});

test('during the festival it is still this year, the day after it rolls over', () => {
  assert.equal(upcomingPesach('2027-04-25')?.year, 2027);
  assert.equal(upcomingPesach('2027-04-28')?.year, 2027);
  const next = upcomingPesach('2027-04-29');
  assert.equal(next?.year, 2028);
  assert.equal(next && Date.parse(next.firstDay) - Date.parse(next.seder), 86_400_000);
});

test('a year the ministry has not published shows no break rather than a guess', () => {
  assert.equal(upcomingPesach('2027-05-01')?.schoolBreak, null);
});

test('the date labels read as Hebrew', () => {
  assert.equal(heDayMonth('2027-04-21'), '21 באפריל');
  assert.equal(heDateRange('2027-04-13', '2027-04-28'), '13-28 באפריל');
  assert.equal(heDateRange('2027-03-30', '2027-04-14'), '30 במרץ עד 14 באפריל');
});
