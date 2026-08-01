/**
 * Viator - **ארבע טענות, וכולן על מה שאסור לקרות.**
 *
 * 1. קישור בלי מזהה שותף = אין קישור, ואין כרטיס. זה כל מה שאנחנו
 *    מרוויחים ממנו, ולכן זה מה שנבדק ראשון.
 * 2. שום מספר ושום שם לא נוצרים אצלנו - מוצר חסר נזרק ולא מושלם.
 * 3. דאטת sandbox לא יכולה להגיע לדומיין החי, ולא יכולה להגיע בלי סימון.
 * 4. שום דבר מ-Viator לא נכנס לקטלוג או לטיול.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { browserGetOk } from './chatGuards.ts';
import {
  affiliateUrl,
  attribution,
  matchDestination,
  sandboxBlocked,
  toOffer,
  viatorMode,
  type Attribution,
} from './viator.ts';

const ATTR: Attribution = { pid: 'P00049694', mcid: '42383', medium: 'api', campaign: 'trip-panel' };
const URL_OK = 'https://www.viator.com/tours/Rome/Colosseum/d511-1234ABC';

/* ---------- 1. השיוך ---------- */

test('הקישור נושא את כל ארבעת הפרמטרים', () => {
  const u = new URL(affiliateUrl(URL_OK, ATTR)!);
  assert.equal(u.searchParams.get('pid'), 'P00049694');
  assert.equal(u.searchParams.get('mcid'), '42383');
  assert.equal(u.searchParams.get('medium'), 'api');
  assert.equal(u.searchParams.get('campaign'), 'trip-panel');
  assert.equal(u.origin + u.pathname, URL_OK, 'הנתיב עצמו לא שונה');
});

test('**בלי שיוך אין קישור בכלל** - לא שולחים תנועה בחינם', () => {
  assert.equal(affiliateUrl(URL_OK, null), null);
});

test('pid שכבר קיים בכתובת שלהם נדרס בשלנו', () => {
  const u = new URL(affiliateUrl(`${URL_OK}?pid=SOMEONE-ELSE&ref=x`, ATTR)!);
  assert.equal(u.searchParams.get('pid'), 'P00049694');
  assert.equal(u.searchParams.getAll('pid').length, 1);
  assert.equal(u.searchParams.get('ref'), 'x', 'פרמטר שלהם לא נמחק');
});

test('רק כתובות של viator, ורק https', () => {
  assert.equal(affiliateUrl('https://evil.example.com/x', ATTR), null);
  assert.equal(affiliateUrl('https://viator.com.evil.example/x', ATTR), null);
  assert.equal(affiliateUrl('http://www.viator.com/x', ATTR), null);
  assert.equal(affiliateUrl('not a url', ATTR), null);
  assert.ok(affiliateUrl('https://viator.com/x', ATTR));
  assert.ok(affiliateUrl('https://www.viator.com/x', ATTR));
});

test('מזהה עם תו לא חוקי נדחה - התיעוד שלהם אומר שזה שובר שיוך', () => {
  const bad = ['P0004 9694', 'P0004_9694', 'pid&x=1', '', 'a'.repeat(65)];
  for (const pid of bad) {
    process.env.VIATOR_PARTNER_ID = pid;
    process.env.VIATOR_MCID = '42383';
    assert.equal(attribution(), null, pid);
  }
  process.env.VIATOR_PARTNER_ID = 'P00049694';
  assert.ok(attribution());
  delete process.env.VIATOR_PARTNER_ID;
  delete process.env.VIATOR_MCID;
});

/* ---------- 2. שום דבר לא מומצא ---------- */

const RAW = {
  productCode: '1234ABC',
  title: 'Skip-the-Line Colosseum Tour',
  productUrl: URL_OK,
  pricing: { summary: { fromPrice: 62.5 }, currency: 'USD' },
  reviews: { combinedAverageRating: 4.7, totalReviews: 8123 },
  duration: { fixedDurationInMinutes: 180 },
  images: [{ variants: [{ url: 'https://media.viator.com/a.jpg', width: 480, height: 320 }] }],
};

test('מוצר תקין ממופה בדיוק כפי שהתקבל', () => {
  const o = toOffer(RAW, ATTR, false)!;
  assert.equal(o.title, 'Skip-the-Line Colosseum Tour');
  assert.equal(o.fromPrice, 62.5);
  assert.equal(o.currency, 'USD');
  assert.equal(o.rating, 4.7);
  assert.equal(o.reviews, 8123);
  assert.equal(o.durationMinutes, 180);
  assert.equal(o.sandbox, false);
});

test('חסר כותרת, קישור או מחיר => המוצר נזרק ולא מושלם', () => {
  for (const patch of [
    { title: '' },
    { title: undefined },
    { productUrl: undefined, webURL: undefined },
    { pricing: undefined },
    { pricing: { summary: {}, currency: 'USD' } },
    { pricing: { summary: { fromPrice: 62.5 } } }, // מחיר בלי מטבע הוא מחיר מטעה
    { productCode: undefined },
  ] as Record<string, unknown>[]) {
    assert.equal(toOffer({ ...RAW, ...patch }, ATTR, false), null, JSON.stringify(patch));
  }
});

test('שדות שהם לא החזירו נשארים null, לא אפס ולא ברירת מחדל', () => {
  const o = toOffer({ ...RAW, reviews: undefined, duration: undefined, images: [] }, ATTR, false)!;
  assert.equal(o.rating, null);
  assert.equal(o.reviews, null);
  assert.equal(o.durationMinutes, null);
  assert.equal(o.image, null);
});

test('תמונה נלקחת רק מ-variant עם כתובת https אמיתית', () => {
  assert.equal(toOffer({ ...RAW, images: [{ variants: [{ url: 'http://x/a.jpg', width: 100 }] }] }, ATTR, false)?.image, null);
  assert.equal(toOffer({ ...RAW, images: 'nope' }, ATTR, false)?.image, null);
});

test('בלי שיוך גם מוצר מושלם לא מייצר כרטיס', () => {
  assert.equal(toOffer(RAW, null, false), null);
});

/* ---------- 3. הכלה של sandbox ---------- */

test('sandbox חסום על הדומיין החי, ופתוח בכל מקום אחר', () => {
  for (const host of ['tiyulplus.com', 'www.tiyulplus.com', 'TIYULPLUS.COM', 'tiyulplus.com:443']) {
    assert.equal(sandboxBlocked(host, 'sandbox'), true, host);
  }
  for (const host of ['localhost:3000', 'tiyul-plus-git-x.vercel.app', null]) {
    assert.equal(sandboxBlocked(host, 'sandbox'), false, String(host));
  }
  // בפרודקשן אין מה לחסום - הדאטה אמיתית
  assert.equal(sandboxBlocked('tiyulplus.com', 'production'), false);
});

test('כל פריט מ-sandbox נושא את הסימון איתו', () => {
  assert.equal(toOffer(RAW, ATTR, true)?.sandbox, true);
});

test('**המפתח החי לא נכנס לשימוש עד שאומרים במפורש**', () => {
  const saved = { ...process.env };
  process.env.VIATOR_API_KEY = 'live-key';
  process.env.VIATOR_API_KEY_SANDBOX = 'sandbox-key';

  delete process.env.VIATOR_MODE;
  assert.equal(viatorMode(), 'sandbox', 'ברירת המחדל היא sandbox גם כשיש מפתח חי');

  process.env.VIATOR_MODE = 'production';
  assert.equal(viatorMode(), 'production', 'רק אמירה מפורשת מפעילה אותו');

  process.env.VIATOR_MODE = 'off';
  assert.equal(viatorMode(), 'off');

  // production בלי מפתח חי = כבוי, לא נפילה חזרה ל-sandbox בשקט
  process.env.VIATOR_MODE = 'production';
  delete process.env.VIATOR_API_KEY;
  assert.equal(viatorMode(), 'off');

  process.env = saved;
});

/* ---------- 4. שום דבר לא נשמר אצלנו ---------- */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * שומר המחלקה. התוכן של Viator הוא שלהם והוא מתיישן, ולכן הוא לא הופך
 * לשורה בקטלוג ולא לשדה על טיול. הבדיקה סורקת את שתי התיקיות שבהן זה
 * היה קורה אם מישהו ינסה.
 */
test('viator לא מופיע בקטלוג ולא בדומיין של הטיול', () => {
  for (const dir of ['src/data', 'src/lib/trip']) {
    for (const file of walk(dir)) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const src = readFileSync(file, 'utf8').toLowerCase();
      assert.ok(!src.includes('viator'), `${file} מזכיר את viator - התוכן שלהם לא נשמר אצלנו`);
    }
  }
});

test('המפתח לא יכול להגיע לדפדפן', () => {
  for (const file of walk('src')) {
    // הבדיקה עצמה מכילה את המחרוזת שהיא מחפשת - היא לא הפרה שלה
    if (!/\.(ts|tsx)$/.test(file) || file.includes('.test.')) continue;
    const src = readFileSync(file, 'utf8');
    assert.ok(!/NEXT_PUBLIC_VIATOR/.test(src), `${file} חושף מפתח ללקוח`);
    if (/^'use client'/m.test(src)) {
      assert.ok(
        !src.includes('VIATOR_'),
        `${file} הוא קומפוננטת לקוח וקורא משתנה סביבה של Viator`,
      );
    }
  }
});

/* ---------- מי מורשה לקרוא לנתיב ---------- */

const req = (headers: Record<string, string>) =>
  new Request('https://tiyulplus.com/api/activities?city=rome', { headers });

/**
 * הבדיקה הזאת נכתבה **אחרי** שדפדפן אמיתי הראה מדור ריק תמיד: השומר
 * של הצ׳אט דרש `Origin`, ובבקשת GET מאותו מקור דפדפן לא שולח אותו.
 */
test('בקשת GET אמיתית מהאתר מתקבלת - גם בלי Origin', () => {
  assert.equal(browserGetOk(req({ host: 'tiyulplus.com', 'sec-fetch-site': 'same-origin' })), true);
});

test('וכל שאר המקורות נדחים', () => {
  const H = { host: 'tiyulplus.com' };
  assert.equal(browserGetOk(req({ ...H, 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(browserGetOk(req({ ...H, 'sec-fetch-site': 'none' })), false, 'הקלדה בשורת הכתובת');
  assert.equal(browserGetOk(req(H)), false, 'בלי שום סימן - סקריפט');
  assert.equal(browserGetOk(req({ ...H, origin: 'https://evil.example.com' })), false);
  assert.equal(browserGetOk(req({ ...H, referer: 'https://evil.example.com/x' })), false);
});

test('נפילה אחורה לדפדפן ישן שכן שולח Origin או Referer', () => {
  const H = { host: 'tiyulplus.com' };
  assert.equal(browserGetOk(req({ ...H, origin: 'https://tiyulplus.com' })), true);
  assert.equal(browserGetOk(req({ ...H, referer: 'https://tiyulplus.com/chat?trip=1' })), true);
});

/* ---------- התאמת יעד ---------- */

const LIST = [
  { destinationId: 511, name: 'Rome', center: { latitude: 41.9028, longitude: 12.4964 } },
  { destinationId: 546, name: 'Florence', center: { latitude: 43.7696, longitude: 11.2558 } },
  { destinationId: 999, name: 'Broken', center: {} },
];

test('היעד נבחר לפי קואורדינטות ולא לפי שם', () => {
  assert.equal(matchDestination(LIST, 41.9, 12.5), 511);
  assert.equal(matchDestination(LIST, 43.77, 11.25), 546);
});

test('מעבר לטווח סביר לא מחזירים כלום במקום לנחש', () => {
  assert.equal(matchDestination(LIST, 32.08, 34.78), null); // תל אביב
  assert.equal(matchDestination([], 41.9, 12.5), null);
});
