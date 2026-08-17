/**
 * Booking status per city.
 *
 * The important test here is **backward compatibility**: there are live trips
 * in localStorage and in accounts that carry a single `booking.stay`, and the
 * migration must not lose it or make a click look as if it did not register.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingIsPerCity,
  bookingProviders,
  bookingSearchTakesPlace,
} from '@/lib/booking.ts';
import { executeAgentTool } from './agent.ts';
import type { Trip } from './types';
import {
  PER_CITY_KINDS,
  TRIP_WIDE_KINDS,
  bookingStatusOf,
  citiesNeeding,
  openBookingCount,
  setBookingStatus,
  toggleBookingStatus,
} from './bookingStatus.ts';

const trip = (prefs: Trip['preferences'] = {}): Trip => ({
  id: 't1',
  name: 'ברטיסלבה ווינה',
  citySlugs: ['bratislava', 'vienna'],
  createdAt: 1,
  days: [
    { id: 'd1', citySlug: 'bratislava', placeIds: [] },
    { id: 'd2', citySlug: 'vienna', placeIds: [] },
  ],
  preferences: prefs,
});

/* ---------- The split itself ---------- */

test('לינה וכרטיסים לפי עיר, השאר לטיול', () => {
  assert.deepEqual(PER_CITY_KINDS, ['stay', 'activities']);
  assert.deepEqual(TRIP_WIDE_KINDS, ['flights', 'esim', 'insurance', 'car']);
});

test('perCity תואם למי שהחיפוש שלו מקבל יעד', () => {
  /*
    The flag is marked by hand in the config, and this is the test that keeps it
    from drifting apart from reality: a provider that searches **in a specific
    place** is exactly a provider that belongs to a city. If someone adds a
    provider and marks it otherwise, it fails here and not on a traveler's screen.
  */
  for (const p of bookingProviders) {
    assert.equal(
      bookingIsPerCity(p.kind),
      bookingSearchTakesPlace(p.kind),
      `${p.kind}: perCity=${bookingIsPerCity(p.kind)} אבל חיפוש-לפי-מקום=${bookingSearchTakesPlace(p.kind)}`,
    );
  }
});

/* ---------- Reading ---------- */

test('סוג עירוני בלי עיר מחזיר undefined ולא ניחוש', () => {
  const t = trip({ bookingByCity: { stay: { vienna: 'have' } } });
  assert.equal(bookingStatusOf(t.preferences, 'stay'), undefined);
  assert.equal(bookingStatusOf(t.preferences, 'stay', 'vienna'), 'have');
  assert.equal(bookingStatusOf(t.preferences, 'stay', 'bratislava'), undefined);
});

test('טיול ישן: הערך הבודד נקרא כברירת מחדל לכל עיר', () => {
  const t = trip({ booking: { stay: 'have', flights: 'need' } });
  assert.equal(bookingStatusOf(t.preferences, 'stay', 'vienna'), 'have');
  assert.equal(bookingStatusOf(t.preferences, 'stay', 'bratislava'), 'have');
  assert.equal(bookingStatusOf(t.preferences, 'flights'), 'need');
});

/* ---------- Writing ---------- */

test('הכתיבה הראשונה פורסת את הערך הישן ומוחקת אותו', () => {
  const t = trip({ booking: { stay: 'have', flights: 'need' } });
  const patch = toggleBookingStatus(t.preferences, 'stay', 'need', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  // Bratislava kept the old value, Vienna got the new one
  assert.deepEqual(patch.bookingByCity?.stay, { bratislava: 'have', vienna: 'need' });
  // The old key is gone, so it cannot come back as a default after clearing
  assert.equal(patch.booking?.stay, undefined);
  // A different kind is untouched
  assert.equal(patch.booking?.flights, 'need');
});

test('הבאג שהפריסה מונעת: כיבוי אחרי ערך ישן לא "מחזיר" אותו', () => {
  const t = trip({ booking: { stay: 'have' } });
  const first = toggleBookingStatus(t.preferences, 'stay', 'have', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  // Clicking the active status clears Vienna only
  assert.equal(first.bookingByCity?.stay?.vienna, undefined);
  assert.equal(first.bookingByCity?.stay?.bratislava, 'have');
  // And without the old key, Vienna is truly empty and does not fall back to 'have'
  const after = { ...t.preferences, ...first };
  assert.equal(bookingStatusOf(after, 'stay', 'vienna'), undefined);
});

test('עיר אחת לא נוגעת בשנייה', () => {
  const t = trip();
  const a = toggleBookingStatus(t.preferences, 'stay', 'have', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  assert.equal(bookingStatusOf({ ...t.preferences, ...a }, 'stay', 'bratislava'), undefined);
  assert.equal(bookingStatusOf({ ...t.preferences, ...a }, 'stay', 'vienna'), 'have');
});

test('הסוכן קובע ולא מכבה', () => {
  /*
    "We have a hotel in Vienna" said twice must remain "have". The toggle-off is
    a UI gesture - clicking what is already active - not a conversational one.
  */
  const t = trip({ bookingByCity: { stay: { vienna: 'have' } } });
  const patch = setBookingStatus(t.preferences, 'stay', 'have', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  assert.equal(patch.bookingByCity?.stay?.vienna, 'have');
});

/* ---------- Counting ---------- */

test('כל עיר פתוחה נספרת בנפרד', () => {
  const t = trip({
    booking: { flights: 'need' },
    bookingByCity: { stay: { bratislava: 'need', vienna: 'need' } },
  });
  // Flights + two cities in lodging = 3, not 2
  assert.equal(openBookingCount(t), 3);
  assert.deepEqual(citiesNeeding(t, 'stay'), ['bratislava', 'vienna']);
});

test('ערך ישן "need" נספר פעם אחת לכל עיר', () => {
  const t = trip({ booking: { stay: 'need' } });
  assert.equal(openBookingCount(t), 2);
});

/* ---------- The agent ---------- */

const run = (t: Trip, input: Record<string, unknown>) =>
  executeAgentTool(t, 'set_booking_status', input, []);

test('לינה בלי עיר נדחית ולא נשמרת על הטיול', () => {
  const t = trip();
  const out = run(t, { stay: 'have' });
  assert.equal(out.ok, false);
  assert.match(out.message, /citySlug/);
  assert.equal(out.trip, t);
});

test('עיר שאינה בטיול נדחית - ולא נופלים לעיר הראשונה', () => {
  const out = run(trip(), { stay: 'have', citySlug: 'rome' });
  assert.equal(out.ok, false);
  assert.match(out.message, /rome/);
});

test('לינה עם עיר תקינה נשמרת לעיר הזו בלבד', () => {
  const out = run(trip(), { stay: 'have', citySlug: 'vienna' });
  assert.equal(out.ok, true);
  assert.equal(bookingStatusOf(out.trip!.preferences, 'stay', 'vienna'), 'have');
  assert.equal(bookingStatusOf(out.trip!.preferences, 'stay', 'bratislava'), undefined);
  assert.match(out.action ?? '', /וינה/);
});

test('סוג של הטיול כולו עדיין עובד בלי עיר', () => {
  const out = run(trip(), { flights: 'have', esim: 'need' });
  assert.equal(out.ok, true);
  assert.equal(bookingStatusOf(out.trip!.preferences, 'flights'), 'have');
  assert.equal(bookingStatusOf(out.trip!.preferences, 'esim'), 'need');
});

test('סיכת מלון מסמנת רק את העיר שלה', () => {
  /*
    The comment in the code said "for the city" from day one, but the storage
    only knew a whole trip - so a hotel in Vienna also marked Bratislava, and
    the traveler stopped getting an offer to search there.
  */
  const t = trip();
  const out = executeAgentTool(
    t,
    'add_pin',
    { kind: 'stay', name: 'Hotel Sacher', citySlug: 'vienna' },
    [],
    { lat: 48.2, lng: 16.37, address: 'Wien' },
  );
  assert.equal(out.ok, true);
  assert.equal(bookingStatusOf(out.trip!.preferences, 'stay', 'vienna'), 'have');
  assert.equal(bookingStatusOf(out.trip!.preferences, 'stay', 'bratislava'), undefined);
});
