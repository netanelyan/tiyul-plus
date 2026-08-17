/**
 * Tests for sanitizeDayNote.
 *
 * The background: in live testing the model corrected its chat reply (saying
 * Devin is reachable by bus or by boat) but still wrote "take bus 29" into
 * the day note - and the note is saved on the trip, printed in the PDF and
 * sent when sharing. A transit line number is exactly the kind of detail
 * that cannot be verified and changes in the real world, so it is removed
 * from the note unless it already appears in that destination's
 * gettingAround.
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
  // This fix was born from a mistake of mine: I reported "bus 29" as a
  // fabrication, but Bratislava's gettingAround explicitly says Devin is
  // reached by bus 29. This test exists so the sanitizer never deletes a
  // real detail from the catalog.
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

test('שעות ומשכי זמן אינם מספרי קווים - לא נוגעים בהם', () => {
  const raw = 'צ׳ק-אין ב-14:00, כ-3 שעות במקום';
  const out = sanitizeDayNote(raw, CITY);
  assert.equal(out.changed, false);
  assert.equal(out.note, raw);
});

/**
 * A deliberate change in this function's contract.
 *
 * Until now this test **protected** an "about 20 euros to enter" phrase
 * inside a day note, because the sanitizer was originally written to handle
 * transit line numbers only. A day note gets printed, sent when sharing and
 * re-read in the field - a price the model invented inside it reads like a
 * promise made by the site, so it is now cut just like in the reply itself.
 */
test('מחיר בתוך הערת יום נחתך - הערה היא לא פרוזה חולפת', () => {
  const out = sanitizeDayNote('הקתדרלה שווה ביקור, כ-20 יורו לכניסה', CITY);
  assert.equal(out.changed, true);
  assert.ok(!out.note.includes('20'));
  assert.ok(!out.note.includes('יורו'));
  assert.ok(out.note.includes('הקתדרלה שווה ביקור'));
});

test('מספר שכן מופיע ב-gettingAround של היעד נשאר - הוא מאומת בדאטה', () => {
  // Build the case from the real data: find a destination whose transit text contains a number
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
