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

// Walks the whole repo rather than a list of subdirectories. The first version
// scanned only src/scripts/public/supabase, and the 21 `supabase-*.sql` files
// live at the REPO ROOT - so every SQL comment in them was outside the guard
// and stayed Hebrew while the test passed. A denylist of build output cannot
// miss a new directory the way an allowlist of source directories did.
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.sql', '.css']);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // unreadable directory - nothing to check
  }
  for (const name of entries) {
    // dot-directories are .next/.git/.claude - build output and tooling
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
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
/** A multi-line block comment opener, which only ever starts a line here. */
const BLOCK_OPEN = /^\s*\{?\/\*/;

test('no Hebrew in comments anywhere in the repo', () => {
  const offenders: string[] = [];
  {
    for (const file of walk(ROOT)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      let inBlock = false;
      lines.forEach((line, i) => {
        const isCommentLine = COMMENT_START.test(line) || inBlock;
        // Track /* ... */ blocks so continuation lines without a leading * are
        // still covered. The opener must be at the START of the line: the first
        // version tested for `/*` anywhere, and `accept="image/*"` in a JSX
        // attribute switched block mode on and never off, so every Hebrew UI
        // string below it was reported as a comment. A block comment in this
        // codebase always opens its own line, so this is both safe and exact.
        if (BLOCK_OPEN.test(line) && !/\*\//.test(line.slice(line.indexOf('/*') + 2))) inBlock = true;
        if (inBlock && /\*\//.test(line)) inBlock = false;
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
