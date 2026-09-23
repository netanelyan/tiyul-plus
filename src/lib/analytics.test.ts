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
import { ASK_AFTER_VISIBLE_MS, msUntilAsk } from './analytics';

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

/* ------------------------------------------------------------------ *
 * The shape that actually reaches gtag
 * ------------------------------------------------------------------ */

test('dataLayer is fed an arguments object, never an array', () => {
  /*
    The bug this exists to stop, and it shipped: `dataLayer.push(['event',...])`
    with a real Array is SILENTLY IGNORED by gtag.js. Measured on the live
    property - an array push produced zero `g/collect` requests and no `_ga`
    cookie, the arguments form produced both, in the same page seconds apart.

    Nothing catches it downstream. The tag installs, Google reports it as
    detected, the console is clean, and the property shows no traffic - which
    reads as "nobody is visiting" rather than as a defect.
  */
  const LOADER = readFileSync(join(process.cwd(), 'src', 'components', 'Analytics.tsx'), 'utf8');

  /*
    Comments are stripped before the "no array push" scan, because both files
    now explain the bug by quoting it - and the first version of this test
    failed on its own documentation. The patterns are line-anchored: an
    unanchored block-comment strip treats any `/*`-looking sequence mid-line as
    an opener and silently eats the rest of the file, which is the failure this
    repo has already recorded once (`accept="image/*"`).
  */
  const code = (s: string) =>
    s.replace(/^\s*\{?\/\*[\s\S]*?\*\/\}?\s*$/gm, '').replace(/^\s*\/\/.*$/gm, '');

  assert.match(
    SRC,
    /win\.dataLayer\.push\(asArguments\(\.\.\.args\)\)/,
    'push() must convert to an arguments object before pushing',
  );
  assert.doesNotMatch(
    code(SRC),
    /dataLayer\.push\(args\)|dataLayer\.push\(\[/,
    'an array pushed onto dataLayer is dropped by gtag.js without a word',
  );
  assert.doesNotMatch(
    code(LOADER),
    /dataLayer\.push\(\[/,
    'the inline consent default must call gtag(), not push an array literal',
  );
  // Google's own snippet, which is the only form gtag.js reads.
  assert.match(
    LOADER,
    /function gtag\(\)\{window\.dataLayer\.push\(arguments\)\}/,
    'the inline script must define gtag the way Google documents it',
  );
});

/* ------------------------------------------------------------------ *
 * The delayed ask
 * ------------------------------------------------------------------ */

test('the banner is never part of a first impression', () => {
  /*
    The whole point of the delay, stated as a number: a visitor who has just
    arrived, and one who has skimmed for twenty seconds, are both still waiting.
    Netanel: "asking about cookies immediately makes the website look not nice."
  */
  assert.equal(msUntilAsk(0), ASK_AFTER_VISIBLE_MS, 'asked on arrival');
  assert.ok(msUntilAsk(20_000) > 0, 'asked during a skim');
  assert.ok(
    ASK_AFTER_VISIBLE_MS >= 30_000,
    `${ASK_AFTER_VISIBLE_MS}ms is inside a first impression - a bouncing visitor would be asked`,
  );
});

test('an engaged visitor is still asked, so the cookie data is not given up', () => {
  // The other direction, and it matters just as much: the delay must not turn
  // into "never ask", or returning-visitor data is lost for everybody.
  assert.equal(msUntilAsk(ASK_AFTER_VISIBLE_MS), 0);
  assert.equal(msUntilAsk(ASK_AFTER_VISIBLE_MS + 60_000), 0);
  assert.ok(
    ASK_AFTER_VISIBLE_MS <= 120_000,
    `${ASK_AFTER_VISIBLE_MS}ms is long enough that most sessions end first`,
  );
});

test('a corrupt stored time delays the ask rather than firing it', () => {
  // The banked total comes back out of sessionStorage as a string, so NaN is a
  // real possibility. The safe direction is "wait the full time", never "ask
  // immediately" - the failure this whole change exists to prevent.
  assert.equal(msUntilAsk(Number.NaN), ASK_AFTER_VISIBLE_MS);
  assert.equal(msUntilAsk(-5_000), ASK_AFTER_VISIBLE_MS);
  assert.equal(msUntilAsk(Number.POSITIVE_INFINITY), ASK_AFTER_VISIBLE_MS);
});

test('time is counted only while the tab is visible, and survives a page change', () => {
  // A tab left open in the background overnight is not engagement, and a
  // visitor who reads four pages for fifteen seconds each is. Both properties
  // live in the clock rather than in the component, so they are asserted here.
  assert.match(SRC, /document\.visibilityState !== 'visible'/, 'the clock must ignore a hidden tab');
  assert.match(SRC, /sessionStorage\.setItem\(ENGAGED_KEY/, 'banked time must carry across pages');
  assert.match(
    SRC,
    /addEventListener\('pagehide', disarmAskTimer\)/,
    'pagehide, not unload - unload does not fire on iOS or into the bfcache',
  );
});

test('nothing is timed for somebody who already answered', () => {
  assert.match(
    SRC,
    /if \(storedConsent\(\) !== null\) return;/,
    'startAskClock must be a no-op once a choice exists',
  );
});

test('the clock does not poll', () => {
  // A measurement feature that runs an interval forever to decide when to ask
  // about measurement would be its own punchline - and "do not slow the site
  // down" was the instruction that shaped this whole feature.
  assert.doesNotMatch(SRC, /setInterval/, 'the ask clock must be a single timeout');
});
