/**
 * מצב ההזמנות לפי עיר.
 *
 * הבדיקה החשובה כאן היא **התאימות לאחור**: יש טיולים חיים ב-localStorage
 * ובחשבונות שנושאים `booking.stay` בודד, ואסור שהמעבר יאבד אותו או
 * יגרום ללחיצה להיראות כאילו לא נקלטה.
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

/* ---------- החלוקה עצמה ---------- */

test('לינה וכרטיסים לפי עיר, השאר לטיול', () => {
  assert.deepEqual(PER_CITY_KINDS, ['stay', 'activities']);
  assert.deepEqual(TRIP_WIDE_KINDS, ['flights', 'esim', 'insurance', 'car']);
});

test('perCity תואם למי שהחיפוש שלו מקבל יעד', () => {
  /*
    הדגל מסומן ביד בקונפיג, וזו הבדיקה שמונעת ממנו להיפרד מהמציאות:
    ספק שמחפש **במקום מסוים** הוא בדיוק ספק ששייך לעיר. אם מישהו יוסיף
    ספק ויסמן אחרת, זה ייפול כאן ולא במסך של מטייל.
  */
  for (const p of bookingProviders) {
    assert.equal(
      bookingIsPerCity(p.kind),
      bookingSearchTakesPlace(p.kind),
      `${p.kind}: perCity=${bookingIsPerCity(p.kind)} אבל חיפוש-לפי-מקום=${bookingSearchTakesPlace(p.kind)}`,
    );
  }
});

/* ---------- קריאה ---------- */

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

/* ---------- כתיבה ---------- */

test('הכתיבה הראשונה פורסת את הערך הישן ומוחקת אותו', () => {
  const t = trip({ booking: { stay: 'have', flights: 'need' } });
  const patch = toggleBookingStatus(t.preferences, 'stay', 'need', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  // ברטיסלבה שמרה על הערך הישן, וינה קיבלה את החדש
  assert.deepEqual(patch.bookingByCity?.stay, { bratislava: 'have', vienna: 'need' });
  // המפתח הישן נעלם, כדי שלא יחזור כברירת מחדל אחרי כיבוי
  assert.equal(patch.booking?.stay, undefined);
  // סוג אחר לא נגוע
  assert.equal(patch.booking?.flights, 'need');
});

test('הבאג שהפריסה מונעת: כיבוי אחרי ערך ישן לא "מחזיר" אותו', () => {
  const t = trip({ booking: { stay: 'have' } });
  const first = toggleBookingStatus(t.preferences, 'stay', 'have', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  // לחיצה על הסטטוס הפעיל מנקה את וינה בלבד
  assert.equal(first.bookingByCity?.stay?.vienna, undefined);
  assert.equal(first.bookingByCity?.stay?.bratislava, 'have');
  // ובלי המפתח הישן, וינה באמת ריקה ולא נופלת חזרה ל-have
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
    "יש לנו מלון בווינה" שנאמר פעמיים חייב להישאר "יש". הכיבוי הוא
    מחווה של ממשק - לחיצה על מה שכבר פעיל - ולא של שיחה.
  */
  const t = trip({ bookingByCity: { stay: { vienna: 'have' } } });
  const patch = setBookingStatus(t.preferences, 'stay', 'have', {
    citySlug: 'vienna',
    citySlugs: t.citySlugs,
  });
  assert.equal(patch.bookingByCity?.stay?.vienna, 'have');
});

/* ---------- ספירה ---------- */

test('כל עיר פתוחה נספרת בנפרד', () => {
  const t = trip({
    booking: { flights: 'need' },
    bookingByCity: { stay: { bratislava: 'need', vienna: 'need' } },
  });
  // טיסות + שתי ערים בלינה = 3, ולא 2
  assert.equal(openBookingCount(t), 3);
  assert.deepEqual(citiesNeeding(t, 'stay'), ['bratislava', 'vienna']);
});

test('ערך ישן "need" נספר פעם אחת לכל עיר', () => {
  const t = trip({ booking: { stay: 'need' } });
  assert.equal(openBookingCount(t), 2);
});

/* ---------- הסוכן ---------- */

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
    ההערה בקוד אמרה "לעיר" מהיום הראשון, אבל האחסון ידע רק טיול שלם -
    כך שמלון בווינה סימן גם את ברטיסלבה, והמטייל הפסיק לקבל הצעה לחפש שם.
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
