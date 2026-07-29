/**
 * טסטים לעלות הטיול.
 *
 * שלושה דברים כאן אינם "בדיקת שפיות". הראשון הוא שעיר בלי נתון
 * **לא נעלמת מהסכום בשקט** - זה בדיוק הכשל שהופך מספר חלקי למספר
 * שקרי. השני הוא שטיול בשני מטבעות לא מסוכם למספר אחד. והשלישי הוא
 * שהמספרים בדאטה זהים למה שהמקור הדפיס, כולל השברים - טסט על הקטלוג
 * האמיתי, לא על פיקסצ׳ר.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currencyLabel,
  daysPerCity,
  formatRange,
  isTravelStyle,
  perDayRange,
  roundForDisplay,
  tripCost,
  type CostCity,
} from './cost.ts';
import { DAILY_COSTS } from '../../data/dailyCosts.ts';
import type { DailyCost } from '../types.ts';
import type { Trip } from './types.ts';

const cost = (currency: string, n: number): DailyCost => ({
  currency,
  budget: { transport: n, food: n * 2, activities: n },
  mid: { transport: n * 2, food: n * 4, activities: n * 2 },
  comfort: { transport: n * 4, food: n * 8, activities: n * 4 },
  source: { url: 'https://example.test/x', title: 'x', checked: '2026-07-29' },
});

const trip = (cities: string[]): Pick<Trip, 'days'> => ({
  days: cities.map((citySlug, i) => ({ id: `d${i}`, citySlug, placeIds: [] })),
});

const cities: Record<string, CostCity> = {
  rome: { name: 'רומא', dailyCost: cost('EUR', 10) },
  prague: { name: 'פראג', dailyCost: cost('CZK', 100) },
  dolomites: { name: 'הדולומיטים' }, // אין נתון - בכוונה
};

test('הטווח היומי: התחתון בלי כניסות, העליון איתן', () => {
  const c = cost('EUR', 10); // budget: 10 + 20 + 10
  assert.deepEqual(perDayRange(c, 'budget'), { low: 30, high: 40 });
  assert.deepEqual(perDayRange(c, 'mid'), { low: 60, high: 80 });
  assert.deepEqual(perDayRange(c, 'comfort'), { low: 120, high: 160 });
});

test('ימים נספרים לפי עיר, בסדר ההופעה, גם כשהעיר חוזרת', () => {
  assert.deepEqual(daysPerCity(trip(['rome', 'prague', 'rome'])), [
    { citySlug: 'rome', days: 2 },
    { citySlug: 'prague', days: 1 },
  ]);
  assert.deepEqual(daysPerCity(trip([])), []);
});

test('סכום פשוט: ימים כפול הטווח היומי', () => {
  const res = tripCost(trip(['rome', 'rome', 'rome']), 'mid', cities);
  assert.equal(res.lines.length, 1);
  assert.equal(res.lines[0].days, 3);
  assert.deepEqual(res.totals, [{ currency: 'EUR', low: 180, high: 240 }]);
  assert.equal(res.complete, true);
  assert.deepEqual(res.missing, []);
});

test('**עיר בלי נתון לא נופלת מהסכום בשקט**', () => {
  const res = tripCost(trip(['rome', 'dolomites', 'dolomites']), 'mid', cities);
  assert.equal(res.complete, false, 'הסכום חלקי');
  assert.deepEqual(res.missing, [{ citySlug: 'dolomites', cityName: 'הדולומיטים', days: 2 }]);
  // הסכום שכן מוצג הוא רק של רומא, ולא מתיימר להיות של הטיול
  assert.deepEqual(res.totals, [{ currency: 'EUR', low: 60, high: 80 }]);
  assert.equal(res.lines.length, 1, 'לדולומיטים אין שורה עם מספרים');
});

test('שני מטבעות לא מתחברים למספר אחד', () => {
  const res = tripCost(trip(['rome', 'prague']), 'budget', cities);
  assert.deepEqual(res.totals, [
    { currency: 'EUR', low: 30, high: 40 },
    { currency: 'CZK', low: 300, high: 400 },
  ]);
  assert.equal(res.complete, true, 'ריבוי מטבעות אינו חוסר נתונים');
});

test('טיול שאין בו אף עיר עם נתון אינו "שלם"', () => {
  const res = tripCost(trip(['dolomites']), 'mid', cities);
  assert.deepEqual(res.totals, []);
  assert.equal(res.complete, false);
  assert.equal(res.lines.length, 0);
});

test('עיר שלא נטענה עדיין מטופלת כחסרת נתון, לא כשגיאה', () => {
  const res = tripCost(trip(['atlantis']), 'mid', cities);
  assert.equal(res.missing[0].cityName, 'atlantis', 'בלי שם - מוצג ה-slug');
  assert.equal(res.complete, false);
});

test('עיגול לתצוגה גס יותר ככל שהמספר גדול', () => {
  assert.equal(roundForDisplay(30.09), 30);
  assert.equal(roundForDisplay(97.4), 97);
  assert.equal(roundForDisplay(114), 114, 'מתחת ל-1,000 נשאר ניתן לשחזור ביד');
  assert.equal(roundForDisplay(342), 342);
  assert.equal(roundForDisplay(1234), 1200);
  assert.equal(roundForDisplay(14708), 15000);
  assert.equal(roundForDisplay(0), 0);
  assert.equal(roundForDisplay(Number.NaN), 0);
});

test('תצוגת טווח: מטבע חד-תווי נצמד, קוד מטבע מופרד', () => {
  assert.equal(formatRange(30, 40, 'EUR'), '€30-€40');
  assert.equal(formatRange(1258, 3044, 'CZK'), '1,300 Kč-3,000 Kč');
  assert.equal(formatRange(30.1, 30.4, 'EUR'), '€30', 'שני הקצוות מתעגלים לאותו מספר');
  assert.equal(currencyLabel('XYZ'), 'XYZ', 'מטבע לא מוכר מוצג בקוד שלו');
});

test('ולידציה של סגנון הנסיעה', () => {
  for (const ok of ['budget', 'mid', 'comfort']) assert.ok(isTravelStyle(ok));
  for (const bad of ['low', 'luxury', '', null, undefined, 3]) assert.equal(isTravelStyle(bad), false);
});

// ---------- הדאטה עצמה ----------

test('כל רשומה בדאטה שלמה, עם מקור ותאריך תקין', () => {
  const entries = Object.entries(DAILY_COSTS);
  assert.ok(entries.length >= 20, 'הדאטה לא התרוקנה בטעות');
  for (const [slug, c] of entries) {
    assert.match(c.currency, /^[A-Z]{3}$/, slug);
    assert.match(c.source.checked, /^\d{4}-\d{2}-\d{2}$/, slug);
    assert.match(c.source.url, /^https:\/\//, slug);
    for (const style of ['budget', 'mid', 'comfort'] as const) {
      const t = c[style];
      for (const [k, v] of Object.entries(t)) {
        assert.ok(Number.isFinite(v) && v > 0, `${slug}.${style}.${k}`);
      }
      // סדר הגיוני בין הסגנונות נבדק למטה; כאן רק שהמספר קיים
    }
    assert.ok(
      c.budget.food < c.mid.food && c.mid.food < c.comfort.food,
      `${slug}: סגנון יקר יותר חייב לעלות יותר - הפרה כאן היא סימן לשורה שהועתקה מטור לא נכון`,
    );
  }
});

test('המספרים בדאטה הם בדיוק מה שהמקור הדפיס - כולל השברים', () => {
  // דגימה קשיחה: אם מישהו "יסדר" את 7.09 ל-7, הטסט נופל.
  assert.equal(DAILY_COSTS.vienna.budget.transport, 7.09);
  assert.equal(DAILY_COSTS.berlin.budget.activities, 8.78);
  assert.equal(DAILY_COSTS.lisbon.budget.activities, 9.34);
  assert.equal(DAILY_COSTS.tbilisi.budget.transport, 5.81);
  assert.equal(DAILY_COSTS.prague.mid.food, 1055);
  assert.equal(DAILY_COSTS.budapest.comfort.food, 41088);
  assert.equal(DAILY_COSTS.tokyo.mid.activities, 10487);
});

test('כל slug בדאטה הוא יעד אמיתי בקטלוג', async () => {
  // slug עם טעות כתיב לא מייצר שגיאה - הוא פשוט לא מוצג לעולם, וזה
  // הכשל השקט שהטסט הזה קיים בשבילו.
  const { destinations } = await import('../../data/destinations.ts');
  const known = new Set(destinations.map((d) => d.slug));
  for (const slug of Object.keys(DAILY_COSTS)) {
    assert.ok(known.has(slug), `${slug} אינו יעד בקטלוג`);
  }
});

test('הערים שנבדקו ונדחו אינן בדאטה', () => {
  // לקרקוב, בוקרשט וסופיה אין במקור טבלה מפולחת לפי סגנון נסיעה.
  // ממוצע יחיד אינו תשובה ל"כמה מוציא מטייל חסכוני", ולכן אין להן רשומה.
  for (const slug of ['krakow', 'bucharest', 'sofia']) {
    assert.equal(DAILY_COSTS[slug], undefined, slug);
  }
});
