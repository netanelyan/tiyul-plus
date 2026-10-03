/**
 * Guard: the retired monthly premium price cannot reappear in user-facing copy.
 *
 * The monthly premium plan (₪19.90) stopped being sold when the trip pass
 * replaced it - see `tripPass.ts` for why. Its code stays, because existing
 * subscribers still bill against it. What did NOT get swept was the copy that
 * quoted it, and on 2026-10-03 two places were still selling a product nobody
 * could buy:
 *
 *   - `components/home/SharedTripFeature.tsx` priced the shared trip from
 *     `PREMIUM_PRICE_ILS`, per month, while /premium sold the same feature
 *     inside a ₪49 one-off pass. The homepage and the pricing page disagreed
 *     about both what the product costs and how often you pay for it.
 *   - `app/premium/page.tsx` had a hand-typed `description` naming the monthly
 *     plan and its price. That is the sentence search engines and WhatsApp show
 *     for our pricing page, so the stale price outranked the real one.
 *
 * Neither failed a test, because the page body computes every figure from the
 * constants and both of these sat outside it. Hence two rules:
 *
 * **A. No hardcoded retired-price literal**, anywhere in `src/app` or
 * `src/components`, with no exceptions. A price typed into a string is the bug
 * that cannot be fixed by changing a constant.
 *
 * **B. No `PREMIUM_PRICE_ILS` reference** in those trees, except the two files
 * that legitimately serve grandfathered subscribers. Marketing copy and page
 * metadata have no business reading a price we do not charge.
 *
 * Both rules read the code with comments stripped - every surviving mention of
 * ₪19.90 in this repo is a comment explaining why it is gone, including the
 * ones above, and a guard that cannot tell those apart would force the history
 * to be deleted to stay green.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PREMIUM_PRICE_ILS } from './plans.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const TREES = [join(ROOT, 'src', 'app'), join(ROOT, 'src', 'components')];
const EXTS = new Set(['.ts', '.tsx']);

/**
 * The two files allowed to read the retired price, each for a stated reason:
 *
 * - `SubscribeButton.tsx` and `PremiumClient.tsx` share one `cta()` helper
 *   shaped `wanted === 'pro' ? PRO_PRICE_ILS : PREMIUM_PRICE_ILS`. Both only
 *   ever call it with 'pro' today, so neither renders the retired price - but
 *   the branch stays for the subscription path that still exists.
 *
 * Adding a file here is a product decision, not a way to make this test pass.
 */
const MAY_READ_PREMIUM_PRICE = new Set([
  join('src', 'components', 'SubscribeButton.tsx'),
  join('src', 'app', 'premium', 'PremiumClient.tsx'),
]);

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTS.has(name.slice(name.lastIndexOf('.')))) yield full;
  }
}

/**
 * The file with `//` and block comments removed, string and template literals
 * left intact (a price lives in a string, so stripping those would blind rule A).
 *
 * A small state machine rather than a regex: `https://` inside a string literal
 * is not a comment, and the catalog-adjacent files are full of URLs.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === '\\') {
        out += c + (next ?? '');
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      // Keep the newline count stable so reported line numbers stay usable.
      out += ' ';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** 19.9 / 19.90 / 19,90 as a standalone figure - not 119.9, not 19.95. */
const RETIRED_LITERAL = /(?<![\d.,])19[.,]90?(?![\d])/;

const files = TREES.flatMap((t) => [...walk(t)]);

test('the guard is actually looking at files', () => {
  // A walk that silently finds nothing is a test that passes for the wrong reason.
  assert.ok(files.length > 50, `expected to scan the app and component trees, scanned ${files.length}`);
});

test('A: no hardcoded retired price in src/app or src/components', () => {
  // Pinned so this test's own subject cannot drift away from the constant.
  assert.equal(PREMIUM_PRICE_ILS, 19.9);

  const offenders: string[] = [];
  for (const file of files) {
    const code = stripComments(readFileSync(file, 'utf8'));
    code.split('\n').forEach((line, n) => {
      if (RETIRED_LITERAL.test(line)) {
        offenders.push(`${relative(ROOT, file).split(sep).join('/')}:${n + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    'the retired monthly price (₪19.90) is typed into copy. The pass price is ' +
      'TRIP_PASS_PRICE_ILS and pro is PRO_PRICE_ILS; print them through ils():\n' +
      offenders.join('\n'),
  );
});

test('B: only the subscription path reads PREMIUM_PRICE_ILS', () => {
  const offenders: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (MAY_READ_PREMIUM_PRICE.has(rel)) continue;
    if (stripComments(readFileSync(file, 'utf8')).includes('PREMIUM_PRICE_ILS')) {
      offenders.push(rel.split(sep).join('/'));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'these render a price we no longer sell. The shared trip and the ' +
      'pre-departure check are bought per trip - use TRIP_PASS_PRICE_ILS or ' +
      `predeparture's PRICE_ILS:\n${offenders.join('\n')}`,
  );
});

test('the /premium description quotes the pass, computed not typed', () => {
  /*
    Read as source rather than imported: pulling in the route module would pull
    in PremiumClient, which is a client component. What matters is provable from
    the text - the description interpolates the pass constant.
  */
  const src = readFileSync(join(ROOT, 'src', 'app', 'premium', 'page.tsx'), 'utf8');
  const code = stripComments(src);
  assert.match(code, /description:[\s\S]{0,400}TRIP_PASS_PRICE_ILS/);
  assert.ok(!/לחודש/.test(code), 'the pass is per trip - "לחודש" in the description describes pro, not it');
});
