/**
 * CLAUDE.md is loaded into context at the start of every session, so its size
 * is a cost paid on every single request - and it is the one file in the repo
 * that hard rule 8 instructs every session to append to.
 *
 * That combination already failed once, and badly: the session log was kept
 * inside CLAUDE.md and the file reached 855,661 chars - about 411,000 tokens,
 * **twice the 200k context window**. The instructions could not be read in full,
 * and 98.2% of what was crowding them out was historical narrative. Worse, two
 * different append points were in use, one of them inside the text of hard rule
 * 8, which left rules 8 and 9 separated by 2,742 lines of log.
 *
 * The log now lives in `docs/session-log/<year-month>.md` and is not loaded
 * automatically. These tests exist so that cannot quietly come back - a growing
 * instructions file has no symptom until the day it stops fitting, and then
 * every request fails identically and forever (the log records exactly that
 * happening to the agent's own prompt).
 *
 * The budget is deliberately generous. This is not a style rule about brevity;
 * it is a ceiling far below the point where anything breaks, so that crossing it
 * is a real signal rather than noise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

/**
 * The measured ratio on this repo's real Hebrew/ASCII mix, from Anthropic's own
 * tokenizer rather than an estimate: ~0.48 tokens per char. The grounding-budget
 * section of CLAUDE.md records the measurement.
 */
const TOKENS_PER_CHAR = 0.48;

/**
 * 60,000 chars ~= 29k tokens. The brief is ~28k chars today, so this is room to
 * roughly double the actual instructions before anyone has to think about it -
 * while still being 14x below the 842k that broke it.
 */
const CLAUDE_MD_MAX_CHARS = 60_000;

test('CLAUDE.md stays small enough to actually be loaded', () => {
  const md = readFileSync('CLAUDE.md', 'utf8');
  assert.ok(
    md.length <= CLAUDE_MD_MAX_CHARS,
    `CLAUDE.md is ${md.length} chars (~${Math.round((md.length * TOKENS_PER_CHAR) / 1000)}k tokens), ` +
      `over the ${CLAUDE_MD_MAX_CHARS} budget. It is loaded into context every session. ` +
      `If this is session-log content, it belongs in docs/session-log/ - see hard rule 8. ` +
      `Do not raise this number to make the test pass; that is how it reached 411k tokens.`,
  );
});

test('no session-log entry is appended to CLAUDE.md', () => {
  const md = readFileSync('CLAUDE.md', 'utf8');
  /*
    Matches the heading shape every entry uses (`### 2026-09-27 - title`). The
    year is deliberately loose (`20\d\d`) so entries written in a later year are
    caught too - the point is the shape, not the specific year the bug happened in.
  */
  const strays = md.split('\n').filter((l) => /^### 20\d\d-\d\d/.test(l));
  assert.deepEqual(
    strays,
    [],
    `${strays.length} session-log entr${strays.length === 1 ? 'y' : 'ies'} found in CLAUDE.md. ` +
      `Append to the current month's file in docs/session-log/ instead (hard rule 8). ` +
      `First: ${JSON.stringify(strays[0] ?? '')}`,
  );
});

test('the hard rules are contiguous - nothing wedged between them', () => {
  /*
    The specific failure this guards: an entry appended after the opening quote
    inside rule 8's own text pushed rule 9 thousands of lines away. A reader (or
    a model) that stops at the first thing that does not look like a rule loses
    every rule after the wedge, and nothing about that is visible in a diff.
  */
  const lines = readFileSync('CLAUDE.md', 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('## Hard rules'));
  assert.ok(start >= 0, 'CLAUDE.md has no "## Hard rules" section');

  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  const section = lines.slice(start, end === -1 ? undefined : end);
  const numbers = section.flatMap((l) => {
    const m = /^(\d+[a-z]?)\. /.exec(l);
    return m ? [m[1]] : [];
  });

  assert.deepEqual(
    numbers,
    ['1', '2', '3', '4', '5', '6', '7a', '7', '8', '9'],
    'the hard rules are not the expected contiguous run - something is wedged ' +
      'between them, or a rule was added without updating this test. ' +
      `Got: ${numbers.join(',')}`,
  );
});

test('the session log is where hard rule 8 says it is, and has content', () => {
  /*
    Asserted rather than assumed, because the failure mode of the migration is
    silent: CLAUDE.md passes every test above if the log is simply deleted.
  */
  assert.ok(existsSync('docs/session-log'), 'docs/session-log/ is missing - the log was lost');

  const files = readdirSync('docs/session-log').filter((f) => /^20\d\d-\d\d\.md$/.test(f));
  assert.ok(files.length > 0, 'docs/session-log/ has no <year-month>.md files');

  const entries = files
    .map((f) => readFileSync(`docs/session-log/${f}`, 'utf8'))
    .flatMap((t) => t.split('\n').filter((l) => /^### 20\d\d-\d\d/.test(l)));

  /*
    205 is what the migration moved. The assertion is a floor, not an equality:
    the log only grows, and a test that had to be edited after every session is a
    test that gets deleted.
  */
  assert.ok(
    entries.length >= 205,
    `the log holds ${entries.length} entries, fewer than the 205 that were migrated - ` +
      `entries appear to have been lost`,
  );
});

test('CLAUDE.md points a reader at the log rather than hiding it', () => {
  const md = readFileSync('CLAUDE.md', 'utf8');
  assert.match(
    md,
    /docs\/session-log/,
    'CLAUDE.md does not mention docs/session-log - a record nobody can find is a ' +
      'record nobody reads, and hard rule 8 needs to name where to append',
  );
});
