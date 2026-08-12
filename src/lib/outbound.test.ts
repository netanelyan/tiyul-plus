/**
 * קישורים יוצאים - **ארבע טענות, וכולן על מה שאסור לקרות.**
 *
 * 1. קישור למקום נבנה מקואורדינטות, גם כשבדאטה כתוב שם.
 * 2. כתובת אמיתית של ספק חיצוני לא נדרסת ע"י מפה.
 * 3. `sponsored` מופיע רק כשיש באמת שיוך.
 * 4. אף רכיב לא מרנדר `externalUrl` בעצמו ועוקף את המודול.
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

test('בלי קואורדינטות תקינות נשמר מה שהיה - חצי קישור עדיף על כלום', () => {
  const stored = 'https://maps.google.com/?q=Somewhere';
  assert.equal(placeMapUrl({ externalUrl: stored }), stored);
  assert.equal(placeMapUrl({ lat: NaN, lng: 3, externalUrl: stored }), stored);
  assert.equal(placeMapUrl({}), null);
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

/**
 * הטענה במספרים: אחרי השינוי **כל** מקום בקטלוג מקבל קישור לפי נקודה.
 * לפני כן 725 מתוך 1,814 היו לפי שם.
 */
test('כל מקום בקטלוג מקבל קישור מבוסס-קואורדינטות', () => {
  let total = 0;
  const byName: string[] = [];
  for (const d of destinations) {
    for (const p of d.places ?? []) {
      total++;
      const url = placeMapUrl(p);
      if (!url || !/[?&]query=-?\d+\.\d+,-?\d+\.\d+$/.test(url)) byName.push(`${d.slug}/${p.id} → ${url}`);
    }
  }
  assert.ok(total > 1500, `נבדקו ${total} מקומות`);
  assert.deepEqual(byName.slice(0, 5), [], `${byName.length} מקומות עדיין לא לפי נקודה`);
});
