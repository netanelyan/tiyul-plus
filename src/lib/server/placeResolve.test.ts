import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import {
  cityGate,
  editDistance,
  normalizeName,
  resolveMessage,
  resolveToken,
  verdictBlock,
} from './placeResolve';

/**
 * The tests run against **the real catalog** and not against a fixture, because what is claimed
 * here is exactly "against our 166 destinations, what happens to this word". A three-city fixture
 * would prove the algorithm and not the product.
 */

test('normalizeName: אותיות סופיות, מרכאות וניקוד לא משנים התאמה', () => {
  assert.equal(normalizeName('ירושלים'), normalizeName('ירושלים'));
  assert.equal(normalizeName('סופ״ש'), 'סופש');
  assert.equal(normalizeName('  וינה  '), 'וינה');
  assert.equal(normalizeName('פוג׳י'), 'פוגי');
});

test('editDistance סופר החלפת שכנים כשגיאה אחת', () => {
  assert.equal(editDistance('אבג', 'אבג'), 0);
  assert.equal(editDistance('אבג', 'אגב'), 1); // transposition
  assert.equal(editDistance('רומה', 'רומא'), 1);
});

test('המקרה שדווח: ברסלוונה נפתרת לברצלונה, לא לברטיסלבה', () => {
  const v = resolveToken('ברסלוונה');
  assert.ok(v, 'חייב להיות פסק');
  assert.equal(v.kind, 'one');
  assert.equal(v.options[0].slug, 'barcelona');
});

test('שם ששקול לשני יעדים מוחזר כ-many, בלי לבחור', () => {
  const v = resolveToken('ויאנה');
  assert.ok(v);
  assert.equal(v.kind, 'many');
  const slugs = v.options.map((o) => o.slug).sort();
  assert.deepEqual(slugs, ['vienna', 'vilnius']);
});

test('עיר שאיננה בקטלוג ואינה קרובה לכלום לא מקבלת פסק - לא בוחרים לה תחליף', () => {
  assert.equal(resolveToken('קייב'), null);
  assert.equal(resolveMessage('תבנה לי 4 ימים בקייב').length, 0);
});

test('שם מדויק מהקטלוג לא מקבל פסק, גם עם אותיות שימוש', () => {
  for (const t of ['ברצלונה', 'בברצלונה', 'לוינה', 'מפראג', 'ובוינה', 'ביפן', 'טוקיו']) {
    assert.equal(resolveToken(t), null, `${t} לא אמור לקבל פסק`);
  }
});

test('אף שם אמיתי בקטלוג, עם אותיות שימוש, לא מייצר פסק', () => {
  let noisy: string[] = [];
  for (const d of destinations) {
    for (const p of ['', 'ב', 'ל', 'מ', 'ול', 'וב']) {
      if (resolveMessage(`טיול ${p}${d.name}`).length > 0) noisy.push(p + d.name);
    }
  }
  for (const c of countries) {
    for (const p of ['', 'ב', 'ל']) {
      if (resolveMessage(`טסים ${p}${c.name}`).length > 0) noisy.push(p + c.name);
    }
  }
  assert.deepEqual(noisy, [], 'שם אמיתי שמייצר פסק הוא רעש שיחסום בנייה תקינה');
});

/**
 * This test is the reason the tolerance is derived from the shorter of the two and from "one
 * error per four letters". In the version without them, "recommendation" fell on Malta and
 * "romantic" on Romania.
 */
test('משפטי עברית רגילים אינם מייצרים פסק', () => {
  const ordinary = [
    'תבנה לי טיול של שבוע עם הילדים, תקציב בינוני, אוכל טוב והרבה טבע',
    'אפשר להוסיף המלצה למסעדה כשרה ליד המלון',
    'אנחנו אוהבים אוכל איטלקי ויין, ורוצים משהו רומנטי',
    'האם צריך ויזה ומה עם כרטיס סים מקומי',
    'הטיסה שלנו נוחתת בשבע בבוקר ויוצאת בעשר בלילה',
    'הבן שלי בן שתים עשרה אוהב היסטוריה, הבת בת שמונה אוהבת חיות',
    'תזיז את היום השני להיות ראשון ותעדכן את התאריכים',
  ];
  for (const s of ordinary) {
    assert.deepEqual(resolveMessage(s), [], `רעש על: ${s}`);
  }
});

/* ---------- The gate ---------- */

test('השער חוסם בחירה של יעד אחר מזה שהמילה נפתרת אליו', () => {
  const g = cityGate('סופש בברסלוונה', ['bratislava']);
  assert.equal(g.ok, false);
  assert.ok(g.ok === false && g.message.includes('ברצלונה'));
});

test('השער מאשר את היעד הנכון ומחזיר משפט שהמודל חייב לומר', () => {
  const g = cityGate('סופש בברסלוונה', ['barcelona']);
  assert.equal(g.ok, true);
  assert.ok(g.ok === true && g.note.includes('ברצלונה'));
});

test('בשם דו-משמעי השער חוסם את **שתי** האפשרויות', () => {
  for (const slug of ['vienna', 'vilnius']) {
    const g = cityGate('תבנה לי טיול לויאנה', [slug]);
    assert.equal(g.ok, false, `${slug} היה אמור להיחסם`);
    assert.ok(g.ok === false && g.message.includes('אסור לבחור'));
  }
});

test('הודעה שנוקבת בשם מהקטלוג עוברת בלי בדיקה - ולכן פסק רועש לא חוסם', () => {
  assert.deepEqual(cityGate('תבנה לי שבוע ברומא', ['rome']), { ok: true, note: '' });
  assert.deepEqual(cityGate('ברצלונה, לא ברטיסלבה', ['barcelona']), { ok: true, note: '' });
});

test('כלי בלי בחירת עיר לא נבדק כלל', () => {
  assert.deepEqual(cityGate('סופש בברסלוונה', []), { ok: true, note: '' });
});

test('הבלוק למודל אומר "אל תבחר" רק במצב many', () => {
  const many = verdictBlock(resolveMessage('טיול לויאנה'));
  assert.ok(many.includes('אסור לבחור'));
  const one = verdictBlock(resolveMessage('טיול לברסלוונה'));
  assert.ok(one.includes('ברצלונה'));
  assert.ok(!one.includes('אסור לבחור'));
  assert.equal(verdictBlock([]), '');
});
