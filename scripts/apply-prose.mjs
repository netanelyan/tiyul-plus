// Replaces place descriptions in src/data/destinations.ts from a JSON map
// { placeId: newDescription }, in house style, touching nothing else in the
// entry. Refuses an id it cannot find exactly once, an empty text, and any
// text that would trip the validator's hours/price rule - a clock time or a
// currency amount goes stale silently, and the whole point of richer prose is
// text that stays true.
//
// Run: node scripts/apply-prose.mjs prose.json
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/data/destinations.ts';
const [, , inFile] = process.argv;
if (!inFile) {
  console.error('usage: apply-prose.mjs prose.json');
  process.exit(2);
}
const prose = JSON.parse(readFileSync(inFile, 'utf8'));
let src = readFileSync(FILE, 'utf8');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';

const HOURS_RE = /(?:\d{1,2}:\d{2})|שעות\s*(?:ה)?פתיחה|סגור(?:ה|ים)?\s*(?:בימי|ביום|בשבת)|פתוח(?:ה|ים)?\s*(?:עד|24\/7)/;
const PRICE_RE = /₪|\$\d|€\s?\d|\d+\s*(?:יורו|דולר|שקלים|שקל)|עלות\s*הכניסה\s*\d/;

function q(s) {
  const str = String(s);
  if (str.includes("'") && !str.includes('"')) return `"${str}"`;
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

let n = 0;
for (const [id, text] of Object.entries(prose)) {
  const t = String(text).trim();
  if (!t) throw new Error(`${id}: empty text`);
  if (HOURS_RE.test(t)) throw new Error(`${id}: text states a clock time / opening hours`);
  if (PRICE_RE.test(t)) throw new Error(`${id}: text states a price`);
  if (/\*\*|__|<[a-z]/.test(t)) throw new Error(`${id}: markup in text`);
  const idLine = `        id: '${id}',${EOL}`;
  const at = src.indexOf(idLine);
  if (at < 0) throw new Error(`${id}: not found`);
  if (src.indexOf(idLine, at + 1) >= 0) throw new Error(`${id}: id not unique`);
  const end = src.indexOf(`${EOL}      },`, at);
  const block = src.slice(at, end);
  // description: on one line, or on the next line (prettier wraps long strings)
  const re = /(        description:)(?:\r?\n          | )('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),/;
  const m = re.exec(block);
  if (!m) throw new Error(`${id}: description not found in block`);
  const replacement = `${m[1]}${EOL}          ${q(t)},`;
  src = src.slice(0, at) + block.replace(m[0], replacement) + src.slice(end);
  n++;
}
writeFileSync(FILE, src);
console.log(`rewrote ${n} descriptions`);
