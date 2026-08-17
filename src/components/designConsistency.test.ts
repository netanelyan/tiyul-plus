/**
 * Preserving the consistency this session fixed - as a class, not as an instance.
 *
 * What was originally broken was not wrong design but **five blocks each of which
 * invented its own header**. Fixing by hand the three that looked worst holds only
 * until the next block somebody adds, so the checks here scan all of `src` and fail on
 * the pattern itself: a colour written by hand, and a disclosure caret produced
 * outside the shared component.
 *
 * Both are green today. Their value is the moment somebody brings the pattern back.
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
  The API routes are excluded: they return **text for a conversation**, not an
  interface. An emoji in the agent's reply is content, not a design element.
*/
const FILES = walk('src').filter(
  (f) => !f.endsWith('.test.ts') && !f.includes(join('app', 'api')),
);

/** Comments are stripped before scanning: they are precisely where what *used* to be is written */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');

test('אין צבע כתוב ביד ב-className - רק טוקנים', () => {
  const hits: string[] = [];
  for (const file of FILES) {
    const src = stripComments(readFileSync(file, 'utf8'));
    // An arbitrary Tailwind colour value: bg-[#...], text-[#...], ring-[#...] and so on
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
    The caret is the sign of "this opens". When every component draws it itself it also
    gets its own size and colour - there were three different sizes on one screen. The
    list here is the agreement: collapsible blocks go through PanelSection, and the
    three exceptions are controls that are not blocks (the preferences chip, the nav
    menu, the ideas list).
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
    The kashrut glyph appeared by hand in three files in three forms. The list here is
    the shared components plus two genuine exceptions: the "data is stored on the
    device" warning in offline mode, and the print sheet - both of which say something
    else, not a kashrut status.
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
