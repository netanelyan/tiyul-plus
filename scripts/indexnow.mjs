#!/usr/bin/env node
/**
 * Tell IndexNow which of our pages are new or changed.
 *
 *   npm run indexnow             submit what changed since the last submission
 *   npm run indexnow -- --all    submit every URL in both sitemaps
 *   npm run indexnow -- --dry    print what would be sent, send nothing
 *
 * `npm run deploy` runs it after every successful release, so nobody has to
 * remember it.
 *
 * ## Why this exists
 *
 * IndexNow is how Bing (and Yandex, Seznam, Naver) hear about a page without
 * waiting for their crawler to come round. Bing matters more here than its
 * search share suggests: ChatGPT's search draws on Bing's index, and an Israeli
 * agency study found Israeli sites cited by ChatGPT about half as often as by
 * Perplexity, mostly for want of Bing indexing. It needs no account - ownership
 * is proved by serving the key at /<key>.txt - so it costs the owner no time.
 *
 * ## Only what changed, by the sitemap's own lastmod
 *
 * IndexNow asks for URLs whose content changed, not the whole site on every
 * push. The sitemaps already carry a `lastmod` per URL, so the last value sent
 * for each URL is kept in .cache/indexnow.json (gitignored, per machine) and a
 * URL goes out again only when its lastmod moves. A machine with no cache sends
 * everything once, which is the right first submission anyway.
 *
 * ## It never fails a deploy
 *
 * The release is already live when this runs. Every failure is printed and the
 * process still exits 0, and the cache is written only after the API accepts a
 * batch, so a failed run is simply retried by the next one.
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://www.tiyulplus.com';
/** Public by design: it is served at /<KEY>.txt (public/), which is the proof of ownership. */
const KEY = '6b1f081d770e165dd42b0aa932b25537';
const SITEMAPS = [`${SITE}/sitemap.xml`, `${SITE}/sitemap-trips.xml`];
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** The protocol's per-request ceiling. */
const BATCH = 10_000;
const CACHE = path.join(process.cwd(), '.cache', 'indexnow.json');

const args = new Set(process.argv.slice(2));
const all = args.has('--all');
const dry = args.has('--dry');

main().catch((e) => {
  console.error(`indexnow: ${e.message}`);
  process.exit(0);
});

async function main() {
  // A key file that does not answer means every submission would be refused
  // (403), so check it first and say so plainly.
  const keyRes = await fetch(`${SITE}/${KEY}.txt`, { signal: AbortSignal.timeout(15_000) });
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
  if (keyBody !== KEY) {
    console.error(`indexnow: ${SITE}/${KEY}.txt does not serve the key (HTTP ${keyRes.status}) - is public/${KEY}.txt deployed?`);
    return;
  }

  const entries = [];
  for (const url of SITEMAPS) entries.push(...(await readSitemap(url)));

  const sent = all ? {} : readCache();
  const due = entries.filter((e) => sent[e.loc] !== e.lastmod);
  if (!due.length) {
    console.log(`indexnow: nothing changed (${entries.length} URLs in the sitemaps)`);
    return;
  }
  if (dry) {
    console.log(`indexnow: would send ${due.length} of ${entries.length} URLs`);
    for (const e of due.slice(0, 20)) console.log(`  ${e.loc}`);
    return;
  }

  const cache = readCache();
  for (let i = 0; i < due.length; i += BATCH) {
    const batch = due.slice(i, i + BATCH);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE).host,
        key: KEY,
        keyLocation: `${SITE}/${KEY}.txt`,
        urlList: batch.map((e) => e.loc),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    // 200 and 202 both mean accepted (202: the key is still being validated).
    if (res.status !== 200 && res.status !== 202) {
      console.error(`indexnow: HTTP ${res.status} ${(await res.text()).slice(0, 200)} - nothing recorded, the next run retries`);
      return;
    }
    for (const e of batch) cache[e.loc] = e.lastmod;
    writeCache(cache);
    console.log(`indexnow: sent ${batch.length} URLs (HTTP ${res.status})`);
  }
}

/** `<url><loc>…</loc><lastmod>…</lastmod></url>` - a URL with no lastmod is keyed on its presence alone. */
async function readSitemap(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({
      loc: (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1]?.trim(),
      lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1]?.trim() || 'present',
    }))
    .filter((e) => e.loc && e.loc.startsWith(SITE));
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(data) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(data, null, 1));
}
