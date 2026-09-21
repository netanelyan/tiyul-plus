/**
 * The reordering the OG cards depend on.
 *
 * Every expectation here is the VISUAL string - what the glyphs should read
 * left to right once drawn. It is derived by hand rather than from the
 * implementation, which is the only thing that makes these tests worth having:
 * a test written from the output would pass on a mirrored card.
 *
 * The visual comparison against Chrome is the other half of the proof and
 * cannot live in a unit test; it is recorded in the session log.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasUnsupportedRtl, looksRtl, toVisualOrder } from './bidi.ts';

test('a Hebrew word is drawn with its last letter leftmost', () => {
  // The final mem is the word's last letter, so it is the leftmost glyph -
  // a final-form letter is a free correctness oracle for Hebrew ordering.
  assert.equal(toVisualOrder('שלום'), 'םולש');
});

test('word order reverses as well as letter order', () => {
  assert.equal(toVisualOrder('טיול משותף'), 'ףתושמ לויט');
});

test('a number keeps its own direction inside a right-to-left line', () => {
  // The digit sits at the right-hand end and the word runs leftwards from it.
  assert.equal(toVisualOrder('6 ימים'), 'םימי 6');
});

test('a multi-digit number is not reversed', () => {
  assert.equal(toVisualOrder('22 עצירות'), 'תוריצע 22');
  assert.ok(toVisualOrder('1948 שנה').includes('1948'));
});

/*
  The case that killed the first implementation. A run-level pass emitted "1+",
  because it treated the plus as an ordinary neutral; UBA's ET rule binds it to
  the number, so the pair travels together and reads "+1".
*/
test('a sign binds to its number rather than drifting off it', () => {
  assert.equal(toVisualOrder('וינה +1'), '+1 הניו');
  assert.ok(toVisualOrder('הנחה 50%').includes('50%'));
});

test('a decimal or a time is not split at its separator', () => {
  assert.ok(toVisualOrder('מחיר 19.90 שקל').includes('19.90'));
  assert.ok(toVisualOrder('יציאה 12:30 בצהריים').includes('12:30'));
});

test('Latin inside a Hebrew line stays readable', () => {
  const out = toVisualOrder('טיול ל-Rome');
  assert.ok(out.includes('Rome'), out);
  assert.ok(!out.includes('emoR'), out);
});

test('a line with no Hebrew is returned untouched', () => {
  assert.equal(toVisualOrder('Rome and Venice 2026'), 'Rome and Venice 2026');
  assert.equal(toVisualOrder(''), '');
});

test('reordering is its own inverse for a plain Hebrew line', () => {
  // Not a property of the algorithm in general - it is here as a cheap check
  // that nothing is lost or duplicated in the level passes.
  for (const s of ['שלום עולם', 'טיול משפחתי לאיטליה', 'ירושלים תל אביב חיפה']) {
    assert.equal(toVisualOrder(toVisualOrder(s)), s);
  }
});

test('every character survives, whatever the mix', () => {
  const samples = [
    'איטליה ואוסטריה בקיץ',
    '6 ימים · 22 עצירות · רומא · ונציה · וינה +1',
    'Trip 2026 עם הילדים',
    'טיול (עם הכלב) בצפון',
  ];
  for (const s of samples) {
    const out = toVisualOrder(s);
    assert.equal(out.length, s.length, s);
    assert.deepEqual([...out].sort().join(''), [...s].sort().join(''), s);
  }
});

test('brackets are mirrored so they still enclose', () => {
  const out = toVisualOrder('טיול (עם הכלב) בצפון');
  // The opening bracket in logical order becomes the closing glyph on the left.
  assert.ok(out.includes('(') && out.includes(')'), out);
  assert.ok(out.indexOf('(') < out.indexOf(')'), out);
});

test('looksRtl and hasUnsupportedRtl answer honestly', () => {
  assert.equal(looksRtl('טיול'), true);
  assert.equal(looksRtl('Rome'), false);
  assert.equal(hasUnsupportedRtl('رحلة'), true);
  assert.equal(hasUnsupportedRtl('טיול'), false);
});
