/**
 * When each indexable page's content last actually changed.
 *
 * ## Why a ledger and not the build date
 *
 * `<lastmod>` is only worth emitting if it is true. The obvious implementation -
 * stamp every URL with the build date - marks all 270 pages as modified on every
 * unrelated deploy, which is not merely useless but actively misleading, and
 * Google discounts a sitemap whose lastmod it learns not to trust. That is why
 * the previous sitemap deliberately carried no lastmod at all.
 *
 * Git cannot supply it either, for two independent reasons: the whole catalog is
 * one 44,000-line file, so a git date would be identical for all 166 destinations
 * and would move whenever any one of them changed; and Vercel builds from a
 * source download with no git history, so the lookup would silently produce
 * nothing in the only environment that matters.
 *
 * So the date is derived from the content itself. Each URL gets a hash of exactly
 * the data that renders it; this script compares that hash to the committed
 * ledger and moves the date **only for the entries whose content actually
 * changed**. Adding places to Vienna re-dates Vienna and nothing else.
 *
 * ## The ratchet
 *
 * `src/app/sitemap.test.ts` fails when a hash here disagrees with the catalog,
 * naming this script. That is deliberate: a stale lastmod is a false statement to
 * a search engine, and the fix is one command. An entry that is simply missing
 * (a city added since the last run) emits no lastmod rather than a wrong one.
 *
 * Usage:
 *   npm run seo:dates          # update the ledger
 *   npm run seo:dates -- --check   # report drift, change nothing (exit 1 if stale)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';
import { HUBS, hubMembers } from '../src/lib/seo/hubs.ts';
import { promotedMembers } from '../src/lib/seo/hubData.ts';

const LEDGER = 'src/lib/seo/content-dates.json';
const CHECK = process.argv.includes('--check');

function hash(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

/** Concatenated source of the files that decide what a static route renders. */
function sourceHash(files) {
  const parts = files.filter((f) => existsSync(f)).map((f) => readFileSync(f, 'utf8'));
  return hash(parts.join('\0'));
}

function dir(path) {
  return existsSync(path) ? readdirSync(path).sort().map((f) => `${path}/${f}`) : [];
}

/*
  A static page's content is its own source. Listing the client component and the
  server-side data builder alongside the route file matters: /countries renders
  almost nothing itself, and an edit to the browser component is the change a
  reader would see.
*/
const STATIC_SOURCES = {
  '/': ['src/app/page.tsx', 'src/components/HomeHero.tsx', 'src/lib/server/homeSections.ts', ...dir('src/components/home')],
  '/countries': ['src/app/countries/page.tsx', 'src/components/DestinationBrowser.tsx'],
  '/kosher': ['src/app/kosher/page.tsx', 'src/app/kosher/KosherSearch.tsx'],
  '/collections': ['src/app/collections/page.tsx'],
  '/about': ['src/app/about/page.tsx'],
  '/contact': ['src/app/contact/page.tsx'],
  '/premium': ['src/app/premium/page.tsx', 'src/app/premium/PremiumClient.tsx'],
};

/** path -> hash of everything that renders it. The sitemap's URL set, exactly. */
export function contentHashes() {
  const out = {};

  for (const [path, files] of Object.entries(STATIC_SOURCES)) {
    out[path] = sourceHash(files);
  }

  const members = promotedMembers();
  for (const hub of HUBS) {
    // A hub page is its own copy plus whichever destinations currently qualify -
    // membership is derived, so a catalog change can legitimately re-date it.
    out[`/collections/${hub.slug}`] = hash({
      hub: { slug: hub.slug, title: hub.title, intro: hub.intro, emoji: hub.emoji },
      members: hubMembers(hub, members).map((m) => m.card.slug),
    });
  }

  for (const d of destinations) out[`/destinations/${d.slug}`] = hash(d);

  const byCountry = new Map();
  for (const d of destinations) {
    if (!byCountry.has(d.countrySlug)) byCountry.set(d.countrySlug, []);
    byCountry.get(d.countrySlug).push(d);
  }
  for (const c of countries) {
    // The country page renders the country's own fields and a card per city, so
    // renaming a city or changing its photo is a change to this page too.
    const cities = (byCountry.get(c.slug) ?? []).map((d) => ({
      slug: d.slug,
      name: d.name,
      photo: d.photo ?? null,
      days: d.itinerary?.length ?? 0,
      places: d.places.length,
      rating: d.editorialRating?.score ?? null,
    }));
    out[`/countries/${c.slug}`] = hash({ country: c, cities });
  }

  return out;
}

/**
 * The date to give an entry that is not in the ledger yet.
 *
 * Today is right for a page that genuinely appeared today, and wrong for the 270
 * that existed long before this ledger did - seeding all of them with the run
 * date would publish one false lastmod per page on the very first run. So a new
 * entry is seeded from the last commit that touched the files it is derived
 * from, which is the best available statement about when that content changed.
 *
 * Git is used HERE and never at build time: this script is run by a developer in
 * a real clone, while Vercel builds from a source download with no history.
 * When git is unavailable the run date is the honest fallback.
 */
function seedDate(files, today) {
  const paths = files.filter((f) => existsSync(f));
  if (paths.length === 0) return today;
  let latest = null;
  for (const p of paths) {
    try {
      const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', p], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(out) && (!latest || out > latest)) latest = out;
    } catch {
      /* no git, or the file is untracked - fall through to today */
    }
  }
  return latest ?? today;
}

/** The files a route's content is derived from, for seeding only. */
function seedSources(path) {
  if (path in STATIC_SOURCES) return STATIC_SOURCES[path];
  if (path.startsWith('/destinations/')) return ['src/data/destinations.ts'];
  if (path.startsWith('/countries/')) return ['src/data/countries.ts', 'src/data/destinations.ts'];
  if (path.startsWith('/collections/')) return ['src/lib/seo/hubs.ts', 'src/data/destinations.ts'];
  return [];
}

function main() {
  const current = contentHashes();
  const previous = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {};
  const today = new Date().toISOString().slice(0, 10);

  const next = {};
  let added = 0;
  let changed = 0;
  for (const path of Object.keys(current).sort()) {
    const before = previous[path];
    if (before && before.hash === current[path]) {
      next[path] = before;
      continue;
    }
    if (before) {
      changed++;
      next[path] = { hash: current[path], date: today };
    } else {
      added++;
      next[path] = { hash: current[path], date: seedDate(seedSources(path), today) };
    }
  }
  const removed = Object.keys(previous).filter((p) => !(p in current));

  if (CHECK) {
    const stale = added + changed + removed.length;
    console.log(
      stale === 0
        ? `content-dates: up to date (${Object.keys(current).length} pages)`
        : `content-dates: STALE - ${added} new, ${changed} changed, ${removed.length} gone. Run: npm run seo:dates`,
    );
    process.exitCode = stale === 0 ? 0 : 1;
    return;
  }

  writeFileSync(LEDGER, `${JSON.stringify(next, null, 1)}\n`, 'utf8');
  console.log(
    `content-dates: ${Object.keys(next).length} pages (${added} new, ${changed} re-dated, ${removed.length} removed)`,
  );
}

/*
  Only when run as a command. `sitemap.test.ts` imports `contentHashes` from here to
  assert the ledger is current, and a test run that rewrote the ledger as a side
  effect would make the check pass by changing the thing it is checking.
*/
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
