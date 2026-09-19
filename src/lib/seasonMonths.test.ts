import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestMonthsOf, recommendationSegment } from '@/lib/seasonMonths';
import { destinations } from '@/data/destinations';

/* ---------- the regression this file exists to prevent ---------- */

test('חודש שמוזכר כאזהרה לא נספר כחודש מומלץ', () => {
  /*
    Athens: "March-June, September-November (July-August very hot)". A parse
    that takes every month named would recommend exactly the two months the
    sentence warns about. 97 of the 166 sentences carry a caution like this, so
    this is the common case and not an edge.
  */
  const athens = bestMonthsOf('מרץ-יוני, ספטמבר-נובמבר (יולי-אוגוסט חם מאוד)');
  assert.deepEqual(athens, [3, 4, 5, 6, 9, 10, 11]);
  assert.ok(!athens.includes(7) && !athens.includes(8), 'July/August leaked in from the warning');

  // The same shape after a dash and after a full stop, which is how the other
  // two thirds of the cautions are written.
  assert.deepEqual(
    bestMonthsOf('נובמבר-פברואר (עונה יבשה) - מרץ-מאי חם ולח מאוד, יוני-אוקטובר עונת המונסון'),
    [1, 2, 11, 12],
  );
  assert.deepEqual(bestMonthsOf('נובמבר עד מרץ. בקיץ החום קיצוני ואתרים נסגרים.'), [1, 2, 3, 11, 12]);
});

test('טווח שעובר את סוף השנה נפתח נכון', () => {
  assert.deepEqual(bestMonthsOf('נובמבר-מרץ'), [1, 2, 3, 11, 12]);
  assert.deepEqual(bestMonthsOf('דצמבר-ינואר'), [1, 12]);
});

test('פסיק הוא רשימה, מקף הוא טווח - וזה כל ההבדל', () => {
  // "March, September" is two months. Reading the comma as a span would give
  // seven, including the summer a sentence like this usually warns about.
  assert.deepEqual(bestMonthsOf('מרץ, ספטמבר'), [3, 9]);
  assert.deepEqual(bestMonthsOf('מרץ-ספטמבר'), [3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(bestMonthsOf('מרץ עד ספטמבר'), [3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(bestMonthsOf('אפריל ומאי'), [4, 5]);
});

test('משפט בלי חודשים מחזיר ריק ולא ניחוש', () => {
  assert.deepEqual(bestMonthsOf(''), []);
  assert.deepEqual(bestMonthsOf(undefined), []);
  assert.deepEqual(bestMonthsOf('כל השנה, תלוי במה מחפשים'), []);
});

test('הקטע הממליץ נחתך לפני כל הסתייגות', () => {
  assert.equal(recommendationSegment('מאי-ספטמבר'), 'מאי-ספטמבר');
  assert.equal(recommendationSegment('מרץ-מאי (הקיץ חם)'), 'מרץ-מאי');
  assert.equal(recommendationSegment('מרץ-מאי - יולי חם מאוד'), 'מרץ-מאי');
  // A hyphen inside a range has no spaces around it and must survive the cut.
  assert.ok(recommendationSegment('אפריל-יוני, ספטמבר-אוקטובר').includes('ספטמבר'));
});

/* ---------- against the real catalog ---------- */

test('רוב הקטלוג מקבל חודשים, ואף חודש לא נספר לכל היעדים', () => {
  const withMonths = destinations.filter((d) => bestMonthsOf(d.bestSeason).length > 0);
  assert.ok(
    withMonths.length > destinations.length * 0.8,
    `${withMonths.length} of ${destinations.length} parsed - the sentences changed shape`,
  );

  // A month that every destination claims is a month that filters nothing. The
  // real distribution peaks in May/June/September and dips in midwinter; if any
  // month reached everything, the cut would have stopped working.
  for (let m = 1; m <= 12; m++) {
    const n = destinations.filter((d) => bestMonthsOf(d.bestSeason).includes(m)).length;
    assert.ok(n < destinations.length * 0.85, `month ${m} is claimed by ${n} destinations`);
  }
});

test('אף יעד לא מקבל את כל שנים-עשר החודשים מתוך משפט שיש בו אזהרה', () => {
  for (const d of destinations) {
    if (!d.bestSeason || !/[(.]| [-–—] /.test(d.bestSeason)) continue;
    const months = bestMonthsOf(d.bestSeason);
    assert.ok(months.length < 12, `${d.slug}: a sentence with a caution yielded all 12 months`);
  }
});
