/**
 * The report builder - against the **real** catalog, not a fixture,
 * because that is exactly the claim: places are resolved against the live
 * data.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreDepartureReport } from './predepartureReport.ts';
import type { Trip } from '@/lib/trip/types';

function trip(overrides: Partial<Trip>): Trip {
  return {
    id: 't1',
    name: 'טיול בדיקה',
    citySlugs: ['vienna'],
    createdAt: Date.now(),
    days: [],
    ...overrides,
  };
}

test('מקום שאינו בקטלוג יותר מסומן, ולא מפיל את הבנייה', () => {
  const t = trip({
    citySlugs: ['vienna'],
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-schonbrunn', 'no-such-place-xyz'] }],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.placesChecked, 2);
  assert.equal(r.placesFlagged.length, 1);
  assert.deepEqual(r.placesFlagged[0], { dayNumber: 1, placeId: 'no-such-place-xyz', reason: 'not-in-catalog' });
  assert.equal(r.itinerary[0].stops[1].unknown, true);
});

test('כשרות נקראת מחדש עבור מקום כשר, עם הכיסוי "לוודא מול המקום" - ולא נטען שהתקשרנו', () => {
  const t = trip({
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-alef-alef'] }],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.kosherChecked, 1);
  const note = r.kosherNotes[0];
  assert.equal(note.status, 'kosher');
  // The certifying body by NAME. The Latin form (IKG) now lives in its own
  // field rather than being glued into the display string.
  assert.equal(note.supervision, 'הקהילה היהודית של וינה');
  assert.match(note.note, /לוודא מול המקום/);
  assert.doesNotMatch(note.note, /התקשרנו|אימתנו טלפונית/);
  // This record was migrated from the old model, which never recorded a date.
  // The report must say so rather than print a date-shaped placeholder - the
  // whole point of the new provenance field is that "we do not know when"
  // is expressible.
  assert.equal(note.lastChecked, null);
  assert.match(note.note, /אין לנו תאריך בדיקה|לא אומתה על ידינו/);
  assert.doesNotMatch(note.note, /pending-review/);
});

test('כשרות: מקום שמסומן לא-כשר אומר זאת בפירוש, לא בשתיקה', () => {
  const t = trip({
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-cafe-central'] }],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.kosherNotes[0].status, 'not-kosher');
  assert.match(r.kosherNotes[0].note, /לא כשר/);
});

test('מקום שאינו קטגוריית אכילה לא נכנס לרשימת הכשרות', () => {
  const t = trip({
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-schonbrunn'] }],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.kosherChecked, 0);
});

test('סדר ימים תקין: לולאה שחוזרת לעיר ההתחלה בסוף הטיול אינה זגזוג', () => {
  const t = trip({
    citySlugs: ['vienna', 'bratislava', 'vienna'],
    days: [
      { id: 'd1', citySlug: 'vienna', placeIds: [] },
      { id: 'd2', citySlug: 'bratislava', placeIds: [] },
      { id: 'd3', citySlug: 'vienna', placeIds: [] },
    ],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.routeOk, true);
  assert.equal(r.routeNote, undefined);
});

test('סדר ימים שגוי: חזרה לעיר שכבר עזבו באמצע הטיול היא זגזוג', () => {
  const t = trip({
    citySlugs: ['vienna', 'bratislava', 'vienna', 'bratislava'],
    days: [
      { id: 'd1', citySlug: 'vienna', placeIds: [] },
      { id: 'd2', citySlug: 'bratislava', placeIds: [] },
      { id: 'd3', citySlug: 'vienna', placeIds: [] },
      { id: 'd4', citySlug: 'bratislava', placeIds: [] },
    ],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.routeOk, false);
  assert.match(r.routeNote ?? '', /וינה/);
  assert.match(r.routeNote ?? '', /זגזוג/);
});

test('טיול לעיר אחת - אין מה לבדוק בסדר, תמיד תקין', () => {
  const t = trip({ days: [{ id: 'd1', citySlug: 'vienna', placeIds: [] }] });
  assert.equal(buildPreDepartureReport(t).routeOk, true);
});

test('שם עיר מוצג לתצוגה גם כשהיא לא בקטלוג - לא נופל', () => {
  const t = trip({
    citySlugs: ['no-such-city'],
    days: [{ id: 'd1', citySlug: 'no-such-city', placeIds: [] }],
  });
  const r = buildPreDepartureReport(t);
  assert.equal(r.itinerary[0].cityName, 'no-such-city');
});

test('תמונת מצב המסלול נושאת שם, קטגוריה ומספר יום לכל עצירה', () => {
  const t = trip({
    days: [{ id: 'd1', citySlug: 'vienna', placeIds: ['vie-schonbrunn'] }],
  });
  const r = buildPreDepartureReport(t);
  assert.deepEqual(r.itinerary[0].stops[0], {
    name: 'ארמון שנברון',
    // Schonbrunn moved attraction -> historic on 2026-08-17 with the category split
    category: 'historic',
    mustSee: true,
  });
  assert.equal(r.itinerary[0].dayNumber, 1);
});

test('generatedAt הוא חותמת זמן אמיתית של רגע היצירה', () => {
  const before = Date.now();
  const r = buildPreDepartureReport(trip({ days: [] }));
  const after = Date.now();
  const ts = Date.parse(r.generatedAt);
  assert.ok(ts >= before && ts <= after);
});
