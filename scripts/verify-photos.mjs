// Verifies every photo URL in the data: every photo must return HTTP 200.
// Run before a content commit: node scripts/verify-photos.mjs
// Exits with code 1 if any photo failed - delete or replace it.
//
// Cache: a URL that has already been verified (200) is stored in
// .cache/verified-photos.json, and on the next run it is not checked again -
// so only new or changed photos go out to the network. That both saves time
// and reduces load on Wikimedia (which rate-limits). Running with --force
// (or VERIFY_PHOTOS_FORCE=1) ignores the cache and rechecks everything -
// worth doing occasionally, because a URL that was fine can break
// server-side.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const FILES = ['src/data/destinations.ts', 'src/data/countries.ts'];
// The manifest is committed to the repo on purpose. Until now it lived in
// .cache/, outside git, so the offline validator could not know which URLs
// were actually checked against the network. The authoring environment is
// network-blocked, so whoever adds a photo there cannot verify it
// themselves - the only way an unchecked URL does not reach production is
// for the validator to require a manifest record.
const CACHE_FILE = 'scripts/photo-verified.json';
const LEGACY_CACHE_FILE = '.cache/verified-photos.json';
const FORCE = process.argv.includes('--force') || process.env.VERIFY_PHOTOS_FORCE === '1';
// Cache validity: after 30 days a URL is rechecked even if it was verified before
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const urls = new Map(); // url -> where

for (const file of FILES) {
  const src = readFileSync(file, 'utf8');
  const re = /photo:\s*\n?\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!urls.has(m[1])) urls.set(m[1], file);
  }
}

/** { [url]: timestamp } - stored only for what returned 200 */
function readJson(path) {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadCache() {
  if (FORCE) return {};
  // ok:true is stored with a timestamp; the old format was a bare number. Both formats are read.
  const merged = { ...readJson(LEGACY_CACHE_FILE), ...readJson(CACHE_FILE) };
  const out = {};
  for (const [url, v] of Object.entries(merged)) {
    if (typeof v === 'number') out[url] = v;
    else if (v && typeof v === 'object' && v.ok && typeof v.ts === 'number') out[url] = v.ts;
  }
  return out;
}

const cache = loadCache();
const now = Date.now();
const isFresh = (url) => typeof cache[url] === 'number' && now - cache[url] < MAX_AGE_MS;

const entries = [...urls.entries()].filter(([url]) => !isFresh(url));
const cached = urls.size - entries.length;

console.log(
  `${urls.size} photo URLs · ${cached} already verified (cached)` +
    (entries.length ? ` · checking ${entries.length}...` : ' · nothing new to check'),
);

const failed = []; // a real failure (persistent 404/500) - fails the check
const throttled = []; // a 429 that persists even after backoff - not verified, but not failed either
const verifiedNow = new Set();
// Less concurrency = fewer 429s. With the cache, few URLs get checked per run anyway.
const CONCURRENCY = 4;
const BACKOFF_MS = [2000, 6000, 15000];

async function check(url, file) {
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'tiyul-plus-photo-verify/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      // We do not download the body - status only
      await res.body?.cancel?.();
      if (res.status === 200) {
        verifiedNow.add(url);
        return;
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt < BACKOFF_MS.length) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
        // Important: do not mark as OK. Until this fix a repeated 429 was
        // swallowed silently and the URL counted as "passed" without ever
        // really being checked.
        throttled.push(`${res.status} ${url} (${file})`);
        return;
      }
      failed.push(`${res.status} ${url} (${file})`);
      return;
    } catch (e) {
      if (attempt === BACKOFF_MS.length) failed.push(`ERR ${url} (${file}): ${e.message}`);
      else await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }
}

for (let i = 0; i < entries.length; i += CONCURRENCY) {
  await Promise.all(entries.slice(i, i + CONCURRENCY).map(([u, f]) => check(u, f)));
  process.stdout.write(`\r${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`);
}
if (entries.length) console.log('');

// Only URLs still present in the data are kept - so the cache does not bloat
// with deleted URLs. A failure is recorded in the manifest explicitly, not
// just printed. Otherwise the next run in a network-less environment cannot
// know that this URL was already checked and failed.
const failedUrls = new Set(failed.map((f) => f.match(/(https:\/\/\S+)/)?.[1]).filter(Boolean));
const nextCache = {};
for (const url of urls.keys()) {
  if (verifiedNow.has(url)) nextCache[url] = { ok: true, ts: now };
  else if (failedUrls.has(url)) nextCache[url] = { ok: false, ts: now };
  else if (isFresh(url)) nextCache[url] = { ok: true, ts: cache[url] };
}
try {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(nextCache, null, 0));
} catch {
  // The cache is an optimization only - a write failure does not fail the check
}

if (failed.length > 0) {
  console.error(`\n${failed.length} FAILED:`);
  for (const f of failed) console.error('  ' + f);
  process.exit(1);
}
if (throttled.length > 0) {
  // Did not fail, but were not verified either - not cached, so a rerun checks only them
  console.warn(
    `\n${throttled.length} URLs could not be verified (rate limited). Not cached - rerun to finish:`,
  );
  for (const t of throttled.slice(0, 10)) console.warn('  ' + t);
  if (throttled.length > 10) console.warn(`  ...and ${throttled.length - 10} more`);
}
console.log(
  `all checked photo URLs OK ✓ (${verifiedNow.size} verified now, ${cached} from cache` +
    (throttled.length ? `, ${throttled.length} unverified/rate-limited` : '') +
    ')',
);
