/**
 * The date poll's arithmetic.
 *
 * The claim being locked down is that **silence is never counted as agreement**.
 * An organiser reads this summary and books flights on it, so a day where three
 * people said yes and two never answered must not present itself as a day that
 * works for everyone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestDays, tallyDates } from './dateOverlap.ts';

const MEMBERS = ['a', 'b', 'c'];

test('tallyDates: מי שלא ענה נספר כ-pending ולא כהסכמה', () => {
  const [d] = tallyDates(
    ['2026-09-12'],
    MEMBERS,
    [{ member_id: 'a', day: '2026-09-12', ok: true }],
  );
  assert.equal(d.yes, 1);
  assert.equal(d.no, 0);
  assert.equal(d.pending, 2, 'b and c never answered');
  assert.equal(d.everyone, false, 'one yes out of three is not everyone');
});

test('tallyDates: everyone רק כשכולם ענו כן בפועל', () => {
  const votes = MEMBERS.map((m) => ({ member_id: m, day: '2026-09-12', ok: true }));
  const [d] = tallyDates(['2026-09-12'], MEMBERS, votes);
  assert.equal(d.yes, 3);
  assert.equal(d.pending, 0);
  assert.equal(d.everyone, true);
});

test('tallyDates: מי שאמר לא מופיע ברשימת החוסמים', () => {
  const [d] = tallyDates(['2026-09-12'], MEMBERS, [
    { member_id: 'a', day: '2026-09-12', ok: true },
    { member_id: 'b', day: '2026-09-12', ok: false },
    { member_id: 'c', day: '2026-09-12', ok: true },
  ]);
  assert.equal(d.yes, 2);
  assert.equal(d.no, 1);
  assert.equal(d.pending, 0);
  assert.equal(d.everyone, false);
  assert.deepEqual(d.blockers, ['b'], 'named, so the organiser can ask rather than guess');
});

test('tallyDates: הצבעה של מי שאינו חבר בקבוצה לא נספרת', () => {
  const [d] = tallyDates(['2026-09-12'], MEMBERS, [
    { member_id: 'a', day: '2026-09-12', ok: true },
    { member_id: 'stranger', day: '2026-09-12', ok: true },
  ]);
  assert.equal(d.yes, 1);
  assert.equal(d.pending, 2);
});

test('tallyDates: הצבעה על יום שלא הוצע לא ממציאה שורה', () => {
  const days = tallyDates(['2026-09-12'], MEMBERS, [
    { member_id: 'a', day: '2026-12-31', ok: true },
  ]);
  assert.equal(days.length, 1);
  assert.equal(days[0].day, '2026-09-12');
  assert.equal(days[0].yes, 0);
});

test('tallyDates: הימים מוחזרים ממוינים, לא לפי סדר הקלט', () => {
  const days = tallyDates(['2026-09-14', '2026-09-12', '2026-09-13'], MEMBERS, []);
  assert.deepEqual(days.map((d) => d.day), ['2026-09-12', '2026-09-13', '2026-09-14']);
});

test('tallyDates: בלי חברים בכלל - everyone הוא false ולא true ריק', () => {
  const [d] = tallyDates(['2026-09-12'], [], []);
  assert.equal(d.everyone, false, 'an empty group must not read as unanimous');
  assert.equal(d.pending, 0);
});

test('bestDays: יום שכולם יכולים מנצח יום שאיש לא ענה עליו', () => {
  const tallies = tallyDates(['2026-09-12', '2026-09-13'], MEMBERS, [
    ...MEMBERS.map((m) => ({ member_id: m, day: '2026-09-13', ok: true })),
    { member_id: 'a', day: '2026-09-12', ok: true },
  ]);
  const best = bestDays(tallies);
  assert.equal(best[0].day, '2026-09-13');
  assert.equal(best[0].everyone, true);
});

test('bestDays: שוויון ב-yes נשבר לפי פחות התנגדויות', () => {
  const tallies = tallyDates(['2026-09-12', '2026-09-13'], MEMBERS, [
    { member_id: 'a', day: '2026-09-12', ok: true },
    { member_id: 'b', day: '2026-09-12', ok: false },
    { member_id: 'a', day: '2026-09-13', ok: true },
  ]);
  const best = bestDays(tallies);
  assert.equal(best[0].day, '2026-09-13', 'same yes count, but nobody objected');
});

test('bestDays: יום שאף אחד לא יכול לא מוצע בכלל', () => {
  const tallies = tallyDates(['2026-09-12'], MEMBERS, [
    { member_id: 'a', day: '2026-09-12', ok: false },
  ]);
  assert.equal(bestDays(tallies).length, 0);
});
