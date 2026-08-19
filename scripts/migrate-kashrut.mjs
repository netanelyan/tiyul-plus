/**
 * Migrate the 53 `kosherVerification` records to the structured `kashrut` model.
 *
 * Run --dry first and READ ALL 53. This script splits an overloaded free-text
 * string into fields, and the one thing it must never do is promote a caveat
 * into a certifying body or invent a date.
 *
 *   node scripts/migrate-kashrut.mjs --dry
 *   node scripts/migrate-kashrut.mjs
 *
 * Rules held here:
 *  - `checked` is ALWAYS null. No date was ever recorded (lastChecked was the
 *    literal "pending-review" in 53 of 53), so there is nothing to carry over
 *    and a plausible-looking date would be a fabrication.
 *  - `sourceType` is ALWAYS 'legacy-unverified' for the same reason.
 *  - The original string is preserved verbatim in `legacySupervision`.
 *
 * Two things this got wrong on the first pass, both worth remembering:
 *  1. A single-line regex matched only 31 of 53 - the other 22 records are
 *     written as multi-line objects. It reported success on 31 and silently
 *     skipped the rest. The matcher below handles both shapes and the script
 *     ASSERTS the total, so a partial match fails loudly instead of quietly.
 *  2. `\b` does not work as a word boundary against Hebrew, so a naive
 *     word-boundary match on the word for "dairy" mangled the record reading
 *     "OK Kosher, dairy and chalav yisrael" into a body named "OK Kosher and".
 *     Parsing is now done on SEGMENTS split by the separators the strings
 *     actually use, never by surgery on the whole string.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const FILE = new URL('../src/data/destinations.ts', import.meta.url);
const EXPECTED = 53;

/** Descriptors a certificate itself carries. Reported, never our assessment. */
const DESCRIPTORS = ['גלאט', 'מהדרין', 'חלב ישראל'];

/** A segment that is a caveat about the report, not part of the body's name. */
const isCaveat = (s) => /^כפי שדווח|^לוודא מול|^לוודא ב/.test(s);

/** A segment that is operational logistics. */
const isArrangement = (s) =>
  /ארוחות|מוצרים ארוזים|בתיאום מראש|בהרשמה|תיאום מראש/.test(s);

/**
 * A segment that says supervision exists but does NOT name a body.
 * The phrase meaning "local supervision" is true, and is not a name. Recording it as
 * a body would put a phrase where a traveler expects an institution.
 */
const isUnnamedBody = (s) => /^השגחה מקומית$|^השגחה$/.test(s);

/** A segment that is not a certifying body at all. */
const isNotABody = (s) => /^חנות$|^סופר$/.test(s);

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
function unesc(s) {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/**
 * Clean up what descriptor/diet removal leaves behind, without damaging a real
 * name. Two things this must NOT do, both of which the first version did:
 *  - strip a word-initial vav. "Vaad HaKashrus" (of Las Vegas) lost its first
 *    letter and became "Ed HaKashrus". Only a STANDALONE vav is a conjunction.
 *  - leave a broken parenthesis. "(glatt kosher)" minus its descriptor left
 *    "( kosher)" sitting in a body name.
 */
function tidy(s) {
  let out = s;
  // a standalone vav conjunction left behind by a removed descriptor
  out = out.replace(/(^|\s),?\s*ו(?=\s|$)/g, '$1');
  // parens whose content is now empty or only the filler word "kosher"
  out = out.replace(/\(\s*(?:כשר)?\s*\)/g, '');
  out = out
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^[\s,;·-]+|[\s,;·-]+$/g, '')
    .replace(/^ב?השגחת\s+/, '')
    .trim();
  return out;
}

function parse(original) {
  // --- absence, detected before anything else -------------------------------
  // One record uses the supervision field to say there is NO published
  // supervision. Under the old model that was indistinguishable from a body
  // name; it is a different KNOWLEDGE state and has to be caught first.
  if (/לא פורסמה השגחה/.test(original)) {
    return {
      knowledge: 'none-found',
      certifications: [],
      flags: ['ABSENCE -> none-found'],
    };
  }

  // Split on " - " ONLY, never on commas. A comma inside a body name is part
  // of the name ("Chabad House Arusha, Tanzania"), and splitting on it rewrote
  // that as "Arusha - Tanzania". Descriptors that happen to sit after a comma are
  // removed from within the segment instead, below.
  const segments = original
    .split(/\s+[-–]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const descriptors = [];
  const arrangements = [];
  const bodies = [];
  let diet;
  let unnamed = false;
  const flags = [];

  for (let seg of segments) {
    if (isCaveat(seg)) continue;
    if (isArrangement(seg)) {
      arrangements.push(seg);
      continue;
    }

    // Pull descriptors and diet out of the segment. Longest first, so
    // "chalav yisrael" is taken before "dairy" can claim its letters.
    for (const d of DESCRIPTORS) {
      if (seg.includes(d)) {
        descriptors.push(d);
        seg = seg.split(d).join(' ');
      }
    }
    // Diet words, matched as whole segments or as leading/trailing words with
    // an explicit Hebrew-letter guard rather than \b.
    const dietWord = (w) => new RegExp(`(^|[^\\u0590-\\u05FF])${w}($|[^\\u0590-\\u05FF])`);
    if (dietWord('חלבי').test(seg)) {
      diet = diet === 'meat' ? 'meat-and-dairy' : 'dairy';
      seg = seg.replace(dietWord('חלבי'), '$1$2');
    }
    if (dietWord('בשרי').test(seg)) {
      diet = diet === 'dairy' ? 'meat-and-dairy' : 'meat';
      seg = seg.replace(dietWord('בשרי'), '$1$2');
    }

    seg = tidy(seg);

    if (!seg) continue;
    if (isUnnamedBody(seg)) {
      unnamed = true;
      continue;
    }
    if (isNotABody(seg)) {
      flags.push(`segment ${JSON.stringify(seg)} is not a certifying body - dropped`);
      continue;
    }
    bodies.push(seg);
  }

  // --- fold the body segments into one certification ------------------------
  // A Latin acronym and its Hebrew expansion are ONE body written two ways
  // ("KLBD - the London Beth Din"), not two certifications. The Hebrew is the
  // display name and the Latin is what a traveler searches for.
  let body = '';
  let bodyLatin;
  const latinOnly = bodies.filter((b) => /^[A-Za-z][A-Za-z .&'-]*$/.test(b));
  const hebrew = bodies.filter((b) => !/^[A-Za-z][A-Za-z .&'-]*$/.test(b));

  if (hebrew.length) {
    body = hebrew.join(' - ');
    if (latinOnly.length) bodyLatin = latinOnly.join(' ');
    // a parenthesised Latin phrase inside the Hebrew name
    const paren = body.match(/\(([A-Za-z][A-Za-z .&'-]*)\)/);
    if (paren) {
      bodyLatin = bodyLatin ?? paren[1].trim();
      body = body.replace(paren[0], '').replace(/\s+/g, ' ').trim();
    }
  } else if (latinOnly.length) {
    body = latinOnly.join(' ');
  }

  // A Latin body whose leading token is an acronym: keep the whole as body.
  if (body && !bodyLatin && /^[A-Za-z]/.test(body)) bodyLatin = body;

  const certifications = body
    ? [
        {
          body,
          ...(bodyLatin && bodyLatin !== body ? { bodyLatin } : {}),
          ...(descriptors.length ? { descriptors: [...new Set(descriptors)] } : {}),
        },
      ]
    : [];

  let knowledge;
  if (certifications.length || unnamed) knowledge = 'certified';
  else knowledge = 'unknown';

  if (unnamed && !certifications.length) flags.push('supervision exists, body NOT named');
  if (knowledge === 'unknown') flags.push('no body extracted -> unknown');

  return {
    knowledge,
    certifications,
    diet,
    arrangement: arrangements.length ? arrangements.join(', ') : undefined,
    flags,
  };
}

function emit(indent, p, original) {
  const parts = [`knowledge: '${p.knowledge}'`];
  if (p.certifications.length) {
    const cs = p.certifications
      .map((c) => {
        const bits = [`body: '${esc(c.body)}'`];
        if (c.bodyLatin) bits.push(`bodyLatin: '${esc(c.bodyLatin)}'`);
        if (c.descriptors?.length)
          bits.push(`descriptors: [${c.descriptors.map((d) => `'${esc(d)}'`).join(', ')}]`);
        return `{ ${bits.join(', ')} }`;
      })
      .join(', ');
    parts.push(`certifications: [${cs}]`);
  }
  if (p.diet) parts.push(`diet: '${p.diet}'`);
  if (p.arrangement) parts.push(`arrangement: '${esc(p.arrangement)}'`);
  parts.push(
    `provenance: { source: 'קטלוג טיול+ (דיווח קודם)', sourceType: 'legacy-unverified', checked: null }`,
  );
  parts.push(`legacySupervision: '${esc(original)}'`);
  return `${indent}kashrut: { ${parts.join(', ')} },`;
}

// ---------------------------------------------------------------- rewrite
const src = readFileSync(FILE, 'utf8');
const lines = src.split(/\r?\n/);
const out = [];
const review = [];

const ONE_LINE =
  /^(\s*)kosherVerification: \{ source: '([^']*)', lastChecked: '([^']*)', supervision: '((?:[^'\\]|\\.)*)' \},\s*$/;
const OPEN = /^(\s*)kosherVerification: \{\s*$/;
const SUPERVISION = /^\s*supervision: '((?:[^'\\]|\\.)*)',?\s*$/;

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];

  const one = line.match(ONE_LINE);
  if (one) {
    const original = unesc(one[4]);
    const parsed = parse(original);
    review.push({ original, parsed });
    out.push(emit(one[1], parsed, original));
    continue;
  }

  const open = line.match(OPEN);
  if (open) {
    // consume through the closing brace, taking the supervision line
    let supervision = null;
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      const s = lines[j].match(SUPERVISION);
      if (s) supervision = unesc(s[1]);
      if (/^\s*\},?\s*$/.test(lines[j])) break;
    }
    if (supervision === null) {
      throw new Error(`kosherVerification block at line ${i + 1} has no supervision field`);
    }
    const parsed = parse(supervision);
    review.push({ original: supervision, parsed });
    out.push(emit(open[1], parsed, supervision));
    i = j;
    continue;
  }

  out.push(line);
}

console.log(`Found ${review.length} kosherVerification records (expected ${EXPECTED}).\n`);
for (const [i, r] of review.entries()) {
  const p = r.parsed;
  const c = p.certifications[0];
  console.log(`${String(i + 1).padStart(2)}. ${r.original}`);
  console.log(
    `    -> ${p.knowledge}` +
      (c
        ? ` | body=${JSON.stringify(c.body)}` +
          (c.bodyLatin ? ` latin=${JSON.stringify(c.bodyLatin)}` : '') +
          (c.descriptors ? ` desc=${JSON.stringify(c.descriptors)}` : '')
        : '') +
      (p.diet ? ` | diet=${p.diet}` : '') +
      (p.arrangement ? ` | arr=${JSON.stringify(p.arrangement)}` : ''),
  );
  for (const f of p.flags) console.log(`       !! ${f}`);
}

// Fail loudly on a partial match rather than reporting success on a subset.
if (review.length !== EXPECTED) {
  throw new Error(
    `Expected ${EXPECTED} records, matched ${review.length}. Refusing to write a partial migration.`,
  );
}

const summary = review.reduce((a, r) => {
  a[r.parsed.knowledge] = (a[r.parsed.knowledge] ?? 0) + 1;
  return a;
}, {});
console.log('\nknowledge:', JSON.stringify(summary));
console.log('with diet:', review.filter((r) => r.parsed.diet).length);
console.log('with arrangement:', review.filter((r) => r.parsed.arrangement).length);

if (!DRY) {
  writeFileSync(FILE, out.join('\n'), 'utf8');
  console.log(`\nWROTE ${review.length} records to src/data/destinations.ts`);
} else {
  console.log('\n(dry run - nothing written)');
}
