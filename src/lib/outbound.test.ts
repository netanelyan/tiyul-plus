/**
 * קישורים יוצאים - **חמש טענות, וכולן על מה שאסור לקרות.**
 *
 * 1. קישור למקום נבנה מקואורדינטות, גם כשבדאטה כתוב שם.
 * 2. בלי קואורדינטות תקינות - `null`, לעולם לא ניחוש לפי שם.
 * 3. כתובת אמיתית של ספק חיצוני לא נדרסת ע"י מפה.
 * 4. `sponsored` מופיע רק כשיש באמת שיוך.
 * 5. אף רכיב לא מרנדר `externalUrl` בעצמו ועוקף את המודול.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mapsPointUrl, outboundAttrs, outboundTarget, placeMapUrl } from './outbound.ts';
import { destinations } from '../data/destinations.ts';

/* ---------- 1. קואורדינטות מנצחות שם ---------- */

test('**כתובת מבוססת-שם נדרסת ע"י הקואורדינטות**', () => {
  const url = placeMapUrl({
    lat: 48.2085,
    lng: 16.3721,
    externalUrl: 'https://maps.google.com/?q=St+Stephens+Cathedral+Vienna',
  });
  assert.equal(url, mapsPointUrl(48.2085, 16.3721));
  assert.ok(!url!.includes('Stephens'), 'השם לא שורד לתוך הכתובת');
});

test('גם הצורה הישנה של כתובת-קואורדינטות מנורמלת לצורה המתועדת', () => {
  const url = placeMapUrl({ lat: 38.4794, lng: 22.4936, externalUrl: 'https://maps.google.com/?q=38.4794,22.4936' });
  assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=38.479400,22.493600');
});

/*
 * הגרסה הקודמת נפלה כאן בחזרה לכתובת השמורה (שם-מבוסס) "כי חצי קישור
 * עדיף על כלום". זו בדיוק ההתנהגות שהוחלט לבטל: קישור שמנחית מישהו
 * ברחוב הלא נכון גרוע מהיעדר קישור, כי הוא נחווה כוודאות. עכשיו כל
 * אחד מהמקרים האלה מחזיר `null`, בלי יוצא מן הכלל.
 */
test('בלי קואורדינטות תקינות - null, לא כתובת-שם ישנה', () => {
  const namedGuess = 'https://maps.google.com/?q=Somewhere';
  assert.equal(placeMapUrl({ externalUrl: namedGuess }), null, 'אין קואורדינטות בכלל');
  assert.equal(placeMapUrl({ lat: NaN, lng: 3, externalUrl: namedGuess }), null, 'lat הוא NaN');
  assert.equal(placeMapUrl({ lat: 48.2, lng: NaN, externalUrl: namedGuess }), null, 'lng הוא NaN');
  assert.equal(placeMapUrl({ lat: 200, lng: 16, externalUrl: namedGuess }), null, 'lat מחוץ לטווח כדור הארץ');
  assert.equal(placeMapUrl({ lat: 48.2, lng: -400, externalUrl: namedGuess }), null, 'lng מחוץ לטווח כדור הארץ');
  assert.equal(placeMapUrl({}), null, 'לא נשלח כלום');
});

/* ---------- 2. דף אמיתי של ספק לא נדרס ---------- */

test('כתובת שאינה של גוגל שורדת, והתווית יודעת מה היא', () => {
  const wiki = 'https://he.wikipedia.org/wiki/%D7%9C%D7%99%D7%A1%D7%91%D7%95%D7%9F';
  assert.equal(placeMapUrl({ lat: 38.7, lng: -9.1, externalUrl: wiki }), wiki);
  assert.equal(outboundTarget(wiki), 'wikipedia');
  assert.equal(outboundTarget(mapsPointUrl(1, 2)), 'maps');
  assert.equal(outboundTarget(null), 'other');
});

/* ---------- 3. sponsored רק כשזו האמת ---------- */

test('`sponsored` רק על קישור משויך באמת', () => {
  assert.ok(!outboundAttrs().rel.includes('sponsored'));
  assert.ok(outboundAttrs({ affiliate: true }).rel.includes('sponsored'));
  // ותמיד ההגנות הבסיסיות
  for (const a of [outboundAttrs(), outboundAttrs({ affiliate: true })]) {
    assert.equal(a.target, '_blank');
    assert.ok(a.rel.includes('noopener'));
    assert.ok(a.rel.includes('nofollow'));
  }
});

/* ---------- 4. שומר המחלקה ---------- */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * הבאג שהמודול הזה נולד בשבילו הוא שלושה רכיבים שרנדרו `externalUrl`
 * ישירות, ולכן ירשו את 725 הקישורים מבוססי-השם. הטסט מוודא שאיש לא
 * חוזר לשם: `href` שמקבל `externalUrl` בלי לעבור דרך `placeMapUrl`
 * הוא בדיוק החזרה של הבאג.
 */
test('אף רכיב לא מרנדר externalUrl ישירות אל href', () => {
  const bad: string[] = [];
  for (const file of walk('src')) {
    if (!/\.tsx$/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    for (const line of src.split('\n')) {
      if (/href=\{[^}]*externalUrl/.test(line) && !line.includes('placeMapUrl')) {
        bad.push(`${file}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(bad, [], `יש לעבור דרך placeMapUrl:\n${bad.join('\n')}`);
});

/* ---------- הקטלוג האמיתי ---------- */

const COORD_QUERY = /[?&]query=-?\d+\.\d+,-?\d+\.\d+$/;

/**
 * **הטסט שהמשימה הזאת ביקשה במפורש: נכשל אם מקום כלשהו מפיק קישור
 * מבוסס-שם.** זו טענה ארכיטקטונית קבועה, לא תמונת מצב של הדאטה של
 * היום - `placeMapUrl` אסור לה להחזיר `maps.google.com/?q=<שם>` בשום
 * מצב, גם אם מחר מישהו יוסיף מקום עם כתובת שמורה כזאת ובלי קואורדינטות.
 */
test('אף מקום בקטלוג לא מפיק קישור מבוסס-שם', () => {
  const byName: string[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      const url = placeMapUrl(p);
      if (url && isGoogleMapsHref(url) && !COORD_QUERY.test(url)) byName.push(`${d.slug}/${p.id} → ${url}`);
    }
  }
  assert.deepEqual(byName, [], `${byName.length} מקומות עדיין מפיקים קישור מבוסס-שם:\n${byName.join('\n')}`);
});

function isGoogleMapsHref(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'maps.google.com' || h === 'google.com' || h === 'www.google.com' || h.endsWith('.google.com');
  } catch {
    return false;
  }
}

/**
 * מצב הדאטה של היום: **כל** מקום בקטלוג מקבל קישור לפי נקודה - אף אחד
 * לא נופל ל-`null` בהיעדר מיקום. בניגוד לטסט הקודם, זו כן תמונת מצב
 * של הדאטה: אם היא תיכשל, המשמעות היא שמקום חדש נוסף בלי קואורדינטות
 * תקינות, וזה שווה בדיקה ידנית - לא בהכרח באג בקוד.
 */
test('כל מקום בקטלוג מקבל קישור מבוסס-קואורדינטות (אף null)', () => {
  let total = 0;
  const missing: string[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      total++;
      const url = placeMapUrl(p);
      if (!url || !COORD_QUERY.test(url)) missing.push(`${d.slug}/${p.id} → ${url}`);
    }
  }
  assert.ok(total > 1500, `נבדקו ${total} מקומות`);
  assert.deepEqual(missing.slice(0, 5), [], `${missing.length} מקומות בלי קישור מבוסס-קואורדינטות`);
});
