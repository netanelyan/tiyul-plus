// תיקון שמות קבצים שבורים של Commons בקטלוג.
//
// למה זה קיים: סריקה בדפדפן ב-2026-07-27 מצאה ש-151 מתוך 1,396 כתובות התמונות
// בקטלוג מחזירות 404, ו**אף אחת מהן לא ניתנת להצלה ברוחב אחר** (נבדקו
// 960/500/330/250). כלומר אלה קבצים מתים ולא בעיית רוחב. הסיבה השורשית ברוב
// המקרים היא **אותיות הסיומת**: שמות קבצים ב-Commons רגישים לאותיות גדולות
// וקטנות, ומעבר קודם המיר ".JPG" ל-".jpg". במדגם של 16 כתובות, 14 חזרו לחיים
// מהחזרת האותיות המקוריות בלבד - אותה תמונה, אותו נושא.
//
// מחלקות קלקול נוספות שזוהו באותה סריקה:
//   * קידוד כפול:  Torre_Bel%C3%A9m  (במקום Torre_Belém)
//   * גרש שנבלע:   musée_dart        (במקום musée_d'art)
//   * אות ראשונה קטנה: bengmealea    (Commons תמיד מגדיל אות ראשונה)
//
// **המלכודת שהסתירה את כל זה:** שם קובץ שגוי עדיין מתאים ל-md5 של עצמו, כי
// הקידומת /x/xy/ נגזרת מאותה מחרוזת שגויה. לכן סריקת קידומות על 1,620 כתובות
// החזירה 0 שגיאות ולא הוכיחה כלום. רק בדיקת HTTP רואה את המחלקה הזאת - ולכן
// הסקריפט הזה מאמת מול Commons ולא מנחש.
//
// הרצה (דורש רשת - הסנדבוקס חוסם את upload.wikimedia.org, לכן זה רץ אצל נתנאל
// או בסשן עם דפדפן):
//   node scripts/repair-photo-names.mjs --dry     # רק מדווח, לא כותב
//   node scripts/repair-photo-names.mjs           # מתקן וכותב
//
// הסקריפט לעולם לא ממציא תמונה חלופית: הוא מתקן את **שם הקובץ הקיים** בלבד.
// אם אף וריאנט לא נמצא ב-Commons, הכתובת נשארת כמו שהיא ומדווחת כ-UNRESOLVED,
// כדי שאדם יחליט. השמטה עדיפה על ניחוש.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DRY = process.argv.includes('--dry');
const FILES = ['src/data/destinations.ts', 'src/data/countries.ts'];
const MANIFEST = 'scripts/photo-verified.json';
const API = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED_WIDTHS = [960, 500, 330, 250];

// מדיניות Wikimedia דורשת User-Agent שמזהה את הכלי ונותן דרך ליצור קשר.
// UA גנרי הוא סיבה מוכרת ל-429/403, וקיבלנו 429 בהרצה הראשונה.
const HEADERS = {
  'User-Agent': 'tiyul-plus-photo-repair/1.1 (https://github.com/netanelyan/tiyul-plus)',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept-Encoding': 'gzip',
};
const BACKOFF_MS = [2_000, 5_000, 12_000, 30_000, 60_000];
const PACE_MS = 1_000; // בין אצוות. איטי בכוונה - עדיף לרוץ דקה יותר מאשר להיחסם.

/**
 * הנתיב ב-Commons הוא פונקציה טהורה של שם הקובץ: md5 של השם הלא-מקודד.
 * אומת מול הקטלוג: 1,106 מתוך 1,263 כתובות חיות משוחזרות בייט-בבייט.
 *
 * 157 הנותרות נבדלות רק בסגנון קידוד הסוגריים: encodeURIComponent משאיר
 * "(" ו-")" כמו שהם, ואילו MediaWiki מקודד אותם ל-%28/%29. **שתי הצורות
 * חיות בקטלוג ושתיהן עובדות**, ולכן זה ענייו של סגנון בלבד - אבל שומרים על
 * הסגנון המקורי כדי שה-diff יראה רק את התיקון האמיתי ולא רעש קידוד.
 * הקידומת md5 זהה בשתי הצורות, כי היא נגזרת מהשם המפוענח.
 */
function thumbUrl(filename, width, encodeParens = false) {
  const h = createHash('md5').update(filename, 'utf8').digest('hex');
  let e = encodeURIComponent(filename).replace(/'/g, '%27');
  if (encodeParens) e = e.replace(/\(/g, '%28').replace(/\)/g, '%29');
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${e}/${width}px-${e}`;
}

/** כל הווריאנטים הסבירים של שם קובץ שבור, מהסביר לפחות סביר. */
function variants(name) {
  const stem = name.replace(/\.[A-Za-z]+$/, '');
  const ext = (name.match(/\.[A-Za-z]+$/) || ['.jpg'])[0];
  const stems = new Set([stem]);
  // קידוד כפול: אם נשארו רצפי %XX אחרי הפענוח, הם היו מקודדים פעמיים
  if (stem.includes('%')) {
    try {
      const d = decodeURIComponent(stem);
      if (d !== stem) stems.add(d);
    } catch {
      /* רצף % לא חוקי - מתעלמים */
    }
  }
  // Commons תמיד מגדיל את האות הראשונה
  for (const s of [...stems]) if (/^[a-z]/.test(s)) stems.add(s[0].toUpperCase() + s.slice(1));
  const exts = [ext, '.JPG', '.jpg', '.jpeg', '.JPEG', '.png', '.PNG', '.tif', '.tiff'];
  const out = [];
  for (const s of stems) for (const e of exts) out.push(s + e);
  return [...new Set(out)].filter((v) => v !== name);
}

/**
 * מלכודת REDIRECT, נתפסה בייצור ב-2026-07-27 ועלתה תיקון אחד מתוך 112:
 * `Kykkos_monastry_from_the_air.JPG` הוא **הפניה** ב-Commons אל
 * `Kykkos_monastery_from_the_air.jpg` (שים לב: גם איות וגם אותיות הסיומת).
 * ה-API מחזיר imageinfo מלא עבור ההפניה - קיים, 4416x3312, image/jpeg - אבל
 * **תמונות ממוזערות קיימות רק תחת השם הקנוני**, ולכן כתובת ה-thumb שבנינו
 * מהשם המופנה החזירה 404 בכל רוחב.
 *
 * המסקנה: `prop=imageinfo` לבדו לא מוכיח שה-thumb יעבוד. לכן מבקשים
 * `iiurlwidth` ולוקחים את `thumburl` **כמו שהוא** - הוא תמיד קנוני - ומוסיפים
 * `redirects=1` כדי שהכותרות ייפתרו. בניית md5 עצמאית נשארת רק כגיבוי.
 */
/** imageinfo מחזיר גם קיום וגם רוחב מקור - שניהם נחוצים לבחירת רוחב חוקי. */
/**
 * חיפוש קיום + רוחב מקור מול Commons.
 *
 * **POST ולא GET, וזה לא קוסמטי.** הגרסה הראשונה דחסה 45 שמות קבצים למחרוזת
 * שאילתה של GET. חלק מהשמות כאן ארוכים מ-100 תווים, כך שה-URL עבר את המגבלה
 * והבקשה נכשלה - ו-`if (!res.ok) continue` בלע את הכישלון בשקט. התוצאה:
 * 88 קבצים דווחו "לא נמצאו" כשהם קיימים, והחלוקה נקבעה לפי מזל של אצווה ולא
 * לפי השם. חיפוש הגיבוי מצא בדיוק את אותם קבצים עם סיומת .JPG.
 *
 * זאת בדיוק אותה שגיאה שהסשן הזה רודף אחריה כל הזמן: **היעדר ראיה נקרא
 * כראיה להיעדר.** לכן עכשיו: POST (אין מגבלת אורך), אצווה קטנה יותר, ניסיון
 * חוזר, וכישלון אמיתי **זורק** במקום להיבלע.
 */
async function lookup(titles) {
  // מטמון על הדיסק, כי Commons מגביל קצב (429) ובלי זה כל חסימה מאבדת את כל
  // ההתקדמות ומכריחה להתחיל מאפס - מה שרק מגדיל את העומס ומזמין עוד 429.
  // הרצה חוזרת ממשיכה מאיפה שנעצרה.
  const CACHE = '.cache/commons-lookup.json';
  mkdirSync('.cache', { recursive: true });
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const found = new Map(Object.entries(cache).filter(([, v]) => v > 0));
  const asked = new Set(Object.keys(cache));
  const todo = titles.filter((t) => !asked.has(t));
  if (todo.length < titles.length)
    console.log(`resuming: ${titles.length - todo.length} titles already looked up, ${todo.length} to go`);

  const BATCH = 40;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const body = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'imageinfo',
      iiprop: 'size|url',
      titles: batch.map((t) => `File:${t}`).join('|'),
      // redirects=1 פותר הפניות, ו-iiurlwidth מחזיר thumburl קנוני שאפשר
      // להשתמש בו כמו שהוא במקום לבנות md5 בעצמנו. ראה מלכודת REDIRECT למעלה.
      redirects: '1',
      iiurlwidth: '500',
    });
    let j = null;
    for (let attempt = 0; attempt < 6 && !j; attempt++) {
      try {
        const res = await fetch(API, { method: 'POST', headers: HEADERS, body });
        if (res.status === 429 || res.status >= 500) {
          // Retry-After הוא מה ש-Wikimedia מבקש שנכבד. בלעדיו - השהיה מעריכית.
          const ra = Number(res.headers.get('retry-after'));
          const waitMs = Number.isFinite(ra) && ra > 0 ? ra * 1000 : BACKOFF_MS[attempt] ?? 60_000;
          if (attempt < 5) {
            console.log(`  HTTP ${res.status} on batch ${Math.floor(i / BATCH) + 1}, waiting ${Math.round(waitMs / 1000)}s...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        j = await res.json();
      } catch (e) {
        if (attempt === 5) {
          writeFileSync(CACHE, JSON.stringify(cache));
          throw new Error(
            `Commons lookup failed for batch ${Math.floor(i / BATCH) + 1} after 6 attempts: ${e.message}.\n` +
              `Progress WAS saved to ${CACHE} - just run the script again and it resumes.\n` +
              `Refusing to continue silently: a skipped batch is what made an earlier run ` +
              `report 88 false "not found" results.`,
          );
        }
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt] ?? 60_000));
      }
    }
    // formatversion=2 מחזיר pages כמערך, וכותרות עם רווחים במקום קו תחתון
    const hit = new Set();
    for (const p of j?.query?.pages ?? [])
      if (p.imageinfo?.[0]) {
        const key = p.title.replace(/^File:/, '').replace(/ /g, '_');
        found.set(key, p.imageinfo[0].width);
        hit.add(key);
        cache[key] = p.imageinfo[0].width;
      }
    // רושמים גם את מה שנשאל ולא נמצא, אחרת כל הרצה חוזרת שואלת שוב את אותם שמות
    for (const t of batch) if (!hit.has(t)) cache[t] = 0;
    writeFileSync(CACHE, JSON.stringify(cache));
    process.stdout.write(`\r  looked up ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    await new Promise((r) => setTimeout(r, PACE_MS));
  }
  if (todo.length) console.log('');
  return found;
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const dead = Object.entries(manifest)
  .filter(([, v]) => v && typeof v === 'object' && v.ok === false)
  .map(([u]) => u);

if (dead.length === 0) {
  console.log(`No URLs are recorded as failing in ${MANIFEST}. Nothing to repair.`);
  process.exit(0);
}

const nameOf = (u) => decodeURIComponent(u.split('/').pop().replace(/^\d+px-/, ''));
const names = [...new Set(dead.map(nameOf))];
console.log(`${dead.length} dead URLs across ${names.length} distinct filenames.`);

const candByName = new Map(names.map((n) => [n, variants(n)]));
const found = await lookup([...new Set([...candByName.values()].flat())]);

/**
 * צורה מנורמלת לזיהוי "אותו שם, איות אחר": מורידים ניקוד/דיאקריטיקה, מאחדים
 * אותיות גדולות/קטנות, וזורקים כל מה שאינו אות או ספרה. כך `Üçhisar` ו-`Uçhisar`,
 * `Krakow` ו-`Kraków`, `Slîtere` ו-`Slītere`, וכל שלושת סוגי הגרש (ASCII ' ,
 * U+2019 ’ , U+02BB ʻ) מתמפים לאותה מחרוזת.
 *
 * זה **לא** ניחוש: התאמה כאן פירושה שהשם זהה עד כדי איות, ולכן זו עדיין
 * שינוי-שם של אותו קובץ ולא בחירה של תמונה אחרת. התאמה חלקית או דומה נשארת
 * מחוץ לזה ומדווחת לאדם.
 */
const norm = (s) =>
  s
    .replace(/\.[A-Za-z]+$/, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const fix = new Map(); // oldName -> { name, width }
const stillOpen = [];
for (const [n, cands] of candByName) {
  const hit = cands.find((c) => found.has(c));
  if (hit) fix.set(n, { name: hit, srcWidth: found.get(hit), how: 'variant' });
  else stillOpen.push(n);
}
const byVariant = fix.size;

// שלב שני: למה שלא נפתר, שואלים את חיפוש Commons ומקבלים **רק** תוצאה שהצורה
// המנורמלת שלה זהה לשם המקורי. זה תופס הבדלי דיאקריטיקה, סוג גרש ופיסוק - כלומר
// אותו קובץ בדיוק - בלי לפתוח פתח לבחירת תמונה אחרת.
const unresolved = [];
for (const n of stillOpen) {
  const target = norm(n);
  const term = n.replace(/\.[A-Za-z]+$/, '').replace(/[_-]+/g, ' ').replace(/%[0-9A-F]{2}/gi, ' ');
  let matched = null;
  try {
    const r = await fetch(
      `${API}?action=query&format=json&formatversion=2&generator=search&gsrsearch=${encodeURIComponent(
        `filetype:bitmap ${term}`,
      )}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=size`,
      { headers: { 'User-Agent': HEADERS['User-Agent'] } },
    );
    const j = await r.json();
    for (const p of j?.query?.pages ?? []) {
      if (!p.imageinfo?.[0]) continue;
      const cand = p.title.replace(/^File:/, '').replace(/ /g, '_');
      if (norm(cand) === target) {
        matched = { name: cand, srcWidth: p.imageinfo[0].width, how: 'spelling' };
        break;
      }
    }
  } catch {
    /* חיפוש הוא עזר - כישלון שלו רק משאיר את השם ברשימה לאדם */
  }
  if (matched) fix.set(n, matched);
  else unresolved.push(n);
  await new Promise((r) => setTimeout(r, PACE_MS));
}
const bySpelling = fix.size - byVariant;
console.log(
  `repairable: ${fix.size} (${byVariant} by filename variant, ${bySpelling} by spelling-only match)   unresolved: ${unresolved.length}`,
);
for (const [n, f] of fix)
  if (f.how === 'spelling') console.log(`  spelling: ${n}\n         -> ${f.name}`);

let rewrites = 0;
for (const file of FILES) {
  let src = readFileSync(file, 'utf8');
  for (const u of dead) {
    const f = fix.get(nameOf(u));
    if (!f) continue;
    const want = +(u.match(/\/(\d+)px-/)?.[1] ?? 500);
    // אף פעם לא לבקש תמונה רחבה מהמקור - זה בדיוק ה-404 השקט מהתקלה הקודמת
    const width = ALLOWED_WIDTHS.find((w) => w <= f.srcWidth && w <= want) ?? ALLOWED_WIDTHS.at(-1);
    const next = thumbUrl(f.name, width, u.includes('%28') || u.includes('%29'));
    if (src.includes(u)) {
      src = src.split(u).join(next);
      manifest[next] = { ok: true, ts: Date.now() };
      delete manifest[u];
      rewrites++;
    }
  }
  if (!DRY) writeFileSync(file, src);
}

console.log(`${DRY ? '[dry run] would rewrite' : 'rewrote'} ${rewrites} URL occurrences.`);
if (unresolved.length) {
  console.log(`\n${unresolved.length} filenames could NOT be resolved and were left untouched.`);
  console.log('Commons search suggestions below are NOT applied - a human picks, or nothing ships.');
  console.log('Watch for the known traps: coat of arms, corporate logo, montage, and the right');
  console.log('name attached to the WRONG CITY (Cartagena_Cathedral returns Spain, not Colombia).\n');
  for (const n of unresolved) {
    const term = n.replace(/\.[A-Za-z]+$/, '').replace(/[_-]+/g, ' ').replace(/%[0-9A-F]{2}/gi, ' ');
    let sug = [];
    try {
      const r = await fetch(
        `${API}?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
          `filetype:bitmap ${term}`,
        )}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=size`,
        { headers: { 'User-Agent': HEADERS['User-Agent'] } },
      );
      const j = await r.json();
      sug = Object.values(j?.query?.pages ?? {})
        .filter((p) => p.imageinfo)
        .map((p) => `${p.title.replace(/^File:/, '')} (${p.imageinfo[0].width}px)`);
    } catch {
      /* חיפוש הוא עזר בלבד - כישלון שלו לא מפיל את התיקון */
    }
    console.log(`  ${n}`);
    for (const s of sug) console.log(`      ? ${s}`);
    await new Promise((r) => setTimeout(r, PACE_MS));
  }
}
if (!DRY) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
  console.log(`\n${MANIFEST} updated. Now run:`);
  console.log('  node scripts/verify-photos.mjs --force');
  console.log('  node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs');
}
