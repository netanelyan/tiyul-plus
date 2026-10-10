/**
 * Seven cities in the catalog start with the letter vav, and one of them is
 * Vienna. This test runs against the real data and not against a list I
 * wrote - a new city that enters will check itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { DEFINITE_FIRST_WORDS, NOT_DEFINITE_FIRST_WORDS, hePrefix, inHe } from './hebrew.ts';

test('אות שימוש מכפילה וי"ו בתחילת שם', () => {
  assert.equal(inHe('וינה'), 'בווינה');
  assert.equal(inHe('ונציה'), 'בוונציה');
  assert.equal(hePrefix('מ', 'ורשה'), 'מוורשה');
  assert.equal(hePrefix('ל', 'וילנה'), 'לווילנה');
});

test('שם רגיל לא משתנה', () => {
  assert.equal(inHe('ברטיסלבה'), 'בברטיסלבה');
  assert.equal(inHe('רומא'), 'ברומא');
  assert.equal(hePrefix('מ', 'פראג'), 'מפראג');
});

test('שם שכבר פותח בשתי ווים לא מקבל שלישית', () => {
  assert.equal(inHe('וויוודינה'), 'בוויוודינה');
});

test('שם ריק מחזיר ריק ולא אות בודדת', () => {
  assert.equal(inHe(''), '');
  assert.equal(inHe('   '), '');
});

test('כל שם בקטלוג שמתחיל בוי"ו מקבל הכפלה', () => {
  const names = [
    ...destinations.map((d) => d.name),
    ...countries.map((c) => c.name),
  ].filter((n) => n.startsWith('ו') && !n.startsWith('וו'));
  assert.ok(names.length > 0, 'אין שמות כאלה - הטסט מאבד משמעות');
  for (const n of names) {
    assert.equal(inHe(n), `בו${n}`, n);
    assert.ok(!inHe(n).startsWith('בו' + n[1]), `${n}: לא הוכפל`);
  }
});

test('אף שם בקטלוג לא מקבל הכפלה מיותרת', () => {
  for (const n of destinations.map((d) => d.name)) {
    if (n.startsWith('ו')) continue;
    if (DEFINITE_FIRST_WORDS.has(n.split(' ')[0])) continue;
    assert.equal(inHe(n), `ב${n}`, n);
  }
});

test('ה׳ הידיעה נבלעת אחרי ב/ל/כ ונשארת אחרי מ/ו/ש', () => {
  assert.equal(hePrefix('ל', 'הדולומיטים'), 'לדולומיטים');
  assert.equal(inHe('הגליל והכנרת'), 'בגליל והכנרת');
  assert.equal(hePrefix('ל', 'הפיליפינים'), 'לפיליפינים');
  assert.equal(hePrefix('מ', 'הדולומיטים'), 'מהדולומיטים');
  assert.equal(hePrefix('ו', 'הדולומיטים'), 'והדולומיטים');
});

test('ה׳ שהיא חלק מהשם לא נבלעת', () => {
  assert.equal(hePrefix('ל', 'הונגריה'), 'להונגריה');
  assert.equal(hePrefix('ל', 'הרי הטטרה הגבוהים'), 'להרי הטטרה הגבוהים');
  assert.equal(inHe('האנוי ומפרץ הא לונג'), 'בהאנוי ומפרץ הא לונג');
});

test('כל שם בקטלוג שפותח בה׳ מסווג: ה׳ הידיעה או חלק מהשם', () => {
  const unclassified = [
    ...destinations.map((d) => d.name),
    ...countries.map((c) => c.name),
  ]
    .filter((n) => n.startsWith('ה'))
    .map((n) => n.split(' ')[0])
    .filter((w) => !DEFINITE_FIRST_WORDS.has(w) && !NOT_DEFINITE_FIRST_WORDS.has(w));
  assert.deepEqual(
    unclassified,
    [],
    `classify these first words in src/lib/hebrew.ts: ${unclassified.join(', ')}`,
  );
});
