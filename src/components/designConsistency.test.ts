/**
 * שמירה על העקביות שהסשן הזה תיקן - כמחלקה, לא כמופע.
 *
 * מה שנשבר במקור לא היה עיצוב שגוי אלא **חמישה בלוקים שכל אחד המציא
 * לעצמו כותרת**. תיקון ידני של השלושה שנראו הכי גרוע מחזיק עד הבלוק
 * הבא שמישהו יוסיף, ולכן הבדיקות כאן סורקות את כל `src` ונופלות על
 * הדפוס עצמו: צבע כתוב ביד, וחץ פתיחה שנוצר מחוץ לרכיב המשותף.
 *
 * שתיהן ירוקות היום. הערך שלהן הוא ברגע שמישהו יחזיר את הדפוס.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

/*
  נתיבי ה-API מוחרגים: הם מחזירים **טקסט לשיחה**, לא ממשק. אימוג׳י
  בתשובה של הסוכן הוא תוכן, לא רכיב עיצוב.
*/
const FILES = walk('src').filter(
  (f) => !f.endsWith('.test.ts') && !f.includes(join('app', 'api')),
);

/** הערות מוסרות לפני סריקה: הן בדיוק המקום שבו כתוב מה *היה* פעם */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');

test('אין צבע כתוב ביד ב-className - רק טוקנים', () => {
  const hits: string[] = [];
  for (const file of FILES) {
    const src = stripComments(readFileSync(file, 'utf8'));
    // ערך צבע שרירותי של Tailwind: bg-[#...], text-[#...], ring-[#...] וכו׳
    for (const m of src.matchAll(/\b(?:bg|text|ring|border|from|to|via|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g)) {
      hits.push(`${file}: ${m[0]}`);
    }
  }
  assert.deepEqual(
    hits,
    [],
    `צבע קשיח ב-className. טוקן ב-globals.css נדרס במצב ניגודיות גבוהה, הקס לא:\n${hits.join('\n')}`,
  );
});

test('חץ הפתיחה נוצר רק במקומות שהוסכם עליהם', () => {
  /*
    ▾ הוא הסימן של "זה נפתח". כשכל רכיב מצייר אותו בעצמו הוא מקבל גם
    גודל וצבע משלו - היו שלושה גדלים שונים על מסך אחד. הרשימה כאן היא
    ההסכמה: הבלוקים המתקפלים עוברים דרך PanelSection, ושלושת החריגים
    הם פקדים שאינם בלוקים (צ׳יפ העדפות, תפריט ניווט, רשימת רעיונות).
  */
  const ALLOWED = new Set([
    join('src', 'components', 'PanelSection.tsx'),
    join('src', 'components', 'PromptChips.tsx'),
    join('src', 'components', 'SiteNav.tsx'),
    join('src', 'components', 'TripWorkspace.tsx'),
  ]);
  const hits = FILES.filter(
    (f) => !ALLOWED.has(f) && stripComments(readFileSync(f, 'utf8')).includes('▾'),
  );
  assert.deepEqual(
    hits,
    [],
    `חץ פתיחה מחוץ לרכיב המשותף - להשתמש ב-PanelSection:\n${hits.join('\n')}`,
  );
});

test('הערת כשרות וסטטוס השגחה מרונדרים כל אחד במקום אחד בלבד', () => {
  /*
    ✡️ הופיע ידנית בשלושה קבצים בשלוש צורות. הרשימה כאן היא הרכיבים
    המשותפים ועוד שני חריגים אמיתיים: אזהרת "המידע נשמר במכשיר" במצב
    לא-מקוון, וגיליון ההדפסה - שניהם אומרים משהו אחר, לא סטטוס כשרות.
  */
  const ALLOWED = new Set([
    join('src', 'components', 'KosherNote.tsx'),
    join('src', 'components', 'KosherBadge.tsx'),
    join('src', 'components', 'TripWorkspace.tsx'),
    join('src', 'app', 'kosher', 'KosherSearch.tsx'),
  ]);
  const hits = FILES.filter(
    (f) => !ALLOWED.has(f) && stripComments(readFileSync(f, 'utf8')).includes('✡️'),
  );
  assert.deepEqual(hits, [], `רינדור כשרות ידני:\n${hits.join('\n')}`);
});
