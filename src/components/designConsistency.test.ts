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

test('שלד טעינה נבנה רק מהרכיב המשותף', () => {
  /*
    The same species as the panel headers: five blocks each inventing its own
    header became five headers that did not match. Loading was heading the
    same way - TripSkeleton wrote `skeleton-block` by hand while the homepage
    band wrote `animate-pulse bg-cream/10`, i.e. two different shimmers for
    the same idea, and neither could be fixed in one place.

    So the shimmer classes live in exactly one component. `Skeleton` is where
    a new loading shape comes from; globals.css is where the animation and its
    prefers-reduced-motion fallback are defined. Anything else drawing its own
    is the drift this test exists to stop.
  */
  const ALLOWED = new Set([join('src', 'components', 'Skeleton.tsx')]);
  const hits: string[] = [];
  for (const file of FILES) {
    if (ALLOWED.has(file)) continue;
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/\b(?:skeleton-block(?:-invert)?|animate-pulse)\b/g)) {
      hits.push(`${file}: ${m[0]}`);
    }
  }
  assert.deepEqual(
    hits,
    [],
    `שלד טעינה שנכתב ביד - להשתמש ב-Skeleton/SkeletonScreen:\n${hits.join('\n')}`,
  );
});

test('מה שעולה כסף יושב רק בתוך האזור בתשלום', () => {
  /*
    Netanel: the premium features must not sit on top of the free ones, they
    belong somewhere else. That was a placement bug - a locked panel wedged
    between two working free ones - and placement is exactly the kind of thing
    that creeps back one component at a time.

    So the rule is checked where it is decided: inside TripWorkspace, every paid
    component must appear between <PaidTools> and </PaidTools>. Anything
    rendered outside that range is back in the free stack.
  */
  const file = join('src', 'components', 'TripWorkspace.tsx');
  const src = stripComments(readFileSync(file, 'utf8'));
  const open = src.indexOf('<PaidTools>');
  const close = src.indexOf('</PaidTools>');
  assert.ok(open !== -1 && close > open, 'PaidTools לא מרונדר ב-TripWorkspace');

  for (const paid of ['<TripGroupPanel', '<PreDepartureCheck']) {
    const at = src.indexOf(paid);
    assert.notEqual(at, -1, `${paid} לא נמצא בכלל`);
    assert.ok(
      at > open && at < close,
      `${paid} מרונדר מחוץ ל-PaidTools - כלי בתשלום חזר לתוך ערימת הפאנלים החינמיים`,
    );
    // and only once - a second copy outside the region would pass the check above
    assert.equal(src.indexOf(paid, at + 1), -1, `${paid} מרונדר יותר מפעם אחת`);
  }
});

test('מה שנכנס ל-PDF הוא אובייקט נפרד מהמסך', () => {
  /*
    Netanel photographed a PDF export with the pre-departure check's on-screen
    card in it, clipped at the page edge - the same markup was being asked to be
    both a screen and a document, and a card laid out for a column does not lay
    out on A4.

    The rule that fixes it: the panel never prints, and the printable report is
    a SIBLING of the panel rather than a child. Nesting it back inside would
    hide it (a print-hidden parent wins over a print-visible child) or bring the
    card back into the PDF - both regressions, both invisible on screen.
  */
  const file = join('src', 'components', 'PreDepartureCheck.tsx');
  const src = stripComments(readFileSync(file, 'utf8'));

  const closePanel = src.indexOf('</PanelSection>');
  const printReport = src.indexOf('<PrintReport');
  assert.notEqual(closePanel, -1, 'PanelSection לא נמצא');
  assert.notEqual(printReport, -1, 'PrintReport לא מרונדר');
  assert.ok(printReport > closePanel, 'PrintReport חייב להיות אח של הפאנל, לא ילד שלו');

  // and the panel itself must be unconditionally print-hidden
  assert.ok(
    /className="print:hidden"/.test(src),
    'הפאנל של הבדיקה חייב להיות print:hidden תמיד - אחרת כרטיס המסך נכנס ל-PDF',
  );
});
