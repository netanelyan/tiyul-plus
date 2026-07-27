/**
 * טסטים ל-set_day_city ו-move_day - שני הכלים שאִפשרו בכלל לשנות מבנה
 * של טיול קיים.
 *
 * הרקע: מטייל הזמין מלון בברטיסלבה וביקש שימים 1-2 יהיו שם במקום בהרי
 * הטטרה. ימים מקובעים לעיר, `set_day_places` דוחה כל מקום שאינו בעיר של
 * אותו יום, ולא היה שום כלי שמזיז יום או מחליף לו עיר - כך שהמסלול
 * החוקי היחיד היה `create_trip_full`, שמוחק את הטיול ובונה מחדש. הסוכן
 * אמר "המערכת לא מאפשרת לי" וזה היה מדויק; הדבר היחיד שהוא כן היה יכול
 * לעשות הוא לעדכן הערות, ולכן זה מה שהוא עשה.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeAgentTool } from './agent.ts';
import type { Trip } from './types.ts';

const trip = (): Trip => ({
  id: 't1',
  name: 'סלובקיה ווינה',
  citySlugs: ['high-tatras', 'vienna'],
  createdAt: 0,
  days: [
    { id: 'd1', citySlug: 'high-tatras', placeIds: ['tat-strbske', 'tat-popradske'] },
    { id: 'd2', citySlug: 'high-tatras', placeIds: ['tat-lomnicky'] },
    { id: 'd3', citySlug: 'vienna', placeIds: ['vie-schonbrunn'] },
  ],
});

const run = (t: Trip | null, name: string, input: Record<string, unknown>) =>
  executeAgentTool(t, name, input);

test('set_day_city מעביר יום לעיר אחרת ומנקה את העצירות של העיר הקודמת', () => {
  const out = run(trip(), 'set_day_city', { dayNumber: 1, citySlug: 'bratislava' });
  assert.equal(out.ok, true);
  const days = out.trip!.days;
  assert.equal(days[0].citySlug, 'bratislava');
  assert.deepEqual(days[0].placeIds, [], 'עצירות של הטטרה לא יכולות להישאר');
  // שאר הימים לא נגעו
  assert.equal(days[1].citySlug, 'high-tatras');
  assert.deepEqual(days[1].placeIds, ['tat-lomnicky']);
  assert.equal(days[2].citySlug, 'vienna');
});

test('העצירות שהוסרו מדווחות בשמן, כדי שהסוכן יוכל לומר מה ירד', () => {
  const out = run(trip(), 'set_day_city', { dayNumber: 1, citySlug: 'bratislava' });
  assert.match(out.message, /הוסרו/);
  // השמות האמיתיים מהקטלוג, לא המזהים
  assert.ok(!out.message.includes('tat-strbske'), 'מזהה גולמי אינו שם');
  assert.match(out.message, /set_day_places/, 'ההנחיה למלא את היום מיד');
});

test('סדר הערים נגזר מסדר הימים אחרי ההעברה', () => {
  let t = trip();
  t = run(t, 'set_day_city', { dayNumber: 1, citySlug: 'bratislava' }).trip!;
  t = run(t, 'set_day_city', { dayNumber: 2, citySlug: 'bratislava' }).trip!;
  assert.deepEqual(t.citySlugs, ['bratislava', 'vienna'], 'הטטרה נעלמה מהמסלול');
  assert.deepEqual(
    t.days.map((d) => d.citySlug),
    ['bratislava', 'bratislava', 'vienna'],
  );
});

test('set_day_city נדחה על עיר לא מוכרת, על יום מחוץ לטווח ועל אותה עיר', () => {
  assert.equal(run(trip(), 'set_day_city', { dayNumber: 1, citySlug: 'atlantis' }).ok, false);
  assert.equal(run(trip(), 'set_day_city', { dayNumber: 9, citySlug: 'vienna' }).ok, false);
  const same = run(trip(), 'set_day_city', { dayNumber: 3, citySlug: 'vienna' });
  assert.equal(same.ok, false, 'אין מה לשנות');
  assert.match(same.message, /כבר/);
});

test('set_day_city בלי טיול פעיל נכשל בלי לקרוס', () => {
  const out = run(null, 'set_day_city', { dayNumber: 1, citySlug: 'vienna' });
  assert.equal(out.ok, false);
  assert.equal(out.trip, null);
});

test('move_day מזיז יום והעצירות נעות איתו', () => {
  const out = run(trip(), 'move_day', { fromDay: 3, toDay: 1 });
  assert.equal(out.ok, true);
  const days = out.trip!.days;
  assert.equal(days[0].citySlug, 'vienna');
  assert.deepEqual(days[0].placeIds, ['vie-schonbrunn'], 'שום עצירה לא נמחקת');
  assert.deepEqual(
    days.map((d) => d.citySlug),
    ['vienna', 'high-tatras', 'high-tatras'],
  );
  assert.deepEqual(out.trip!.citySlugs, ['vienna', 'high-tatras'], 'סדר הערים התהפך גם הוא');
});

test('move_day שומר על מספר הימים ועל כל העצירות', () => {
  const before = trip();
  const after = run(before, 'move_day', { fromDay: 1, toDay: 3 }).trip!;
  assert.equal(after.days.length, before.days.length);
  const ids = (t: Trip) => t.days.flatMap((d) => d.placeIds).sort();
  assert.deepEqual(ids(after), ids(before));
});

test('move_day נדחה על טווח לא חוקי ועל מקור=יעד', () => {
  for (const input of [
    { fromDay: 0, toDay: 2 },
    { fromDay: 1, toDay: 9 },
    { fromDay: 2, toDay: 2 },
    { fromDay: 1.5, toDay: 2 },
  ]) {
    assert.equal(run(trip(), 'move_day', input).ok, false, JSON.stringify(input));
  }
});

test('התרחיש המלא של נטנאל: ימים 1-2 עוברים לברטיסלבה בלי לבנות מחדש', () => {
  let t = trip();
  const originalId = t.id;
  for (const dayNumber of [1, 2]) {
    const moved = run(t, 'set_day_city', { dayNumber, citySlug: 'bratislava' });
    assert.equal(moved.ok, true);
    t = moved.trip!;
    const filled = run(t, 'set_day_places', {
      dayNumber,
      placeIds: dayNumber === 1 ? ['bts-oldtown', 'bts-castle'] : ['bts-ufo'],
    });
    assert.equal(filled.ok, true, filled.message);
    t = filled.trip!;
  }
  // אותו טיול, לא חדש
  assert.equal(t.id, originalId);
  assert.equal(t.days.length, 3);
  assert.deepEqual(t.days[0].placeIds, ['bts-oldtown', 'bts-castle']);
  assert.deepEqual(t.days[1].placeIds, ['bts-ufo']);
  // וינה נשארה כמו שהייתה
  assert.equal(t.days[2].citySlug, 'vienna');
  assert.deepEqual(t.days[2].placeIds, ['vie-schonbrunn']);
});
