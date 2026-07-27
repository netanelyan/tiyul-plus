/**
 * הטסט הזה מגן על תכונה אחת: **אורך התשובה לא גדל עם הקטלוג**.
 *
 * הקוד הקודם עשה `countries.map(c => c.name).join(' · ')`, כלומר כל
 * הרחבה של הדאטה האריכה הודעה שמטייל אמיתי קורא. סשן הדאטה מוסיף מדינות
 * כל שעה, ולכן זה בדיוק סוג הרגרסיה שאף אחד לא שם לב אליה בקומיט.
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
  // רק MAX_EXAMPLES מוזכרות בשם - השאר לא מופיעות בכלל
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
  // 200 תווים הם כבר משפט ארוך בעברית; הגרסה הקודמת עברה 700
  assert.ok(line.length < 200, `המשפט ארוך מדי (${line.length} תווים): ${line}`);
  assert.match(line, new RegExp(String(countries.length)));
});
