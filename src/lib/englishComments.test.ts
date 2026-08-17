/**
 * Guard: code comments are English-only, project-wide.
 *
 * Policy (Netanel, 2026-08-17): no Hebrew in any developer notes - comments,
 * SQL comments, script comments. Hebrew stays where it is the PRODUCT (UI
 * strings, catalog data, test names, docs addressed to Netanel) - those are
 * string literals and markdown, which this test deliberately does not touch.
 *
 * The check is line-based on purpose: a line whose trimmed start is a comment
 * marker (//, *, /*, {/*, --, #) must not contain Hebrew characters. Trailing
 * inline comments after code are ALSO checked by splitting on `//` outside of
 * quotes with a cheap heuristic. This catches the realistic regression (a
 * session writing a Hebrew comment) without needing a real parser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HEBREW = /[֐-׿]/;
const ROOT = join(import.meta.dirname, '..', '..');

const SCAN_DIRS = ['src', 'scripts', 'public', 'supabase'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.sql', '.css']);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // directory may not exist (e.g. before the sql move) - fine
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTS.has(name.slice(name.lastIndexOf('.')))) yield full;
  }
}

/** Trailing `// ...` comment text, or null. Skips protocol `://` and quoted `//`. */
function trailingLineComment(line: string): string | null {
  let inS: string | null = null;
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i];
    if (inS) {
      if (c === '\\') i++;
      else if (c === inS) inS = null;
    } else if (c === "'" || c === '"' || c === '`') {
      inS = c;
    } else if (c === '/' && line[i + 1] === '/') {
      return line.slice(i + 2);
    }
  }
  return null;
}

const COMMENT_START = /^\s*(\/\/|\/\*|\*|\{\/\*|--|#)/;

test('no Hebrew in comments anywhere in src/, scripts/, public/, supabase/', () => {
  const offenders: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const lines = readFileSync(file, 'utf8').split('\n');
      let inBlock = false;
      lines.forEach((line, i) => {
        const isCommentLine = COMMENT_START.test(line) || inBlock;
        // track /* ... */ blocks so continuation lines without a leading *
        // are still covered (rare in this codebase, but cheap to handle)
        if (/\/\*/.test(line) && !/\*\//.test(line.slice(line.indexOf('/*') + 2))) inBlock = true;
        if (/\*\//.test(line)) inBlock = false;
        if (isCommentLine) {
          if (HEBREW.test(line)) offenders.push(`${file}:${i + 1}`);
          return;
        }
        const trailing = trailingLineComment(line);
        if (trailing && HEBREW.test(trailing)) offenders.push(`${file}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(
    offenders.slice(0, 40),
    [],
    `Hebrew found in comments (${offenders.length} lines) - comments are English-only. ` +
      'UI strings and data stay Hebrew; comments do not.',
  );
});
