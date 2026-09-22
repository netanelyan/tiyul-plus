/**
 * Accessibility, guarded as a class rather than as a list of fixed instances.
 *
 * Three of the four findings in the September audit were things no type check,
 * lint rule or existing test could see, and all three come back the moment
 * somebody writes one more component on a day nobody was thinking about it:
 *
 * 1. **A muted text colour below the AA contrast floor.** The accessibility
 *    statement admitted this in words ("roughly 2.4 to 4.2"); here it is a
 *    number per step, computed from the real tokens.
 * 2. **A form control with no accessible name**, relying on its placeholder.
 * 3. **The site-wide keyboard focus indicator being removed** from
 *    `globals.css`, which would silently return the site to "some components
 *    mark focus and some do not".
 *
 * The contrast numbers are computed here rather than pasted, so changing a
 * token in `globals.css` moves the threshold with it instead of leaving a
 * comment that used to be true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const FILES = walk('src').filter((f) => !f.endsWith('.test.tsx'));

/**
 * Comments are stripped before scanning - they are exactly where what *used*
 * to be true is written down, and this codebase's comments quote old class
 * names constantly.
 *
 * **Both patterns are line-anchored, and that is not tidiness.** The obvious
 * `/\*[\s\S]*?\*\//` ate this file's own findings: `accept="image/*"` opens a
 * block comment as far as a regex is concerned, so everything from there to
 * the next `*​/` vanished - including the `aria-label` on the very input being
 * checked, which was then reported as unnamed. The same applies to `//` inside
 * a URL. Comments in this project always start their own line, so requiring
 * that is both accurate and safe.
 */
const stripComments = (src: string) =>
  src
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

/* ---------- WCAG contrast, from the tokens themselves ---------- */

const CSS = readFileSync(join('src', 'app', 'globals.css'), 'utf8');
/** Reads a token out of the @theme block, so the test cannot drift from the palette. */
function token(name: string): [number, number, number] {
  const m = CSS.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `--color-${name} is missing from globals.css`);
  const h = m![1];
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: number[]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** What `text-night/45` actually paints: the token composited over the page. */
const over = (fg: number[], bg: number[], alpha: number) =>
  fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

/** WCAG AA for text. The large-text allowance (3.0) is deliberately not used:
 *  a utility class carries no font size, so the floor has to hold at any size. */
const AA = 4.5;

/**
 * The alpha steps a file uses for text, **ignoring elements hidden from the
 * accessibility tree**. WCAG 1.4.3 exempts what is decorative, and
 * `aria-hidden` is how that is declared here - a watermark step number behind
 * a card, the bullet glyph inside an `<li>` that is already a bullet. Without
 * this the only way to pass would be to darken decoration nobody reads, or to
 * write an allowlist of files, and an allowlist is what lets a real failure in
 * next to a fake one.
 */
function textAlphas(src: string, token: 'night' | 'cream'): number[] {
  const out: number[] = [];
  for (const m of src.matchAll(new RegExp(`text-${token}\\/(\\d+)\\b`, 'g'))) {
    const openedAt = src.lastIndexOf('<', m.index);
    const tag = openedAt === -1 ? '' : openingTag(src, openedAt);
    if (/\baria-hidden\b/.test(tag)) continue;
    out.push(Number(m[1]));
  }
  return out;
}

test('**כל דרגת עמעום של טקסט עומדת ב-AA מול הרקע שלה**', () => {
  const night = token('night');
  const cream = token('cream');
  const shell = token('shell');

  const used = new Set<number>();
  for (const file of FILES) {
    for (const a of textAlphas(stripComments(readFileSync(file, 'utf8')), 'night')) used.add(a);
  }

  const failing = [...used]
    .sort((a, b) => a - b)
    .filter((a) => contrast(over(night, cream, a / 100), cream) < AA)
    .map((a) => {
      const c = contrast(over(night, cream, a / 100), cream).toFixed(2);
      const s = contrast(over(night, shell, a / 100), shell).toFixed(2);
      return `text-night/${a} → ${c} על cream, ${s} על shell`;
    });

  assert.deepEqual(
    failing,
    [],
    `דרגות עמעום מתחת ל-${AA}:1. הרצפה היא text-night/65 (4.88). מצב ניגודיות גבוהה אינו פתרון - הוא כבוי כברירת מחדל:\n${failing.join('\n')}`,
  );
});

test('כל דרגת עמעום של טקסט קרם על רקע לילה עומדת ב-AA', () => {
  const night = token('night');
  const cream = token('cream');

  const used = new Set<number>();
  for (const file of FILES) {
    for (const a of textAlphas(stripComments(readFileSync(file, 'utf8')), 'cream')) used.add(a);
  }

  const failing = [...used]
    .sort((a, b) => a - b)
    .filter((a) => contrast(over(cream, night, a / 100), night) < AA)
    .map((a) => `text-cream/${a} → ${contrast(over(cream, night, a / 100), night).toFixed(2)}`);

  assert.deepEqual(failing, [], `מתחת ל-${AA}:1 על הרקע הכהה:\n${failing.join('\n')}`);
});

/**
 * The brand accent, in the four roles it actually has.
 *
 * It was #ff5941 and measured 2.90:1 in three of them. The values live in
 * `globals.css`, so this reads them from there rather than restating them - a
 * pasted number is how a comment ends up describing a colour nobody uses any
 * more.
 *
 * The fourth assertion is the one worth keeping: **sunset-deep must stay darker
 * than sunset.** It is the hover step, and when sunset was darkened the old
 * deep value became lighter than the colour it is supposed to darken.
 */
test('**גוון ההדגשה עומד ב-AA בכל אחד מהתפקידים שלו**', () => {
  const sunset = token('sunset');
  const deep = token('sunset-deep');
  const glow = token('sunset-glow');
  const cream = token('cream');
  const night = token('night');

  const roles: [string, number, number][] = [
    ['טקסט קרם על כפתור בגוון sunset', contrast(cream, sunset), AA],
    ['sunset כצבע טקסט על רקע cream', contrast(sunset, cream), AA],
    ['טקסט קרם על מצב hover (sunset-deep)', contrast(cream, deep), AA],
    ['sunset-deep כצבע טקסט על cream', contrast(deep, cream), AA],
    // The dark bands keep the original bright coral - the pair inverts there.
    ['sunset-glow כצבע טקסט על רקע night', contrast(glow, night), AA],
    // A focus indicator is a UI component, not text: the bar is 3.0.
    ['טבעת המיקוד מול רקע cream', contrast(sunset, cream), 3],
  ];

  const failing = roles
    .filter(([, got, need]) => got < need)
    .map(([name, got, need]) => `${name}: ${got.toFixed(2)} (נדרש ${need})`);
  assert.deepEqual(failing, [], `\n${failing.join('\n')}`);

  assert.ok(
    luminance(deep) < luminance(sunset),
    'sunset-deep הוא מצב ה-hover וחייב להישאר כהה מ-sunset',
  );
  assert.ok(
    luminance(glow) > luminance(sunset),
    'sunset-glow הוא הגוון לרקעים כהים וחייב להיות בהיר מ-sunset',
  );
});

/* ---------- The focus indicator ---------- */

test('**קיים סימון מיקוד מקלדת גורף ב-globals.css**', () => {
  const rule = CSS.match(/(^|\n):focus-visible\s*\{([^}]*)\}/);
  assert.ok(rule, 'נמחק כלל :focus-visible הגורף - ניווט במקלדת חוזר להיות לא עקבי');
  assert.match(
    rule![2],
    /outline:\s*\d+px\s+solid/,
    ':focus-visible קיים אך אינו מצייר outline',
  );
});

/* ---------- Every control has an accessible name ---------- */

/** The opening tag starting at `i`, tolerating braces and nested JSX expressions. */
function openingTag(src: string, i: number): string {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return src.slice(i, j + 1);
  }
  return src.slice(i, i + 500);
}

test('**לכל שדה קלט יש שם נגיש - placeholder אינו תווית**', () => {
  const unnamed: string[] = [];
  for (const file of FILES) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/<(input|textarea|select)\b/g)) {
      const tag = openingTag(src, m.index);
      // display:none removes it from the accessibility tree and from the tab
      // order - the visible trigger button is what needs the name there.
      if (/className="[^"]*\bhidden\b/.test(tag)) continue;
      if (/\btype=["']hidden["']/.test(tag)) continue;
      // Named directly, or by an id a <label htmlFor> can point at, or by a
      // <label> wrapping it (the admin panels do this, with visible text).
      if (/\b(aria-label|aria-labelledby|id)=/.test(tag)) continue;
      /*
        Wrapped in a <label> with visible text - which the admin panels use and
        which is a perfectly good name. Counted from the top of the file rather
        than by looking back a fixed number of characters: the catalog search
        field has a whole inline SVG between its <label> and its <input>, and a
        400-character window reported it as unnamed when it was not.
      */
      const before = src.slice(0, m.index);
      const open = (before.match(/<label\b/g) ?? []).length;
      const close = (before.match(/<\/label>/g) ?? []).length;
      if (open > close) continue;
      const line = src.slice(0, m.index).split('\n').length;
      unnamed.push(`${file}:${line} <${m[1]}>`);
    }
  }
  assert.deepEqual(
    unnamed,
    [],
    `שדות ללא שם נגיש. placeholder נעלם ברגע שמקלידים ואינו נחשב תווית:\n${unnamed.join('\n')}`,
  );
});
