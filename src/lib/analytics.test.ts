/**
 * The committed measurement id, and the gate that keeps preview traffic out
 * of the real property.
 *
 * The id itself is public - it is in the page source of every GA site - so
 * what is worth protecting is not its secrecy but the two properties around
 * it: that it is actually present (the whole reason it was committed), and
 * that only the production hostname reports into it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(process.cwd(), 'src', 'lib', 'analytics.ts'), 'utf8');

test('a measurement id is present, so the tag renders without any configuration', () => {
  /*
    This is the bug this file exists to prevent: the id lived only in an
    environment variable, the variable was never set, and the site shipped with
    no tag at all while looking finished. GA's own answer was "no data
    received", which does not point at a missing variable.
  */
  const id = /PRODUCTION_GA_ID = '([^']+)'/.exec(SRC)?.[1];
  assert.ok(id, 'PRODUCTION_GA_ID is missing');
  assert.match(id!, /^G-[A-Z0-9]{6,}$/, `not a GA4 measurement id: ${id}`);
});

test('the environment variable still wins, so a property can be changed without code', () => {
  assert.match(
    SRC,
    /process\.env\.NEXT_PUBLIC_GA_ID \|\| PRODUCTION_GA_ID/,
    'the committed id must be a fallback, never an override',
  );
});

test('only the production hostname reports into the committed property', () => {
  // Preview deployments and local development are a developer clicking through
  // a half-finished feature. That traffic in the real property is what makes
  // an analytics property untrustworthy.
  assert.match(SRC, /REPORTING_HOSTS = new Set\(\['tiyulplus\.com', 'www\.tiyulplus\.com'\]\)/);
  assert.match(
    SRC,
    /if \(!reportingHostAllowed\(\)\) return false;/,
    'analyticsActive must consult the host gate',
  );
});
