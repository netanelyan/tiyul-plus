import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Trip } from '@/lib/trip/types';
import { executeAgentTool } from '@/lib/trip/agent';
import { detectCorrection } from './correction';

const trip: Trip = {
  id: 'trip-1',
  name: 'סופ״ש בברטיסלבה',
  citySlugs: ['bratislava'],
  days: [
    { id: 'd1', citySlug: 'bratislava', placeIds: ['bts-castle'] },
    { id: 'd2', citySlug: 'bratislava', placeIds: ['bts-ufo'] },
  ],
  preferences: { pace: 'relaxed' },
  createdAt: 1000,
};

const convo = (last: string) => [
  { role: 'user', content: 'ברסלוונה' },
  { role: 'assistant', content: 'בניתי לך סופ״ש בברטיסלבה.' },
  { role: 'user', content: last },
];

test('המשפט שנתנאל כתב בפועל מזוהה כתיקון', () => {
  const v = detectCorrection(convo('ברצלונה, לא ברטיסלבה'), trip);
  assert.equal(v.correction, true);
});

test('ניסוחי תיקון נוספים', () => {
  for (const t of ['התכוונתי לברצלונה', 'טעות שלי, ברצלונה', 'לא זה מה שרציתי', 'אמרתי ברצלונה', 'לא ברטיסלבה, ברצלונה']) {
    assert.equal(detectCorrection(convo(t), trip).correction, true, t);
  }
});

/**
 * **הכיוון הבטוח לטעות.** בקשה חדשה שנחשבת בטעות לתיקון דורסת טיול
 * קיים, ולכן כל אחת מהשורות האלה חייבת להישאר "לא תיקון".
 */
test('בקשות רגילות אינן תיקון - כולל "לא" תמימה', () => {
  for (const t of [
    'תוסיף עוד יום',
    'תבנה לי טיול חדש לרומא',
    'לא צריך מלון, יש לנו',
    'אנחנו לא אוהבים מוזיאונים',
    'תזיז את יום 5 ליום 1',
    'מה יש לעשות שם',
  ]) {
    assert.equal(detectCorrection(convo(t), trip).correction, false, t);
  }
});

test('שלושת התנאים המקדימים', () => {
  assert.equal(detectCorrection(convo('ברצלונה, לא ברטיסלבה'), null).correction, false);
  assert.equal(
    detectCorrection([{ role: 'user', content: 'a' }, { role: 'user', content: 'ברצלונה, לא ברטיסלבה' }], trip).correction,
    false,
  );
  const long = 'טעיתי ' + 'א'.repeat(250);
  assert.equal(detectCorrection(convo(long), trip).correction, false);
});

/* ---------- ההשלכה המבנית ---------- */

test('בתור של תיקון, בנייה מחדש שומרת את מזהה הטיול - אין טיול יתום', () => {
  const out = executeAgentTool(
    trip,
    'create_trip_full',
    { name: 'סופ״ש בברצלונה', dayPlans: [{ citySlug: 'barcelona', placeIds: ['bcn-sagrada'] }] },
    [],
    null,
    true,
  );
  assert.equal(out.ok, true);
  assert.equal(out.trip!.id, 'trip-1', 'המזהה חייב להישמר, אחרת upsertTrip מוסיף שורה שנייה');
  assert.equal(out.trip!.createdAt, 1000);
  assert.deepEqual(out.trip!.preferences, { pace: 'relaxed' }, 'העדפות שהמטייל נתן שורדות תיקון');
  assert.ok(out.action!.includes('עדכנתי'), 'המשפט למטייל חייב לומר עדכון ולא יצירה');
});

test('כשזה לא תיקון - טיול חדש, בדיוק כמו קודם', () => {
  const out = executeAgentTool(
    trip,
    'create_trip_full',
    { name: 'רומא', dayPlans: [{ citySlug: 'rome', placeIds: ['rom-colosseum'] }] },
    [],
    null,
    false,
  );
  assert.equal(out.ok, true);
  assert.notEqual(out.trip!.id, 'trip-1', 'בקשה חדשה שדורסת טיול קיים היא אובדן מידע');
  assert.ok(out.action!.includes('יצרתי'));
});

test('ברירת המחדל של הפרמטר היא "לא תיקון"', () => {
  const out = executeAgentTool(trip, 'create_trip_full', {
    name: 'רומא',
    dayPlans: [{ citySlug: 'rome', placeIds: ['rom-colosseum'] }],
  });
  assert.notEqual(out.trip!.id, 'trip-1');
});
