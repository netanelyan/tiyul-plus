/**
 * טסטים להתאמה בין תאריכי הטיול ללוח האירועים והסגירות.
 *
 * הדאטה עצמה (`src/data/calendar.ts`, 161 רשומות) נבדקת ע"י
 * `scripts/validate-calendar.mjs` - כאן נבדקים **ההתאמה והניסוח**:
 *
 * 1. **מה נחשב חפיפה.** יום-בעיר ולא טווח-מול-טווח, ולכן רוב הטסטים הם
 *    דווקא מקרים שבהם התשובה הנכונה היא "לא להציג".
 * 2. **ששתי דרגות הוודאות לא מתערבבות.** רשומה בלי תאריכים מאושרים לא
 *    יכולה להופיע כ"חופף לימים 3-5", כי אין לה תאריכים בכלל.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendar } from '@/data/calendar';
import { destinations } from '@/data/destinations';
import { executeAgentTool } from './agent.ts';
import {
  NOT_PUBLISHED,
  datedLabel,
  dayRangeLabel,
  impactLabel,
  matchTripCalendar,
  monthsInWindow,
  sourceLabel,
} from './dateWindows.ts';
import type { CalendarEntry } from '@/lib/types';
import type { Trip } from './types';

const CITIES = destinations.map((d) => ({ slug: d.slug, countrySlug: d.countrySlug }));

const entry = (over: Partial<CalendarEntry> = {}): CalendarEntry => ({
  id: 'e1',
  kind: 'event',
  name: 'אירוע בדיקה',
  nameLocal: 'Test Event',
  countrySlug: 'germany',
  destinationSlugs: ['munich'],
  datesConfirmed: true,
  dates: [{ start: '2026-09-19', end: '2026-10-04' }],
  impact: 'crowds',
  note: 'הערה.',
  source: { url: 'https://example.org', title: 'מקור', checked: '2026-07-30' },
  ...over,
});

const trip = (startDate: string | undefined, cities: string[]): Trip => ({
  id: 't',
  name: 'טיול',
  citySlugs: [...new Set(cities)],
  days: cities.map((c, i) => ({ id: `d${i}`, citySlug: c, placeIds: [] })),
  createdAt: 0,
  ...(startDate ? { startDate } : {}),
});

/* ---------- ההחלטה: חפיפה נמדדת מול הימים בעיר ---------- */

test('חופף רק אם המטייל נמצא באותו מקום באותו יום', () => {
  // 17-18 בספטמבר במינכן, ואז רומא. האירוע נפתח ב-19 - הוא כבר לא שם.
  const before = trip('2026-09-17', ['munich', 'munich', 'rome', 'rome']);
  assert.deepEqual(matchTripCalendar(before, [entry()], CITIES).dated, []);

  const during = trip('2026-09-17', ['munich', 'munich', 'munich', 'munich']);
  const got = matchTripCalendar(during, [entry()], CITIES).dated;
  assert.equal(got.length, 1);
  assert.deepEqual(got[0].dayNumbers, [3, 4]); // 19-20 בספטמבר
});

test('אותם תאריכים בעיר אחרת לא מדליקים כלום', () => {
  const inRome = trip('2026-09-20', ['rome', 'rome', 'rome']);
  assert.deepEqual(matchTripCalendar(inRome, [entry()], CITIES).dated, []);
});

test('רשומה ברמת מדינה חלה על כל עריה, ורק עליהן', () => {
  const national = entry({
    destinationSlugs: undefined,
    countrySlug: 'italy',
    dates: [{ start: '2026-08-15', end: '2026-08-15' }],
  });
  assert.equal(matchTripCalendar(trip('2026-08-15', ['rome']), [national], CITIES).dated.length, 1);
  assert.equal(matchTripCalendar(trip('2026-08-15', ['florence']), [national], CITIES).dated.length, 1);
  assert.equal(matchTripCalendar(trip('2026-08-15', ['munich']), [national], CITIES).dated.length, 0);
});

test('טיול בלי תאריכים לא מייצר שום התראה', () => {
  assert.deepEqual(matchTripCalendar(trip(undefined, ['munich']), [entry()], CITIES).dated, []);
  assert.deepEqual(matchTripCalendar(null, [entry()], CITIES).dated, []);
});

test('חזרה לאותה עיר בסוף הטיול לא הופכת לטווח רציף מדומה', () => {
  const t = trip('2026-09-19', ['munich', 'rome', 'rome', 'rome', 'munich']);
  const got = matchTripCalendar(t, [entry()], CITIES).dated;
  assert.deepEqual(got[0].dayNumbers, [1, 5]);
  assert.equal(dayRangeLabel(got[0].dayNumbers), 'ימים 1, 5');
  assert.equal(dayRangeLabel([3, 4, 5]), 'ימים 3-5');
  assert.equal(dayRangeLabel([2]), 'יום 2');
});

test('כל טווח שנה נבדק בנפרד, ושנה שאין לה טווח לא מומצאת', () => {
  const twoYears = entry({
    dates: [
      { start: '2026-09-19', end: '2026-10-04' },
      { start: '2027-09-18', end: '2027-10-03' },
    ],
  });
  const y2027 = matchTripCalendar(trip('2027-09-20', ['munich']), [twoYears], CITIES).dated;
  assert.equal(y2027.length, 1);
  assert.equal(datedLabel(y2027[0]), '18 בספטמבר - 3 באוקטובר');
  assert.equal(matchTripCalendar(trip('2028-09-20', ['munich']), [twoYears], CITIES).dated.length, 0);
});

/* ---------- חלון לא מאושר: לעולם לא כתאריך ---------- */

test('רשומה בלי תאריכים מאושרים לא מופיעה ברשימת התאריכים', () => {
  const soft = entry({
    datesConfirmed: false,
    dates: undefined,
    window: 'בדרך כלל בשבוע הראשון של אוגוסט',
  });
  const t = trip('2026-08-03', ['munich', 'munich']);
  const got = matchTripCalendar(t, [soft], CITIES);
  assert.deepEqual(got.dated, []);
  assert.equal(got.windows.length, 1);
  // מה שמוצג הוא הטקסט כפי שנכתב, בלי תאריך נגזר
  assert.equal(got.windows[0].entry.window, 'בדרך כלל בשבוע הראשון של אוגוסט');
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(got.windows[0].entry.window!));
});

test('חלון לא מאושר מוצג רק כשהחודש שלו נוגע לטיול', () => {
  const soft = entry({ datesConfirmed: false, dates: undefined, window: 'בדרך כלל בדצמבר' });
  assert.equal(matchTripCalendar(trip('2026-12-10', ['munich']), [soft], CITIES).windows.length, 1);
  assert.equal(matchTripCalendar(trip('2026-06-10', ['munich']), [soft], CITIES).windows.length, 0);
});

test('חלון שאי אפשר לזהות בו חודש לא מוצג - נכשל לכיוון הבטוח', () => {
  const vague = entry({ datesConfirmed: false, dates: undefined, window: 'משתנה משנה לשנה' });
  assert.equal(matchTripCalendar(trip('2026-08-03', ['munich']), [vague], CITIES).windows.length, 0);
});

test('זיהוי חודשים בטקסט חופשי - כולל טווח וכולל מעבר שנה', () => {
  assert.deepEqual(monthsInWindow('ינואר עד מרץ'), [1, 2, 3]);
  assert.deepEqual(monthsInWindow('מאמצע נובמבר עד ינואר'), [1, 11, 12]);
  assert.deepEqual(monthsInWindow('אמצע אוגוסט'), [8]);
  assert.deepEqual(monthsInWindow('אין כאן חודש'), []);
});

/* ---------- ניסוח ---------- */

test('תווית הסוג מבדילה סגירות מאירוע', () => {
  assert.equal(impactLabel(entry({ kind: 'closure', impact: 'closures' })), 'סגירות');
  assert.equal(impactLabel(entry({ kind: 'event', impact: 'crowds' })), 'אירוע');
  assert.equal(impactLabel(entry({ kind: 'event', impact: 'both' })), 'אירוע · סגירות');
});

test('שורת המקור נושאת כותרת ותאריך בדיקה', () => {
  const s = sourceLabel(entry());
  assert.ok(s.startsWith('מקור: מקור'));
  assert.ok(s.includes('נבדק ב-'));
});

test('נוסח "לא פורסם" הוא מחרוזת אחת משותפת', () => {
  assert.equal(NOT_PUBLISHED, 'התאריכים לשנה הזו עדיין לא פורסמו');
});

/* ---------- מול הדאטה האמיתית ---------- */

test('הלוח האמיתי מייצר התאמה אמיתית לטיול במינכן בספטמבר', () => {
  const t = trip('2026-09-20', ['munich', 'munich', 'munich']);
  const got = matchTripCalendar(t, calendar, CITIES);
  assert.ok(got.dated.some((m) => m.entry.name.includes('אוקטוברפסט')), 'אוקטוברפסט חייב להיתפס');
  for (const m of got.dated) {
    assert.equal(m.entry.datesConfirmed, true);
    assert.ok(m.dayNumbers.length > 0);
  }
});

test('החלוקה בין "תאריך" ל"חלון" לא דולפת בשום עיר ובשום חודש', () => {
  for (const city of ['munich', 'rome', 'tokyo', 'barcelona', 'amsterdam']) {
    for (let m = 1; m <= 12; m++) {
      const t = trip(`2026-${String(m).padStart(2, '0')}-05`, [city, city, city, city, city]);
      const got = matchTripCalendar(t, calendar, CITIES);
      for (const d of got.dated) assert.equal(d.entry.datesConfirmed, true, d.entry.id);
      for (const w of got.windows) assert.equal(w.entry.datesConfirmed, false, w.entry.id);
    }
  }
});

/* ---------- הסוכן: אין מידע זו תשובה ---------- */

test('אין מידע לעיר ולתאריכים - הכלי אומר זאת במפורש ולא נכשל', () => {
  const t = trip('2026-06-03', ['bratislava', 'bratislava']);
  const empty = matchTripCalendar(t, calendar, CITIES);
  if (empty.dated.length === 0 && empty.windows.length === 0) {
    const out = executeAgentTool(t, 'city_date_notes', { citySlug: 'bratislava' });
    assert.equal(out.ok, true);
    assert.ok(out.message.includes('אין לנו'));
    assert.ok(out.message.includes('אל תשלים מהידע שלך'));
    assert.equal(out.eventNames, undefined);
  }
});

test('כשיש חפיפה - הכלי מחזיר את הרשומה ואת שמה לרשימה הלבנה', () => {
  const out = executeAgentTool(trip('2026-09-20', ['munich', 'munich']), 'city_date_notes', {
    citySlug: 'munich',
  });
  assert.equal(out.ok, true);
  assert.ok(out.message.includes('אוקטוברפסט'));
  assert.ok(out.eventNames?.includes('אוקטוברפסט'));
  for (const rule of ['אל תוסיף תאריך', 'מחיר כרטיס', 'להמליץ ללכת']) {
    assert.ok(out.message.includes(rule), rule);
  }
});

test('טיול בלי תאריכים - נאמר במפורש שזו רשימה שלא הותאמה לתאריכים', () => {
  const out = executeAgentTool(trip(undefined, ['munich']), 'city_date_notes', {
    citySlug: 'munich',
  });
  assert.equal(out.ok, true);
  assert.ok(out.message.includes('בלי התאמה לתאריכים'));
});

test('עיר לא מוכרת נדחית', () => {
  const out = executeAgentTool(trip('2026-09-19', ['munich']), 'city_date_notes', {
    citySlug: 'atlantis',
  });
  assert.equal(out.ok, false);
});
