/**
 * שבע ערים בקטלוג מתחילות בוי"ו, ואחת מהן היא וינה. הטסט הזה רץ מול
 * הדאטה האמיתי ולא מול רשימה שכתבתי - עיר חדשה שתיכנס תיבדק מעצמה.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { hePrefix, inHe } from './hebrew.ts';

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
    assert.equal(inHe(n), `ב${n}`, n);
  }
});
