/**
 * Fetches, for every Wikimedia file in the catalog, the two things we cannot
 * derive from a URL: **who took it and under what licence**, and **how wide
 * the original actually is**.
 *
 * ## Why both in one pass
 *
 * They look like separate problems and share a cause. Most Commons photos are
 * CC BY or CC BY-SA, which require the author and the licence to be credited -
 * and this is a commercial site that credited neither. That is the legal half.
 *
 * The other half is that `thumbSrcSet` can only offer widths **smaller than
 * the width already in the URL**, because nothing told it how big the source
 * was. Almost every catalog URL is a 500px thumb, so a card on a 3x phone
 * asking for ~480px gets 500 and a card on a 2x desktop asking for ~500 also
 * gets 500 - there is never anything sharper to pick, even though the original
 * is usually several thousand pixels wide. Wikimedia refuses a thumb WIDER
 * than the source (that is what produced 170 dead URLs in an earlier session),
 * so the original width is exactly the permission slip needed to offer 960.
 *
 * One API call returns both. Running this twice is idempotent.
 *
 * Usage:
 *   node scripts/photo-credits.mjs          # refresh everything missing
 *   node scripts/photo-credits.mjs --force  # refetch all
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const OUT = 'scripts/photo-credits.json';
const API = 'https://commons.wikimedia.org/w/api.php';
const BATCH = 50;
/*
 * Wikimedia's policy asks tools to identify themselves with a contact. A
 * generic agent is what earned the 429s an earlier session spent an afternoon
 * on.
 */
const UA = 'tiyulplus-photo-credits/1.0 (https://www.tiyulplus.com; hello@tiyulplus.com)';

const force = process.argv.includes('--force');

/** Every distinct Commons filename referenced by the catalog. */
function catalogFiles() {
  const src =
    readFileSync('src/data/destinations.ts', 'utf8') + readFileSync('src/data/countries.ts', 'utf8');
  const files = new Set();
  for (const m of src.matchAll(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/\d+px-/g)) {
    files.add(decodeURIComponent(m[1]));
  }
  return [...files].sort();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Strip the HTML Commons puts in the Artist field - it is often a link. */
function plainText(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

async function fetchBatch(titles, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'size|url|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Credit|AttributionRequired',
    redirects: '1',
    titles: titles.map((t) => `File:${t}`).join('|'),
  });
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`commons ${res.status} after ${attempt} retries`);
    const wait = 8000 * (attempt + 1);
    process.stderr.write(`  ${res.status}, backing off ${wait}ms\n`);
    await sleep(wait);
    return fetchBatch(titles, attempt + 1);
  }
  if (!res.ok) throw new Error(`commons ${res.status}`);
  return res.json();
}

const existing = existsSync(OUT) && !force ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const files = catalogFiles();
const todo = files.filter((f) => !existing[f]);

process.stderr.write(`${files.length} files in the catalog, ${todo.length} to fetch\n`);

let done = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  const json = await fetchBatch(chunk);
  /*
   * `normalized` and `redirects` map what we asked for onto what Commons
   * actually holds. Without following them a renamed file silently records no
   * credit - which is the failure this script exists to prevent.
   */
  const alias = new Map();
  for (const n of json.query?.normalized ?? []) alias.set(n.to, n.from);
  for (const r of json.query?.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);

  for (const page of json.query?.pages ?? []) {
    const asked = (alias.get(page.title) ?? page.title).replace(/^File:/, '');
    if (page.missing) {
      existing[asked] = { missing: true };
      continue;
    }
    const info = page.imageinfo?.[0];
    if (!info) {
      existing[asked] = { missing: true };
      continue;
    }
    const meta = info.extmetadata ?? {};
    existing[asked] = {
      artist: plainText(meta.Artist?.value) || null,
      license: plainText(meta.LicenseShortName?.value) || null,
      licenseUrl: meta.LicenseUrl?.value || null,
      // The file page - the canonical place a licence points a reader to.
      descriptionUrl: info.descriptionurl || null,
      // The permission slip for a wider thumbnail. See the module doc.
      width: typeof info.width === 'number' ? info.width : null,
      height: typeof info.height === 'number' ? info.height : null,
    };
  }
  done += chunk.length;
  process.stderr.write(`  ${done}/${todo.length}\n`);
  // Pace, per Wikimedia's policy.
  if (i + BATCH < todo.length) await sleep(1200);
}

// Sorted, so the committed file diffs cleanly between runs.
const sorted = Object.fromEntries(Object.keys(existing).sort().map((k) => [k, existing[k]]));
writeFileSync(OUT, `${JSON.stringify(sorted, null, 0)}\n`);

const withCredit = Object.values(sorted).filter((v) => v.artist && v.license).length;
const missing = Object.values(sorted).filter((v) => v.missing).length;
const wide = Object.values(sorted).filter((v) => (v.width ?? 0) >= 960).length;
process.stderr.write(
  `\n${Object.keys(sorted).length} files: ${withCredit} with artist+licence, ` +
    `${missing} missing on Commons, ${wide} wide enough for a 960px thumb\n`,
);
