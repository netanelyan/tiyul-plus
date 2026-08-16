import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shabbatTimesFor, sunset, weekdayOf } from './zmanim.ts';
import { formatInZone, timezoneFor } from './countryTimezones.ts';

/** הפרש בדקות בין Date לשעת UTC צפויה באותו יום */
function minutesFromUTC(d: Date, hh: number, mm: number): number {
  return Math.abs(d.getUTCHours() * 60 + d.getUTCMinutes() - (hh * 60 + mm));
}

/*
  ערכי ייחוס מהעולם האמיתי, בדיוק של דקות בודדות. אם האסטרונומיה שבורה
  - הם אלה שיגידו, לא בדיקת עשן על "מספר כלשהו חזר".
*/

test('שקיעה בתל אביב בשיא הקיץ - בסביבות 16:47 UTC (19:47 שעון קיץ)', () => {
  const s = sunset('2026-06-21', 32.08, 34.78);
  assert.ok(s);
  assert.ok(minutesFromUTC(s, 16, 47) <= 6, `got ${s.toISOString()}`);
});

test('שקיעה בלונדון בשיא הקיץ - בסביבות 20:21 UTC', () => {
  const s = sunset('2026-06-21', 51.5074, -0.1278);
  assert.ok(s);
  assert.ok(minutesFromUTC(s, 20, 21) <= 6, `got ${s.toISOString()}`);
});

test('שקיעה בניו יורק בשיא החורף - בסביבות 21:32 UTC (16:32 EST)', () => {
  const s = sunset('2025-12-21', 40.7128, -74.006);
  assert.ok(s);
  assert.ok(minutesFromUTC(s, 21, 32) <= 6, `got ${s.toISOString()}`);
});

test('קו רוחב קוטבי בלי שקיעה - null, לא ערך מומצא', () => {
  // טרומסו באמצע הקיץ: שמש חצות
  assert.equal(sunset('2026-06-21', 69.65, 18.96), null);
});

test('weekdayOf: 21 באוגוסט 2026 הוא שישי (אומת מול המוצר עצמו)', () => {
  assert.equal(weekdayOf('2026-08-21'), 5);
  assert.equal(weekdayOf('2026-08-22'), 6);
  assert.equal(weekdayOf('2026-08-23'), 0);
});

test('shabbatTimesFor: שישי מחזיר נרות לפני שקיעה והבדלה במוצ"ש', () => {
  const t = shabbatTimesFor('2026-08-21', 50.06, 19.94); // קרקוב
  assert.ok(t);
  assert.equal(t.friday, '2026-08-21');
  const fridaySunset = sunset('2026-08-21', 50.06, 19.94)!;
  assert.equal(fridaySunset.getTime() - t.candles.getTime(), 18 * 60_000);
  assert.ok(t.havdalah.getTime() > fridaySunset.getTime());
  // הבדלה בין 30 ל-90 דקות אחרי שקיעת שישי (יום אחד קדימה + זווית 8.5)
  const gapMin = (t.havdalah.getTime() - fridaySunset.getTime()) / 60_000;
  assert.ok(gapMin > 23 * 60 && gapMin < 26 * 60, `gap ${gapMin}min`);
});

test('shabbatTimesFor: שבת עצמה מחזירה את אותה שבת; יום חול - null', () => {
  const fromSat = shabbatTimesFor('2026-08-22', 50.06, 19.94);
  assert.ok(fromSat);
  assert.equal(fromSat.friday, '2026-08-21');
  assert.equal(shabbatTimesFor('2026-08-19', 50.06, 19.94), null);
});

/* ---------- אזורי זמן ---------- */

test('מדינות עם אזור יחיד ממופות; מדינה לא מוכרת - null', () => {
  assert.equal(timezoneFor('poland', 19.9), 'Europe/Warsaw');
  assert.equal(timezoneFor('japan', 139.7), 'Asia/Tokyo');
  assert.equal(timezoneFor('atlantis', 0), null);
});

test('ארה"ב מפוצלת לפי קו אורך - ניו יורק מזרח, וגאס מערב', () => {
  assert.equal(timezoneFor('usa', -74), 'America/New_York');
  assert.equal(timezoneFor('usa', -115.14), 'America/Los_Angeles');
});

test('קנדה: הליפקס אטלנטיק, לא טורונטו - הסדר של הטווחים קריטי', () => {
  assert.equal(timezoneFor('canada', -63.57), 'America/Halifax');
  assert.equal(timezoneFor('canada', -79.38), 'America/Toronto');
  assert.equal(timezoneFor('canada', -114.07), 'America/Edmonton');
});

test('formatInZone: שעון קיץ אמיתי דרך Intl - שקיעת קיץ בפולין מוצגת CEST', () => {
  const s = sunset('2026-06-21', 50.06, 19.94)!; // קרקוב, ~18:53 UTC
  const local = formatInZone(s, 'Europe/Warsaw');
  assert.ok(local);
  // CEST = UTC+2: התצוגה חייבת להיות 20:xx, לא 19:xx (החמצת שעון קיץ)
  assert.match(local, /^20:/);
});

test('formatInZone: אזור לא קיים - null, לא זריקה ולא זמן שגוי', () => {
  assert.equal(formatInZone(new Date(), 'Not/AZone'), null);
});
