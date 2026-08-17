/**
 * The policy pages - **four claims about what must not happen.**
 *
 * These pages are legal documents, and three ways of breaking them are
 * invisible to the eye and fail no existing check:
 *
 * 1. A page linked from the footer whose content is still empty.
 * 2. A page with content that stays blocked from indexing - a policy
 *    nobody will find.
 * 3. A known gap written as ordinary text and therefore reading as content.
 * 4. A page without a `description`, so Google shows the generic site
 *    description on it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const APP = import.meta.dirname;

/** The pages the footer links to under the "info and policies" section, plus the about page */
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
 * `PageShell` without children renders the "not yet written" state. That
 * is a legitimate state for a new page, not for a page already linked from
 * every page on the site.
 */
test('**אף עמוד מדיניות לא נשאר על מצב ״עדיין לא נכתב״**', () => {
  const empty: string[] = [];
  for (const p of POLICY_PAGES) {
    const s = src(p);
    // <PageShell title="..." /> without children = the empty skeleton
    if (/<PageShell[^>]*\/>/.test(s)) empty.push(p);
  }
  assert.deepEqual(empty, [], `עמודים ריקים: ${empty.join(', ')}`);
});

/**
 * `robots: { index: false }` was added deliberately when the pages were
 * empty, so Google would not index a policy page with no policy. The
 * moment there is content it becomes the opposite bug - and terms of use
 * that cannot be found are worth less than nothing.
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
 * **The important claim here.** A known gap must go through `Gap`, which
 * renders it framed and yellow. A gap written as an ordinary paragraph
 * reads as content, and that is exactly the situation these pages were
 * written to prevent: text that sounds like policy where there is no
 * policy.
 */
test('**כל [למילוי] ו-[לבירור] עובר דרך רכיב Gap**', () => {
  const offenders: string[] = [];
  for (const p of POLICY_PAGES) {
    const lines = src(p).split('\n');
    lines.forEach((line, i) => {
      if (!/\[(למילוי|לבירור)\]/.test(line)) return;
      // Allowed inside the component itself (the label) and inside a comment explaining the rule
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
 * Three factual claims written out of a code audit, which a code change
 * would make false without anyone noticing. The test ties the text to its
 * source.
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
    // Setting a cookie in the browser, or Set-Cookie from the server
    if (/document\.cookie\s*=/.test(s) || /['"]Set-Cookie['"]/i.test(s)) hits.push(f);
    // cookies() from next/headers
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
