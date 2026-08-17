/**
 * Dates end to end: the agent's tool, and the share link.
 *
 * Two things are checked here rather than by eye. The first is that the tool **does not touch
 * the days**: the great temptation of a "date range" is to derive the day count from it, and
 * that deletes days that have stops. The second is that an old link (v1) still opens after the
 * format moved to v2 - a code shared on WhatsApp months ago has to keep working.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeAgentTool, serializeTripForModel } from './agent.ts';
import { encodeTripShare } from './share.ts';
import { decodeTripShare } from '../server/shareDecode.ts';
import type { Trip } from './types.ts';

const trip = (): Trip => ({
  id: 't1',
  name: 'רומא',
  citySlugs: ['rome'],
  createdAt: 1,
  days: [
    { id: 'd1', citySlug: 'rome', placeIds: ['rom-colosseum', 'rom-forum'] },
    { id: 'd2', citySlug: 'rome', placeIds: ['rom-trevi'] },
    { id: 'd3', citySlug: 'rome', placeIds: [] },
  ],
});

const run = (t: Trip, input: Record<string, unknown>) =>
  executeAgentTool(t, 'set_trip_dates', input);

test('תאריך יציאה בלבד - הסוף מושלם לפי אורך הטיול', () => {
  const res = run(trip(), { startDate: '2026-08-12' });
  assert.equal(res.ok, true);
  assert.equal(res.trip?.startDate, '2026-08-12');
  assert.equal(res.trip?.endDate, '2026-08-14', '3 ימים בטיול → 12+2');
  assert.match(res.action ?? '', /12-14 באוגוסט/);
});

test('טווח מלא נשמר כפי שנמסר', () => {
  const res = run(trip(), { startDate: '2026-08-12', endDate: '2026-08-14' });
  assert.equal(res.trip?.endDate, '2026-08-14');
  assert.ok(!/שים לב/.test(res.message ?? ''), 'אין פער - אין הערה');
});

test('**הימים לא משתנים** גם כשהטווח ארוך או קצר מהתוכנית', () => {
  const long = run(trip(), { startDate: '2026-08-12', endDate: '2026-08-20' });
  assert.equal(long.trip?.days.length, 3, 'טווח של 9 ימים לא הוסיף ימים');
  assert.match(long.message ?? '', /אל תוסיף בעצמך/);

  const short = run(trip(), { startDate: '2026-08-12', endDate: '2026-08-13' });
  assert.equal(short.trip?.days.length, 3, 'טווח של יומיים לא מחק את היום השלישי');
  assert.deepEqual(short.trip?.days[0].placeIds, ['rom-colosseum', 'rom-forum'], 'ולא עצירות');
  assert.match(short.message ?? '', /אל תמחק ימים בעצמך/);
});

test('תאריך לא תקין נדחה במקום להישמר', () => {
  for (const bad of ['12/08/2026', '2026-02-31', 'בקרוב', '', '2026-8-12']) {
    const res = run(trip(), { startDate: bad });
    assert.equal(res.ok, false, bad);
    assert.equal(res.trip?.startDate, undefined, bad);
  }
  // End before start
  const back = run(trip(), { startDate: '2026-08-12', endDate: '2026-08-01' });
  assert.equal(back.ok, false);
});

test('המודל מקבל את התאריך של כל יום כעובדה, לא כתרגיל חשבון', () => {
  const withDates = { ...trip(), startDate: '2026-08-12', endDate: '2026-08-14' };
  const seen = JSON.parse(serializeTripForModel(withDates));
  assert.equal(seen.startDate, '2026-08-12');
  assert.deepEqual(
    seen.days.map((d: { date: string }) => d.date),
    ['2026-08-12', '2026-08-13', '2026-08-14'],
  );
  // With no dates - the fields are simply absent, rather than null for the model to interpret
  const bare = JSON.parse(serializeTripForModel(trip()));
  assert.equal('startDate' in bare, false);
  assert.equal('date' in bare.days[0], false);
});

test('קישור שיתוף נושא את התאריכים הלוך ושוב', () => {
  const t = { ...trip(), startDate: '2026-08-12', endDate: '2026-08-14' };
  const decoded = decodeTripShare(encodeTripShare(t));
  assert.equal(decoded?.startDate, '2026-08-12');
  assert.equal(decoded?.endDate, '2026-08-14');
  assert.equal(decoded?.days.length, 3);
});

test('קישור v1 ישן ממשיך להיפתח - רק בלי תאריכים', () => {
  // Exactly the format that was sent before dates existed
  const legacy = Buffer.from(
    JSON.stringify([1, 'רומא', [['rome', ['rom-colosseum']]]]),
    'utf8',
  )
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const decoded = decodeTripShare(legacy);
  assert.equal(decoded?.name, 'רומא');
  assert.equal(decoded?.days.length, 1);
  assert.equal(decoded?.startDate, undefined);
});

test('טיול בלי תאריכים עדיין מקודד כ-v1 - הקישור לא מתארך סתם', () => {
  const code = encodeTripShare(trip());
  const json = Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  assert.equal(JSON.parse(json)[0], 1);
  assert.equal(JSON.parse(encodeTripShareJson({ ...trip(), startDate: '2026-08-12' }))[0], 2);
});

function encodeTripShareJson(t: Trip): string {
  const code = encodeTripShare(t);
  return Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

test('תאריך פגום שמגיע בקישור לא מגיע למסך', () => {
  const bad = Buffer.from(
    JSON.stringify([2, 'רומא', [['rome', ['rom-colosseum']]], 'מחר', '2026-13-40']),
    'utf8',
  )
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const decoded = decodeTripShare(bad);
  assert.equal(decoded?.days.length, 1, 'הטיול עצמו עדיין נפתח');
  assert.equal(decoded?.startDate, undefined);
  assert.equal(decoded?.endDate, undefined);
});
