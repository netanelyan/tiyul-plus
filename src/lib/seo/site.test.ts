/**
 * The site-level constants, and the one guard that matters about them.
 *
 * The contact address was typed into two pages rather than read from anywhere,
 * which is how `/about` came to quote a place count 1,426 stale. A published
 * address is worse than a stale number: mail sent to an address we no longer
 * read is not wrong-looking, it is simply never answered.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT_EMAIL, SITE_URL, canonical } from './site.ts';

test('the contact address is a real address on our own domain', () => {
  assert.match(CONTACT_EMAIL, /^[a-z0-9._%+-]+@tiyulplus\.com$/);
});

test('canonical composes onto the site URL without a double slash', () => {
  assert.equal(canonical('/'), SITE_URL);
  assert.equal(canonical('/premium'), `${SITE_URL}/premium`);
  assert.ok(!SITE_URL.endsWith('/'));
});

/** Every .tsx under src/app, recursively. */
function pageFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) pageFiles(p, out);
    else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/*
  The class guard, not the instance.

  A page may publish an address, but only by importing the constant - so
  changing where our mail goes is one edit and cannot leave a stale copy behind
  on the page nobody remembered. `example.com` is exempt because an input
  placeholder showing the SHAPE of an address is not an address anyone writes
  to; it is exempt by domain rather than by file, so the exemption cannot
  quietly cover a real address that happens to sit in the same file.
*/
test('no page hard-codes an email address', () => {
  const offenders: string[] = [];
  for (const file of pageFiles('src/app')) {
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const m of code.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []) {
      if (m.endsWith('@example.com')) continue;
      offenders.push(`${file}: ${m}`);
    }
  }
  assert.deepEqual(offenders, [], `import CONTACT_EMAIL instead:\n${offenders.join('\n')}`);
});
