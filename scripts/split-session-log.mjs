/**
 * One-shot migration: lift the session log out of CLAUDE.md into
 * docs/session-log/<year-month>.md.
 *
 * ## Why this had to happen
 *
 * CLAUDE.md is the project-instructions file, loaded into context at the start
 * of every session. It had reached 842,507 chars - about 404,000 tokens at the
 * 0.48 tok/char ratio this repo measured with Anthropic's own tokenizer - which
 * is **twice the 200k context window**. The instructions could not be loaded in
 * full, and 98.2% of what was crowding them out was historical narrative.
 *
 * That is precisely the failure the log itself records in the "prompt is too
 * long" entry: a block that only grows, until every request fails identically
 * and forever. Hard rule 8 requires a dated entry per session, so the file was
 * guaranteed to keep growing. The rule is good; its storage was wrong.
 *
 * ## The second defect, which is why this is a script and not a hand edit
 *
 * Somebody once appended an entry directly after the opening quote inside the
 * TEXT of hard rule 8 ("...appending a dated entry to \"## Session log"), and
 * every later session in that era followed. The result: 2,742 lines of log sat
 * between rule 8 and rule 9, so the hard-rules block - the most load-bearing
 * part of the file - was not contiguous and rule 9 was 2,749 lines from rule 8.
 *
 * So the log lives in TWO places in the file, and a naive "cut everything after
 * ## Session log" would have silently dropped 142 of the 205 entries.
 *
 * ## What this guarantees
 *
 * Nothing is rewritten and nothing is reordered - entries are moved verbatim, in
 * their existing file order, and only partitioned by the month in their own
 * heading. The script asserts, and refuses to write if any of these fail:
 *   - every one of the 205 `### 2026-` headings survives
 *   - every moved line lands inside exactly one entry (no orphaned prose)
 *   - the moved content is byte-identical to what was removed
 *   - the rebuilt CLAUDE.md has rules 1-9 contiguous
 *
 * Run once: node scripts/split-session-log.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const SRC = 'CLAUDE.md';
const OUT_DIR = 'docs/session-log';

/*
  The two log regions, as 0-indexed [start, end) slices of the line array.
  These are literal because the damage is literal - see the header. They are
  asserted against their expected boundary text below, so a file that has
  already been migrated (or edited) fails loudly instead of being mangled.
*/
const BLOCK_A = [254, 2996]; // wrongly embedded inside the text of hard rule 8
const BLOCK_B = [3182, null]; // after the real `## Session log` heading, to EOF

const raw = readFileSync(SRC, 'utf8');
const lines = raw.split('\n');

const die = (msg) => {
  console.error(`REFUSING TO WRITE: ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
};

// ---- assert the file is the shape this script was written for ----
const expect = (idx, prefix, what) => {
  if (!(lines[idx] ?? '').startsWith(prefix)) {
    die(`line ${idx + 1} should start ${JSON.stringify(prefix)} (${what}) but is ${JSON.stringify(lines[idx])}`);
  }
};
expect(231, '## Hard rules', 'hard rules heading');
expect(251, '8. Every work session ALSO ends by appending', 'rule 8 opening');
expect(252, '   "## Session log', 'the stray quote that became an append point');
expect(254, '### 2026-', 'first embedded entry');
expect(2996, '" (bottom of this file) with:', 'where rule 8 resumes');
expect(3000, '9. **Developer notes are English-only', 'rule 9');
expect(3181, '## Session log', 'the real session-log heading');

const blockA = lines.slice(BLOCK_A[0], BLOCK_A[1]);
const blockB = lines.slice(BLOCK_B[0], BLOCK_B[1] ?? lines.length);

// ---- partition into entries, preserving order ----
/** @type {{month:string, lines:string[]}[]} */
const entries = [];
let orphaned = 0;
for (const blk of [blockA, blockB]) {
  for (const line of blk) {
    const m = /^### (2026-\d\d)/.exec(line);
    if (m) entries.push({ month: m[1], lines: [line] });
    else if (entries.length) entries.at(-1).lines.push(line);
    else if (line.trim() !== '') orphaned++; // non-blank prose before any heading
  }
}
if (orphaned) die(`${orphaned} non-blank lines sat outside any entry - they would be lost`);
if (entries.length !== 205) die(`expected 205 entries, partitioned ${entries.length}`);

// ---- byte accounting: moved content must equal removed content ----
const removed = [...blockA, ...blockB].filter((l) => l.trim() !== '').join('\n');
const moved = entries.flatMap((e) => e.lines).filter((l) => l.trim() !== '').join('\n');
if (removed !== moved) die('moved content is not byte-identical to removed content');

// ---- group by month ----
const byMonth = new Map();
for (const e of entries) {
  if (!byMonth.has(e.month)) byMonth.set(e.month, []);
  byMonth.get(e.month).push(e);
}

mkdirSync(OUT_DIR, { recursive: true });

const months = [...byMonth.keys()].sort();
const written = [];
for (const month of months) {
  const es = byMonth.get(month);
  const body = es.map((e) => e.lines.join('\n').replace(/\s+$/, '')).join('\n\n');
  const head = [
    `# Session log - ${month}`,
    '',
    `${es.length} entries. Moved verbatim out of CLAUDE.md on 2026-09-27 (see`,
    '`scripts/split-session-log.mjs` for why and for the guarantees).',
    '',
    '**Order is the order they had in CLAUDE.md, which is not strictly',
    'chronological** - two different append points were in use, and entries were',
    'not reordered here because the date is in every heading and reordering 205',
    'entries would have risked the content to gain nothing.',
    '',
    '**Hebrew entries are historical record and stay as written** (hard rule 9',
    'made developer notes English-only from 2026-08-17 onward).',
    '',
    '---',
    '',
  ].join('\n');
  const file = `${OUT_DIR}/${month}.md`;
  writeFileSync(file, `${head}${body}\n`, 'utf8');
  written.push({ month, file, entries: es.length, chars: body.length });
}

// ---- rebuild CLAUDE.md ----
const rule8 = [
  '8. Every work session ALSO ends by appending a dated entry to the current',
  '   month\'s file in `docs/session-log/` (create it if the month is new) with:',
  '   (a) what was built/changed and in which files, (b) product decisions made',
  '   and why, (c) anything left broken or deferred, (d) what the next session',
  '   should know. No exceptions - docs-only sessions included.',
  '   **Do NOT append it to this file.** CLAUDE.md is loaded into context every',
  '   session; the log used to live here and reached ~404k tokens, twice the',
  '   context window, which meant these instructions could no longer be read in',
  '   full. Keep this file the brief; the log is the record.',
].join('\n');

const pointer = [
  '## Session log',
  '',
  'The log lives in `docs/session-log/<year-month>.md` - it is the record of what',
  'was built and why, and it is **not** loaded into context automatically. Read a',
  "month's file when you need the history of a decision; append to the current",
  "month's file at the end of every session (hard rule 8).",
  '',
  ...written.map(
    (w) => `- \`docs/session-log/${w.month}.md\` - ${w.entries} entries`,
  ),
  '',
  `${entries.length} entries total, moved out of this file on 2026-09-27.`,
  '',
  '**A caveat worth keeping**, because the log contradicts itself in places: an',
  'entry records what was true when it was written. Several were superseded by a',
  'later entry (the photo-width diagnosis, the premium quota arithmetic, the',
  'index-format ceiling). The `## Grounding index budget` section above is',
  'authoritative over any session-log figure, and a number in an old entry should',
  'be re-measured rather than trusted.',
].join('\n');

const rebuilt = [
  lines.slice(0, 251).join('\n'), // everything through rule 7
  rule8,
  lines.slice(3000, 3181).join('\n'), // rule 9 through "Success metrics"
  pointer,
  '',
].join('\n');

// ---- assert the rebuild is sane before writing ----
const ruleLines = rebuilt
  .split('\n')
  .map((l, i) => [i, l])
  .filter(([, l]) => /^\d+[a-z]?\. /.test(l));
const hardRulesStart = rebuilt.split('\n').findIndex((l) => l.startsWith('## Hard rules'));
const nums = ruleLines
  .filter(([i]) => i > hardRulesStart)
  .map(([, l]) => l.match(/^(\d+[a-z]?)\./)[1]);
const seq = nums.slice(0, 10).join(',');
if (!seq.startsWith('1,2,3,4,5,6,7a,7,8,9')) {
  die(`hard rules are still not contiguous - got ${seq}`);
}
if (/^### 2026-/m.test(rebuilt)) die('a session-log entry survived in CLAUDE.md');

writeFileSync(SRC, rebuilt, 'utf8');

const pct = ((1 - rebuilt.length / raw.length) * 100).toFixed(1);
console.log('CLAUDE.md  %d -> %d chars  (-%s%%)', raw.length, rebuilt.length, pct);
console.log('  est tokens %dk -> %dk', Math.round(raw.length * 0.48 / 1000), Math.round(rebuilt.length * 0.48 / 1000));
console.log('hard rules contiguous: %s', seq);
for (const w of written) console.log('  %s  %d entries  %d chars', w.file, w.entries, w.chars);
console.log('%d entries moved, byte-identical.', entries.length);
if (!existsSync(`${OUT_DIR}/${months[0]}.md`)) die('output missing');
