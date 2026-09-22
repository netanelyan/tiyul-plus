import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import sitemap from './sitemap.ts';
import { SITE_URL } from '@/lib/seo/site';
import { destinations } from '@/data/destinations';
import { countries } from '@/data/countries';
import { HUBS } from '@/lib/seo/hubs';
import { SEO_DESTINATION_SLUGS } from '@/lib/seo/selection';
import { ledgerHash, ledgerPaths } from '@/lib/seo/contentDates';
import { contentHashes } from '../../scripts/content-dates.mjs';

const entries = await sitemap();
const paths = entries.map((e) => e.url.replace(SITE_URL, '') || '/');
const pathSet = new Set(paths);

test('every catalog page is submitted', () => {
  // The count is what the brief asks for, but the useful assertion is the
  // relationship: a destination that exists and is missing here is a page nobody
  // asked Google to find.
  for (const d of destinations) {
    assert.ok(pathSet.has(`/destinations/${d.slug}`), `missing /destinations/${d.slug}`);
  }
  for (const c of countries) {
    assert.ok(pathSet.has(`/countries/${c.slug}`), `missing /countries/${c.slug}`);
  }
  for (const h of HUBS) {
    assert.ok(pathSet.has(`/collections/${h.slug}`), `missing /collections/${h.slug}`);
  }
  for (const p of ['/', '/countries', '/kosher', '/collections', '/premium', '/about', '/contact']) {
    assert.ok(pathSet.has(p), `missing ${p}`);
  }
  assert.equal(
    entries.length,
    destinations.length + countries.length + HUBS.length + 7,
    'the sitemap contains something other than the pages it is supposed to',
  );
  assert.ok(entries.length >= 250, `expected 250+ URLs, got ${entries.length}`);
});

test('no URL appears twice', () => {
  assert.equal(pathSet.size, paths.length, 'duplicate URL in the sitemap');
});

test('every URL is absolute and on the canonical host', () => {
  for (const e of entries) {
    assert.ok(e.url.startsWith(`${SITE_URL}/`) || e.url === SITE_URL, `not canonical: ${e.url}`);
    // A trailing slash on a sub-path is a second URL for the same page, which is
    // the duplicate-content bug the canonical tags exist to prevent.
    assert.ok(e.url === SITE_URL || !e.url.endsWith('/'), `trailing slash: ${e.url}`);
  }
});

/* ---------- the rule the brief asked for, enforced rather than remembered ---------- */

/** Every `app/**\/page.tsx`, as the route path it serves. */
function routePages(): { route: string; source: string }[] {
  const root = join(process.cwd(), 'src', 'app');
  const out: { route: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name === 'page.tsx') {
        const rel = relative(root, dir).split(sep).filter(Boolean);
        out.push({ route: `/${rel.join('/')}`.replace(/\/$/, '') || '/', source: full });
      }
    }
  };
  walk(root);
  return out;
}

test('nothing carrying noindex is submitted', () => {
  const noindexed = routePages().filter(({ source }) =>
    /noindex:\s*true/.test(readFileSync(source, 'utf8')),
  );
  // If this list ever empties, the check has stopped checking anything - the app
  // surfaces (/chat, /ask, /account, /planner, /start) are meant to stay out.
  assert.ok(noindexed.length >= 4, 'expected several noindex routes; is the helper still used?');
  for (const { route } of noindexed) {
    assert.ok(!pathSet.has(route), `${route} sets noindex and is in the sitemap`);
  }
  assert.ok(
    !noindexed.some((n) => n.route === '/premium'),
    '/premium is submitted, so it must not be noindex',
  );
});

/* ---------- lastmod ---------- */

test('lastmod is a real date, never the build date for everything', () => {
  const dated = entries.filter((e) => e.lastModified);
  assert.ok(dated.length >= entries.length * 0.9, 'most URLs should carry a lastmod');
  /*
    Compared as a DAY, not as an instant. `lastModified()` parses the stored
    `YYYY-MM-DD` at UTC **noon** on purpose, so that a build machine west of
    Greenwich does not render the previous day - which means a page re-dated
    today sits seven hours in the future for anyone running the suite before
    12:00 UTC. That is how this failed: `npm run seo:dates` at 08:17 in Israel,
    tests immediately after, and a page legitimately dated today was reported as
    dated in the future.

    A date genuinely in the future still fails, because tomorrow's UTC day is
    still greater than today's.
  */
  const todayUtc = new Date().toISOString().slice(0, 10);
  for (const e of dated) {
    const d = e.lastModified as Date;
    assert.ok(d instanceof Date && !Number.isNaN(d.getTime()), `bad lastModified on ${e.url}`);
    assert.ok(
      d.toISOString().slice(0, 10) <= todayUtc,
      `lastModified in the future on ${e.url}`,
    );
  }
  // The failure this guards is a ledger that has collapsed to one value, i.e.
  // somebody stamping the build date after all.
  const distinct = new Set(dated.map((e) => (e.lastModified as Date).toISOString().slice(0, 10)));
  assert.ok(distinct.size >= 2, 'every page shares one lastmod - that is the build date bug');
});

test('the content-date ledger is current', () => {
  const current = contentHashes() as Record<string, string>;
  const stale: string[] = [];
  for (const [path, hash] of Object.entries(current)) {
    if (ledgerHash(path) !== hash) stale.push(path);
  }
  const gone = ledgerPaths().filter((p) => !(p in current));
  assert.deepEqual(
    { stale: stale.slice(0, 5), staleCount: stale.length, gone: gone.slice(0, 5) },
    { stale: [], staleCount: 0, gone: [] },
    'content-dates.json disagrees with the catalog - run: npm run seo:dates',
  );
});

test('the promoted set still resolves', () => {
  const found = new Set(destinations.map((d) => d.slug));
  const missing = SEO_DESTINATION_SLUGS.filter((s) => !found.has(s));
  assert.deepEqual(missing, [], 'promoted destination slug(s) not in the catalog');
});
