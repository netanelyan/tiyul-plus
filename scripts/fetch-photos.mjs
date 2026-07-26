// איתור תמונות למקומות שאין להם photo - הסקריפט היחיד בפרויקט שחייב רשת.
//
// למה הוא קיים בכלל: סביבת הענן שבה הסוכן עובד חוסמת את כל דומייני
// ויקימדיה (403 בפרוקסי), ולכן אי אפשר לאמת שם אף כתובת תמונה. הכלל
// הקשיח של הפרויקט אוסר לכתוב נתון לא מאומת, אז במקום לנחש - הסקריפט
// הזה רץ על מחשב שיש לו רשת, מאמת, וכותב דוח. הדוח הוא שנכנס לקוד,
// דרך scripts/apply-photos.mjs, שלא נוגע ברשת בכלל.
//
//   node scripts/fetch-photos.mjs                  כל המקומות החסרים
//   node scripts/fetch-photos.mjs --limit 20       ריצת ניסיון
//   node scripts/fetch-photos.mjs --only stockholm יעד אחד
//
// הפלט: photo-report.json בשורש הריפו.
//
// איך נמנעים מתמונה של הנושא הלא נכון: לא סומכים על הדירוג של מנוע
// החיפוש. לכל מועמד שוויקיפדיה מחזירה נבדקות הקואורדינטות שלו מול
// הקואורדינטות שכבר יש לנו בדאטה, והמועמד נפסל אם הוא רחוק מדי. תמונה
// שאין לה אימות גיאוגרפי לא מסומנת 'ok' - היא נכנסת ל-'review' וממתינה
// לעין אנושית. זה בדיוק הלקח מהבאץ' השני, שבו התוצאה הראשונה בחיפוש
// Commons הייתה לעתים קרובות נושא אחר לגמרי.
import { writeFileSync } from 'node:fs';
import { parsePlaces, distanceKm } from './lib/parse-places.mjs';

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'tiyul-plus/1.0 (travel catalog photo verification; contact via tiyulplus.com)';
const THUMB_WIDTH = 500; // תואם לכתובות שכבר קיימות בדאטה
const OUT = 'photo-report.json';

/** מתחת לזה המאמר הוא בוודאות אותו מקום */
const ACCEPT_KM = 12;
/** בין ACCEPT_KM ל-REVIEW_KM: כנראה נכון, אבל דורש עין אנושית */
const REVIEW_KM = 60;
const CONCURRENCY = 4;

// שמות קבצים שכמעט תמיד מייצגים סמל ולא מקום. אלה נפסלים גם אם המרחק
// מושלם: דגל של מדינה הוא לא תמונה של אתר.
const BAD_FILE = /(flag|coat[_ ]of[_ ]arms|logo|map[_ ]of|locator|seal|emblem|blank|wappen)/i;

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const only = argOf('--only');
const limit = Number.parseInt(argOf('--limit') ?? '', 10);

const { places } = parsePlaces();
let targets = places.filter((p) => !p.hasPhoto);
if (only) targets = targets.filter((p) => p.destSlug === only);
if (Number.isFinite(limit) && limit > 0) targets = targets.slice(0, limit);

console.log(
  `${places.length} places parsed · ${places.filter((p) => !p.hasPhoto).length} without a photo` +
    (only || Number.isFinite(limit) ? ` · ${targets.length} selected` : ''),
);
if (!targets.length) {
  console.log('Nothing to do.');
  process.exit(0);
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** האם הכתובת באמת חיה ובאמת תמונה */
async function headOk(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20000),
    });
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * מבקש מוויקיפדיה עד 8 מועמדים לשם, ומחזיר לכל אחד כותרת, קואורדינטות
 * ותמונה ראשית. תמונה ראשית של מאמר היא מדד טוב בהרבה לנושא הנכון
 * מאשר תוצאה ראשונה בחיפוש טקסט חופשי ב-Commons.
 */
async function candidates(query) {
  const url =
    `${API}?action=query&format=json&formatversion=2&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8` +
    `&prop=coordinates|pageimages|info&inprop=url` +
    `&piprop=thumbnail|name&pithumbsize=${THUMB_WIDTH}`;
  const data = await getJson(url);
  return data?.query?.pages ?? [];
}

/** @param {import('./lib/parse-places.mjs').ParsedPlace} place */
async function resolve(place) {
  const base = { id: place.id, destSlug: place.destSlug, nameLocal: place.nameLocal };
  let pages;
  try {
    pages = await candidates(place.nameLocal);
  } catch (err) {
    return { ...base, status: 'error', reason: String(err?.message ?? err) };
  }

  const scored = [];
  for (const page of pages) {
    const thumb = page?.thumbnail?.source;
    if (!thumb || !thumb.startsWith('https://upload.wikimedia.org/')) continue;
    if (BAD_FILE.test(page.pageimage ?? '')) continue;
    const co = page?.coordinates?.[0];
    const km = co ? distanceKm(place.lat, place.lng, co.lat, co.lon) : null;
    scored.push({ title: page.title, pageUrl: page.fullurl, thumb, km, file: page.pageimage });
  }

  if (!scored.length) return { ...base, status: 'none', reason: 'no article with a lead image' };

  const geo = scored.filter((c) => c.km !== null).sort((a, b) => a.km - b.km);
  const best = geo[0];

  let status;
  let chosen;
  if (best && best.km <= ACCEPT_KM) {
    status = 'ok';
    chosen = best;
  } else if (best && best.km <= REVIEW_KM) {
    status = 'review';
    chosen = best;
  } else if (
    // אין קואורדינטות בשום מועמד: מקבלים רק התאמת כותרת מדויקת, ורק
    // כ-review. מוזיאונים וכנסיות רבים פשוט לא ממופים בוויקיפדיה.
    scored.some((c) => c.title.toLowerCase() === place.nameLocal.toLowerCase())
  ) {
    status = 'review';
    chosen = scored.find((c) => c.title.toLowerCase() === place.nameLocal.toLowerCase());
  } else {
    return {
      ...base,
      status: 'none',
      reason: best ? `nearest article is ${best.km.toFixed(0)} km away` : 'no geo match',
      nearest: best ? { title: best.title, km: Number(best.km.toFixed(1)) } : undefined,
    };
  }

  if (!(await headOk(chosen.thumb))) {
    return { ...base, status: 'none', reason: 'thumbnail did not return an image' };
  }

  return {
    ...base,
    status,
    photo: chosen.thumb,
    article: chosen.title,
    articleUrl: chosen.pageUrl,
    file: chosen.file,
    distanceKm: chosen.km === null ? null : Number(chosen.km.toFixed(1)),
  };
}

// ריצה עם תקרת מקביליות. ויקיפדיה סובלנית, אבל אין סיבה להעמיס.
const results = [];
let cursor = 0;
let done = 0;
async function worker() {
  while (cursor < targets.length) {
    const place = targets[cursor++];
    const out = await resolve(place);
    results.push(out);
    done++;
    if (done % 25 === 0 || done === targets.length) {
      console.log(`  ${done}/${targets.length}...`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

results.sort((a, b) => a.destSlug.localeCompare(b.destSlug) || a.id.localeCompare(b.id));
const count = (s) => results.filter((r) => r.status === s).length;

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'en.wikipedia.org lead images, geo-verified against destinations.ts',
      acceptKm: ACCEPT_KM,
      reviewKm: REVIEW_KM,
      totals: {
        checked: results.length,
        ok: count('ok'),
        review: count('review'),
        none: count('none'),
        error: count('error'),
      },
      results,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log('');
console.log(`ok      ${count('ok')}   (geo-verified, safe to apply)`);
console.log(`review  ${count('review')}   (plausible, needs a human look)`);
console.log(`none    ${count('none')}   (no honest match found)`);
console.log(`error   ${count('error')}`);
console.log(`\nWrote ${OUT}`);
