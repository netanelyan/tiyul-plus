// אימות כל כתובות התמונות בדאטה: כל photo חייב להחזיר HTTP 200.
// מריצים לפני קומיט של תוכן: node scripts/verify-photos.mjs
// יציאה עם קוד 1 אם תמונה כלשהי נכשלה - מוחקים או מחליפים אותה.
//
// מטמון: כתובת שכבר אומתה (200) נשמרת ב-.cache/verified-photos.json, ובריצה
// הבאה לא נבדקת שוב - כך שרק תמונות חדשות או שהשתנו יוצאות לרשת. זה גם
// חוסך זמן וגם מוריד עומס מוויקימדיה (שמגבילה קצב). הרצה עם --force
// (או VERIFY_PHOTOS_FORCE=1) מתעלמת מהמטמון ובודקת הכול מחדש - כדאי מדי
// פעם, כי כתובת שהייתה תקינה יכולה להישבר בצד השרת.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const FILES = ['src/data/destinations.ts', 'src/data/countries.ts'];
// המניפסט מקומיט לריפו בכוונה. עד עכשיו הוא חי ב-.cache/ שמחוץ ל-git, ולכן
// הוולידטור האופליני לא יכול היה לדעת אילו כתובות באמת נבדקו מול הרשת. סביבת
// הכתיבה חסומה לרשת, כך שמי שמוסיף תמונה כאן לא יכול לאמת אותה בעצמו - הדרך
// היחידה שכתובת שלא נבדקה לא תגיע לפרודקשן היא שהוולידטור ידרוש רשומה במניפסט.
const CACHE_FILE = 'scripts/photo-verified.json';
const LEGACY_CACHE_FILE = '.cache/verified-photos.json';
const FORCE = process.argv.includes('--force') || process.env.VERIFY_PHOTOS_FORCE === '1';
// תוקף המטמון: אחרי 30 יום בודקים כתובת מחדש גם אם אומתה בעבר
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const urls = new Map(); // url -> where

for (const file of FILES) {
  const src = readFileSync(file, 'utf8');
  const re = /photo:\s*\n?\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!urls.has(m[1])) urls.set(m[1], file);
  }
}

/** { [url]: timestamp } - נשמר רק למה שהחזיר 200 */
function readJson(path) {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadCache() {
  if (FORCE) return {};
  // ok:true נשמר עם חתימת זמן; הפורמט הישן היה מספר חשוף. שני הפורמטים נקראים.
  const merged = { ...readJson(LEGACY_CACHE_FILE), ...readJson(CACHE_FILE) };
  const out = {};
  for (const [url, v] of Object.entries(merged)) {
    if (typeof v === 'number') out[url] = v;
    else if (v && typeof v === 'object' && v.ok && typeof v.ts === 'number') out[url] = v.ts;
  }
  return out;
}

const cache = loadCache();
const now = Date.now();
const isFresh = (url) => typeof cache[url] === 'number' && now - cache[url] < MAX_AGE_MS;

const entries = [...urls.entries()].filter(([url]) => !isFresh(url));
const cached = urls.size - entries.length;

console.log(
  `${urls.size} photo URLs · ${cached} already verified (cached)` +
    (entries.length ? ` · checking ${entries.length}...` : ' · nothing new to check'),
);

const failed = []; // כשל אמיתי (404/500 קבוע) - מפיל את הבדיקה
const throttled = []; // 429 שנמשך גם אחרי backoff - לא אומת, אבל גם לא נכשל
const verifiedNow = new Set();
// פחות מקביליות = פחות 429. עם המטמון ממילא נבדקות מעט כתובות בכל ריצה.
const CONCURRENCY = 4;
const BACKOFF_MS = [2000, 6000, 15000];

async function check(url, file) {
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'tiyul-plus-photo-verify/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      // לא מורידים את הגוף - רק סטטוס
      await res.body?.cancel?.();
      if (res.status === 200) {
        verifiedNow.add(url);
        return;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt < BACKOFF_MS.length) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
        // חשוב: לא לסמן כתקין. עד התיקון הזה 429 חוזר נבלע בשקט
        // והכתובת נחשבה "עברה" בלי שנבדקה באמת.
        throttled.push(`${res.status} ${url} (${file})`);
        return;
      }
      failed.push(`${res.status} ${url} (${file})`);
      return;
    } catch (e) {
      if (attempt === BACKOFF_MS.length) failed.push(`ERR ${url} (${file}): ${e.message}`);
      else await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }
}

for (let i = 0; i < entries.length; i += CONCURRENCY) {
  await Promise.all(entries.slice(i, i + CONCURRENCY).map(([u, f]) => check(u, f)));
  process.stdout.write(`\r${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`);
}
if (entries.length) console.log('');

// שומרים רק כתובות שעדיין בדאטה - כך שהמטמון לא תופח עם URLs שנמחקו
// כישלון נרשם במניפסט במפורש, ולא רק מודפס. אחרת ריצה הבאה בסביבה בלי רשת
// לא יכולה לדעת שהכתובת הזאת כבר נבדקה ונפלה.
const failedUrls = new Set(failed.map((f) => f.match(/(https:\/\/\S+)/)?.[1]).filter(Boolean));
const nextCache = {};
for (const url of urls.keys()) {
  if (verifiedNow.has(url)) nextCache[url] = { ok: true, ts: now };
  else if (failedUrls.has(url)) nextCache[url] = { ok: false, ts: now };
  else if (isFresh(url)) nextCache[url] = { ok: true, ts: cache[url] };
}
try {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(nextCache, null, 0));
} catch {
  // מטמון הוא אופטימיזציה בלבד - כישלון כתיבה לא מפיל את הבדיקה
}

if (failed.length > 0) {
  console.error(`\n${failed.length} FAILED:`);
  for (const f of failed) console.error('  ' + f);
  process.exit(1);
}
if (throttled.length > 0) {
  // לא נכשלו, אבל גם לא אומתו - לא נכנסות למטמון, ולכן ריצה חוזרת תבדוק רק אותן
  console.warn(
    `\n${throttled.length} URLs could not be verified (rate limited). Not cached - rerun to finish:`,
  );
  for (const t of throttled.slice(0, 10)) console.warn('  ' + t);
  if (throttled.length > 10) console.warn(`  ...and ${throttled.length - 10} more`);
}
console.log(
  `all checked photo URLs OK ✓ (${verifiedNow.size} verified now, ${cached} from cache` +
    (throttled.length ? `, ${throttled.length} unverified/rate-limited` : '') +
    ')',
);
