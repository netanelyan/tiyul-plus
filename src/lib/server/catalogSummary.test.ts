/**
 * This test protects one property: **the answer's length does not grow with
 * the catalog**.
 *
 * The previous code did `countries.map(c => c.name).join(' · ')`, i.e. every
 * data expansion lengthened a message a real traveler reads. The data session
 * adds countries every hour, so this is exactly the kind of regression nobody
 * notices in a commit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverageLine, MAX_EXAMPLES } from './catalogSummary.ts';
import { countries } from '../../data/countries.ts';

const names = (n: number) => Array.from({ length: n }, (_, i) => `מדינה${i + 1}`);
const map = (list: string[]) => Object.fromEntries(list.map((n, i) => [`s${i}`, n]));

test('קטלוג גדול: מספר ודוגמאות ספורות, לא רשימה', () => {
  const all = names(70);
  const line = coverageLine(all, map(all));
  assert.match(line, /70 מדינות/);
  // Only MAX_EXAMPLES are mentioned by name - the rest do not appear at all
  const mentioned = all.filter((n) => line.includes(n));
  assert.equal(mentioned.length, MAX_EXAMPLES);
  assert.ok(!line.includes('מדינה70'), 'המדינה האחרונה לא אמורה להופיע');
});

test('האורך לא גדל עם הקטלוג - זה כל הטעם', () => {
  const small = names(20);
  const huge = names(400);
  assert.equal(coverageLine(small, map(small)).length - String(20).length, coverageLine(huge, map(huge)).length - String(400).length);
});

test('קטלוג קטן: פשוט מונים אותן, בלי "ועוד" מטעה', () => {
  const all = names(3);
  const line = coverageLine(all, map(all));
  assert.ok(!line.includes('ועוד'), 'אין עוד מדינות, אז אסור להבטיח עוד');
  for (const n of all) assert.ok(line.includes(n));
});

test('הדוגמאות המועדפות נבחרות לפי slug, לא לפי סדר הקובץ', () => {
  const all = [...names(60), 'איטליה', 'יפן'];
  const line = coverageLine(all, { ...map(names(60)), italy: 'איטליה', japan: 'יפן' });
  assert.ok(line.includes('איטליה') && line.includes('יפן'));
});

test('מדינה מועדפת שאינה בדאטה לא מומצאת', () => {
  const all = names(60);
  const line = coverageLine(all, map(all));
  assert.ok(!line.includes('יפן'), 'אין יפן במיפוי, אז אין להזכיר אותה');
});

test('דאטה ריקה לא מייצרת משפט שבור', () => {
  assert.equal(coverageLine([], {}), 'הקטלוג בהרחבה כרגע.');
});

test('מול הדאטה האמיתית: המשפט נשאר קצר', () => {
  const line = coverageLine(
    countries.map((c) => c.name),
    Object.fromEntries(countries.map((c) => [c.slug, c.name])),
  );
  // 200 characters is already a long sentence in Hebrew; the previous version passed 700
  assert.ok(line.length < 200, `המשפט ארוך מדי (${line.length} תווים): ${line}`);
  assert.match(line, new RegExp(String(countries.length)));
});
