/**
 * טסטים ל-sanitizeDayNote.
 *
 * הרקע: בבדיקה חיה המודל תיקן את התשובה בצ׳אט ("לדווין יש אוטובוס או
 * שיט") אבל עדיין כתב "נוסעים באוטובוס 29" לתוך הערת היום - וההערה
 * נשמרת בטיול, מודפסת ב-PDF ונשלחת בשיתוף. מספר קו הוא בדיוק סוג הפרט
 * שאי אפשר לאמת ומשתנה בעולם, ולכן הוא מוסר מההערה אלא אם הוא כבר
 * מופיע ב-gettingAround של אותו יעד.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDayNote } from './agent.ts';
import { destinations } from '@/data/destinations';

const CITY = 'bratislava';

test('מספר קו שלא מופיע בדאטה מוסר, שאר ההערה נשמרת', () => {
  const out = sanitizeDayNote('לחוף נוסעים באוטובוס 777 או שיט על הדנובה', CITY);
  assert.equal(out.changed, true);
  assert.ok(!/777/.test(out.note), 'המספר חייב להיעלם');
  assert.match(out.note, /אוטובוס/, 'אמצעי התחבורה עצמו נשאר');
  assert.match(out.note, /שיט על הדנובה/, 'שאר ההערה לא נפגעת');
});

test('אוטובוס 29 לדווין נשאר - הוא כתוב בדאטה של ברטיסלבה', () => {
  // התיקון הזה נולד מטעות שלי: דיווחתי על "אוטובוס 29" כהמצאה, אבל
  // gettingAround של ברטיסלבה אומר במפורש "לדווין - אוטובוס 29".
  // הטסט הזה קיים כדי שהמנקה לא יימחק פרט אמיתי מהקטלוג.
  const out = sanitizeDayNote('לדווין נוסעים באוטובוס 29', CITY);
  assert.equal(out.changed, false);
  assert.match(out.note, /29/);
});

test('כל אמצעי התחבורה מטופלים, גם עם "מספר"', () => {
  for (const raw of [
    'קו 993 מהמרכז',
    'טרמוואי 664 עד הכיכר',
    'חשמלית 812',
    'מטרו 331 לתחנה',
    'רכבת 507',
    'אוטובוס מספר 771',
  ]) {
    const out = sanitizeDayNote(raw, CITY);
    assert.equal(out.changed, true, raw);
    assert.ok(!/\d/.test(out.note), `${raw} -> ${out.note}`);
  }
});

test('הערה בלי מספר קו עוברת כמו שהיא, בלי לגעת בה', () => {
  for (const raw of [
    'לתאם ביקור מראש',
    'מתחילים מהעיר העתיקה ומסיימים בשקיעה',
    'כדאי להגיע לפני 10:00 בגלל התורים',
    'הכניסה חופשית, כ-90 דקות במקום',
  ]) {
    const out = sanitizeDayNote(raw, CITY);
    assert.equal(out.changed, false, raw);
    assert.equal(out.note, raw);
  }
});

test('שעות ומחירים אינם מספרי קווים - לא נוגעים בהם', () => {
  const raw = 'צ׳ק-אין ב-14:00, כ-3 שעות במקום, כ-20 יורו לכניסה';
  const out = sanitizeDayNote(raw, CITY);
  assert.equal(out.changed, false);
  assert.equal(out.note, raw);
});

test('מספר שכן מופיע ב-gettingAround של היעד נשאר - הוא מאומת בדאטה', () => {
  // נבנה את המקרה מהדאטה האמיתית: מוצאים יעד שיש בו מספר בטקסט התחבורה
  const withNumber = destinations.find((d) => /\d/.test(d.practical?.gettingAround ?? ''));
  assert.ok(withNumber, 'צריך להיות לפחות יעד אחד עם מספר בטקסט התחבורה');
  const num = (withNumber!.practical!.gettingAround!.match(/\d{1,3}/) ?? [])[0]!;
  const out = sanitizeDayNote(`אוטובוס ${num} מהמרכז`, withNumber!.slug);
  assert.equal(out.changed, false, `${num} מופיע בדאטה ולכן נשאר`);
  assert.match(out.note, new RegExp(num));
});

test('עיר שאינה בקטלוג - מנקים בכל זאת, לא קורסים', () => {
  const out = sanitizeDayNote('אוטובוס 42 לחוף', 'no-such-city');
  assert.equal(out.changed, true);
  assert.ok(!/42/.test(out.note));
});

test('הערה ריקה', () => {
  assert.deepEqual(sanitizeDayNote('', CITY), { note: '', changed: false });
});
