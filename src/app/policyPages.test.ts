/**
 * עמודי המדיניות - **ארבע טענות על מה שאסור לקרות.**
 *
 * העמודים האלה הם מסמכים משפטיים, ושלוש דרכים לשבור אותם אינן נראות
 * בעין ואינן מפילות שום בדיקה קיימת:
 *
 * 1. עמוד שהקישור אליו קיים בפוטר אבל התוכן שלו עדיין ריק.
 * 2. עמוד עם תוכן שנשאר חסום מאינדוקס - מדיניות שאיש לא ימצא.
 * 3. פער ידוע שנכתב כטקסט רגיל ולכן נקרא כמו תוכן.
 * 4. עמוד בלי `description`, כך שגוגל מציג עליו את תיאור האתר הכללי.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const APP = import.meta.dirname;

/** העמודים שהפוטר מקשר אליהם תחת ״מידע ומדיניות״, ועמוד האודות */
const POLICY_PAGES = [
  'about',
  'contact',
  'terms',
  'privacy',
  'cookies',
  'affiliate-disclosure',
  'refunds',
  'accessibility',
];

const src = (slug: string) => readFileSync(join(APP, slug, 'page.tsx'), 'utf8');

test('כל עמוד שהפוטר מקשר אליו קיים', () => {
  const missing = POLICY_PAGES.filter((p) => !existsSync(join(APP, p, 'page.tsx')));
  assert.deepEqual(missing, []);
});

/**
 * `PageShell` בלי children מרנדר את מצב ״עדיין לא נכתב״. זה מצב לגיטימי
 * לעמוד חדש, ולא לעמוד שכבר מקושר מכל עמוד באתר.
 */
test('**אף עמוד מדיניות לא נשאר על מצב ״עדיין לא נכתב״**', () => {
  const empty: string[] = [];
  for (const p of POLICY_PAGES) {
    const s = src(p);
    // <PageShell title="..." /> ללא children = השלד הריק
    if (/<PageShell[^>]*\/>/.test(s)) empty.push(p);
  }
  assert.deepEqual(empty, [], `עמודים ריקים: ${empty.join(', ')}`);
});

/**
 * `robots: { index: false }` נוסף בכוונה כשהעמודים היו ריקים, כדי שגוגל
 * לא יאנדקס עמוד מדיניות בלי מדיניות. ברגע שיש תוכן זה הופך לבאג הפוך -
 * ותנאי שימוש שאי אפשר למצוא שווים פחות מכלום.
 */
test('עמוד מדיניות עם תוכן אינו חסום מאינדוקס', () => {
  const blocked = POLICY_PAGES.filter((p) => /robots:\s*\{[^}]*index:\s*false/.test(src(p)));
  assert.deepEqual(blocked, [], `להסיר את robots.index:false מ: ${blocked.join(', ')}`);
});

test('לכל עמוד מדיניות יש description משלו', () => {
  const without = POLICY_PAGES.filter((p) => !/description:/.test(src(p)));
  assert.deepEqual(without, []);
});

/**
 * **הטענה החשובה כאן.** פער ידוע חייב לעבור דרך `Gap`, שמרנדר אותו
 * ממוסגר וצהוב. פער שנכתב כפסקה רגילה נקרא כמו תוכן, וזה בדיוק המצב
 * שהעמודים האלה נכתבו כדי למנוע: טקסט שנשמע כמו מדיניות במקום שבו אין
 * מדיניות.
 */
test('**כל [למילוי] ו-[לבירור] עובר דרך רכיב Gap**', () => {
  const offenders: string[] = [];
  for (const p of POLICY_PAGES) {
    const lines = src(p).split('\n');
    lines.forEach((line, i) => {
      if (!/\[(למילוי|לבירור)\]/.test(line)) return;
      // מותר בתוך הרכיב עצמו (הכיתוב) ובתוך הערה שמסבירה את הכלל
      if (line.includes('//') || line.includes('*')) return;
      offenders.push(`${p}/page.tsx:${i + 1}: ${line.trim().slice(0, 70)}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `להעביר דרך <Gap>, אחרת הפער נקרא כמו תוכן:\n${offenders.join('\n')}`,
  );
});

/**
 * שלוש טענות עובדתיות שנכתבו מתוך ביקורת קוד, וששינוי בקוד יהפוך
 * לשקריות בלי שאיש ישים לב. הבדיקה קושרת את הטקסט למקור שלו.
 */
test('הטענה ״אין עוגיות״ עדיין נכונה', () => {
  const files: string[] = [];
  (function walk(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts')) files.push(p);
    }
  })(join(APP, '..'));

  const hits: string[] = [];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    // הצבת עוגייה בדפדפן, או Set-Cookie מהשרת
    if (/document\.cookie\s*=/.test(s) || /['"]Set-Cookie['"]/i.test(s)) hits.push(f);
    // cookies() של next/headers
    if (/from\s+['"]next\/headers['"]/.test(s) && /\bcookies\b/.test(s)) hits.push(f);
  }
  assert.deepEqual(
    [...new Set(hits)],
    [],
    'עמוד /cookies מצהיר שהאתר לא מציב אף עוגייה. הקבצים האלה סותרים זאת',
  );
});

test('הטענה ״אין אנליטיקה ואין פרסום״ עדיין נכונה', () => {
  const pkg = JSON.parse(readFileSync(join(APP, '../../package.json'), 'utf8'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const TRACKERS = /analytics|gtag|gtm|posthog|mixpanel|amplitude|segment|hotjar|clarity|sentry|datadog|logrocket|fullstory/i;
  const found = deps.filter((d) => TRACKERS.test(d));
  assert.deepEqual(found, [], `נוספה תלות שנראית כמו מעקב: ${found.join(', ')}`);
});

test('הטענה ״המסך הניהולי לקריאה בלבד״ עדיין נכונה', () => {
  const trips = readFileSync(join(APP, 'api/admin/trips/route.ts'), 'utf8');
  for (const verb of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    assert.ok(
      !new RegExp(`export\\s+(async\\s+)?function\\s+${verb}\\b`).test(trips),
      `נוסף ${verb} ל-/api/admin/trips - מדיניות הפרטיות מצהירה שאין דרך לערוך או למחוק טיול של מישהו אחר`,
    );
  }
});
