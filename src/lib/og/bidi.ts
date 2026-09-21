/**
 * Reorders a Hebrew string into VISUAL order, for Satori.
 *
 * ## Why this has to exist
 *
 * `next/og` renders through Satori, and **Satori does not implement the
 * Unicode Bidirectional Algorithm** - checked in the bundled copy, there is no
 * bidi pass in it at all. It places glyphs in logical order, left to right, so
 * `direction: rtl` right-ALIGNS the block and reorders nothing inside it. A
 * Hebrew share card therefore comes out mirrored - a trip named "Italy and
 * Austria in summer" renders with every word and every letter back to front,
 * so the first glyph on the left is the last letter of the last word.
 *
 * That is not a subtle defect. It is the card a real person sends to their
 * friends, and it would read as gibberish to every one of them - worse than
 * the generic card it replaces. Verified by rendering the same strings in
 * Chrome and in Satori side by side, because reading a rendered image and
 * trusting the reading is exactly how this gets called correct when it is not.
 *
 * ## What this implements, and what it does not
 *
 * The real UBA, restricted to **one paragraph, base direction RTL, no explicit
 * embedding controls** - which is the whole of what a trip name, a stats line
 * and a brand mark ever are. Rules W4-W7, N1-N2, I1-I2 and L2, plus L4
 * mirroring. Two levels are reachable (1 for Hebrew, 2 for numbers and Latin),
 * which is why L2 stays short.
 *
 * A first attempt resolved whole runs instead of characters and got `+1`
 * wrong - it emitted `1+`, because a `+` bound to a number is UBA's ET rule
 * and a run-level pass cannot see it. Levels are not the fancier option here,
 * they are the shorter one.
 *
 * **Hebrew only, deliberately.** Arabic needs contextual shaping - letters
 * change form by position - so reordering its code points produces unjoined
 * nonsense. `hasUnsupportedRtl` reports it so the caller can decline rather
 * than ship something mangled. This site's UI copy is Hebrew and the catalog's
 * `nameLocal` fields are Latin, so the case is a guard rather than a gap.
 *
 * The caller renders the result with `direction: 'ltr'`: the string handed
 * over is already in the order the glyphs should appear.
 */

const HEBREW = /[֐-׿יִ-ﭏ]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN = /[A-Za-zÀ-ɏ]/;
const DIGIT = /[0-9]/;
/** ES/CS - separators that join two numbers: 1.5, 3,000, 12:30, 4/5 */
const NUM_SEP = /[.,:/]/;
/** ET - terminators that bind to an adjacent number: +1, -3, 50%, ₪20 */
const NUM_TERM = /[+\-%$₪°#]/;

/** 0 = L, 1 = R, 2 = EN, 3 = ES/CS, 4 = ET, 5 = other neutral */
const L = 0,
  R = 1,
  EN = 2,
  SEP = 3,
  TERM = 4,
  NEUTRAL = 5;

function initialClass(ch: string): number {
  if (HEBREW.test(ch)) return R;
  if (LATIN.test(ch)) return L;
  if (DIGIT.test(ch)) return EN;
  if (NUM_SEP.test(ch)) return SEP;
  if (NUM_TERM.test(ch)) return TERM;
  return NEUTRAL;
}

/** L4 - paired punctuation is drawn as its mirror inside a right-to-left run. */
const MIRROR: Record<string, string> = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«',
};

/** True when the string contains Hebrew - i.e. when reordering is needed. */
export function looksRtl(s: string): boolean {
  return HEBREW.test(s);
}

/** True when the string contains a right-to-left script this module refuses. */
export function hasUnsupportedRtl(s: string): boolean {
  return ARABIC.test(s);
}

/**
 * Logical order in, visual order out. Render the result with `direction: ltr`.
 *
 * A string with no Hebrew is returned untouched, so a Latin-only trip name
 * costs nothing and cannot be damaged.
 */
export function toVisualOrder(s: string): string {
  if (!looksRtl(s)) return s;

  const chars = [...s];
  const cls = chars.map(initialClass);
  const n = cls.length;

  // W4 - a single separator between two numbers is part of the number.
  for (let i = 1; i < n - 1; i++) {
    if (cls[i] === SEP && cls[i - 1] === EN && cls[i + 1] === EN) cls[i] = EN;
  }

  // W5 - a run of terminators adjacent to a number joins it.
  for (let i = 0; i < n; i++) {
    if (cls[i] !== TERM) continue;
    let j = i;
    while (j < n && cls[j] === TERM) j++;
    const touchesNumber = (i > 0 && cls[i - 1] === EN) || (j < n && cls[j] === EN);
    if (touchesNumber) for (let k = i; k < j; k++) cls[k] = EN;
    i = j - 1;
  }

  // W6 - anything still a separator or terminator is just a neutral.
  for (let i = 0; i < n; i++) if (cls[i] === SEP || cls[i] === TERM) cls[i] = NEUTRAL;

  // W7 - a number whose nearest preceding strong character is Latin is Latin.
  let lastStrong = R; // sor, from the RTL base direction
  for (let i = 0; i < n; i++) {
    if (cls[i] === L || cls[i] === R) lastStrong = cls[i];
    else if (cls[i] === EN && lastStrong === L) cls[i] = L;
  }

  /*
    N1/N2 - a run of neutrals between two characters of the same direction
    takes that direction, otherwise the base direction (R). Numbers count as R
    for this purpose, which is UBA's own rule and is what keeps a stats line of
    the shape "6 days · 22 stops" from splitting apart at every separator.
  */
  const sideOf = (c: number): number => (c === L ? L : R);
  for (let i = 0; i < n; i++) {
    if (cls[i] !== NEUTRAL) continue;
    let j = i;
    while (j < n && cls[j] === NEUTRAL) j++;
    const before = i === 0 ? R : sideOf(cls[i - 1]);
    const after = j === n ? R : sideOf(cls[j]);
    const resolved = before === after ? before : R;
    for (let k = i; k < j; k++) cls[k] = resolved;
    i = j - 1;
  }

  /*
    I1/I2 with an odd base level: Hebrew stays at 1, Latin and numbers are
    bumped to 2. Two levels is all this text can reach without explicit
    embedding controls.
  */
  const level = cls.map((c) => (c === R ? 1 : 2));

  // L2 - from the highest level down to the lowest odd one, reverse every
  // contiguous stretch at that level or above. A multi-digit number is
  // reversed at level 2 and then reversed back as part of the line at level 1,
  // which is exactly how it ends up LTR inside an RTL line.
  const out = chars.slice();
  for (const target of [2, 1]) {
    let i = 0;
    while (i < n) {
      if (level[i] < target) {
        i++;
        continue;
      }
      let j = i;
      while (j < n && level[j] >= target) j++;
      const slice = out.slice(i, j).reverse();
      for (let k = i; k < j; k++) out[k] = slice[k - i];
      // The levels travel with their characters.
      const lv = level.slice(i, j).reverse();
      for (let k = i; k < j; k++) level[k] = lv[k - i];
      i = j;
    }
  }

  // L4 - mirror paired punctuation that ended up in a right-to-left run.
  for (let i = 0; i < n; i++) {
    if (level[i] % 2 === 1 && MIRROR[out[i]]) out[i] = MIRROR[out[i]];
  }

  return out.join('');
}
