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
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DRY = process.argv.includes('--dry');
const FILES = ['src/data/destinations.ts', 'src/data/countries.ts'];
const MANIFEST = 'scripts/photo-verified.json';
const API = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED_WIDTHS = [960, 500, 330, 250];

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

/** imageinfo מחזיר גם קיום וגם רוחב מקור - שניהם נחוצים לבחירת רוחב חוקי. */
async function lookup(titles) {
  const found = new Map();
  for (let i = 0; i < titles.length; i += 45) {
    const batch = titles.slice(i, i + 45);
    const url = `${API}?action=query&format=json&origin=*&prop=imageinfo&iiprop=size&titles=${encodeURIComponent(
      batch.map((t) => `File:${t}`).join('|'),
    )}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'tiyul-plus-photo-repair/1.0' } });
    if (!res.ok) continue;
    const j = await res.json();
    for (const p of Object.values(j?.query?.pages ?? {}))
      if (p.imageinfo) found.set(p.title.replace(/^File:/, '').replace(/ /g, '_'), p.imageinfo[0].width);
    await new Promise((r) => setTimeout(r, 200));
  }
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

const fix = new Map(); // oldName -> { name, width }
const unresolved = [];
for (const [n, cands] of candByName) {
  const hit = cands.find((c) => found.has(c));
  if (hit) fix.set(n, { name: hit, srcWidth: found.get(hit) });
  else unresolved.push(n);
}
console.log(`repairable: ${fix.size}   unresolved: ${unresolved.length}`);

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
        { headers: { 'User-Agent': 'tiyul-plus-photo-repair/1.0' } },
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
    await new Promise((r) => setTimeout(r, 200));
  }
}
if (!DRY) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
  console.log(`\n${MANIFEST} updated. Now run:`);
  console.log('  node scripts/verify-photos.mjs --force');
  console.log('  node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs');
}
