// Finding photos for places that have no photo field - the only script in the
// project that requires a network.
//
// Why it exists at all: the cloud environment the agent works in blocks all
// the Wikimedia domains (403 at the proxy), so no image URL can be verified
// there. The project's hard rule forbids writing an unverified value, so
// instead of guessing - this script runs on a machine that has network
// access, verifies, and writes a report. The report is what enters the code,
// via scripts/apply-photos.mjs, which does not touch the network at all.
//
//   node scripts/fetch-photos.mjs                  all the missing places
//   node scripts/fetch-photos.mjs --limit 20       a trial run
//   node scripts/fetch-photos.mjs --only stockholm a single destination
//
// Output: photo-report.json at the repo root.
//
// How a wrong-subject photo is avoided: we do not trust the search engine's
// ranking. For every candidate Wikipedia returns, its coordinates are
// checked against the coordinates we already have in the data, and the
// candidate is rejected if it is too far. A photo without geographic
// verification is not marked 'ok' - it goes into 'review' and waits for a
// human eye. This is precisely the lesson from the second batch, where the
// first result in a Commons search was often an entirely different subject.
import { writeFileSync } from 'node:fs';
import { parsePlaces, distanceKm } from './lib/parse-places.mjs';

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'tiyul-plus/1.0 (travel catalog photo verification; contact via tiyulplus.com)';
const THUMB_WIDTH = 500; // matches the URLs already present in the data
const OUT = 'photo-report.json';

/** Below this the article is certainly the same place */
const ACCEPT_KM = 12;
/** Between ACCEPT_KM and REVIEW_KM: probably right, but requires a human eye */
const REVIEW_KM = 60;
const CONCURRENCY = 4;

// Filenames that almost always represent a symbol and not a place. These are
// rejected even if the distance is perfect: a country's flag is not a photo
// of a site.
const BAD_FILE = /(flag|coat[_ ]of[_ ]arms|logo|map[_ ]of|locator|seal|emblem|blank|wappen)/i;

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const only = argOf('--only');
const limit = Number.parseInt(argOf('--limit') ?? '', 10);

const { places } = parsePlaces();
let targets = places.filter((p) => !p.hasPhoto);
if (only) targets = targets.filter((p) => p.destSlug === only);
if (Number.isFinite(limit) && limit > 0) targets = targets.slice(0, limit);

console.log(
  `${places.length} places parsed · ${places.filter((p) => !p.hasPhoto).length} without a photo` +
    (only || Number.isFinite(limit) ? ` · ${targets.length} selected` : ''),
);
if (!targets.length) {
  console.log('Nothing to do.');
  process.exit(0);
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Whether the URL is really alive and really an image */
async function headOk(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20000),
    });
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Asks Wikipedia for up to 8 candidates for the name, and returns each one's
 * title, coordinates and lead image. An article's lead image is a far better
 * indicator of the right subject than the first result in a free-text
 * Commons search.
 */
async function candidates(query) {
  const url =
    `${API}?action=query&format=json&formatversion=2&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8` +
    `&prop=coordinates|pageimages|info&inprop=url` +
    `&piprop=thumbnail|name&pithumbsize=${THUMB_WIDTH}`;
  const data = await getJson(url);
  return data?.query?.pages ?? [];
}

/** @param {import('./lib/parse-places.mjs').ParsedPlace} place */
async function resolve(place) {
  const base = { id: place.id, destSlug: place.destSlug, nameLocal: place.nameLocal };
  let pages;
  try {
    pages = await candidates(place.nameLocal);
  } catch (err) {
    return { ...base, status: 'error', reason: String(err?.message ?? err) };
  }

  const scored = [];
  for (const page of pages) {
    const thumb = page?.thumbnail?.source;
    if (!thumb || !thumb.startsWith('https://upload.wikimedia.org/')) continue;
    if (BAD_FILE.test(page.pageimage ?? '')) continue;
    const co = page?.coordinates?.[0];
    const km = co ? distanceKm(place.lat, place.lng, co.lat, co.lon) : null;
    scored.push({ title: page.title, pageUrl: page.fullurl, thumb, km, file: page.pageimage });
  }

  if (!scored.length) return { ...base, status: 'none', reason: 'no article with a lead image' };

  const geo = scored.filter((c) => c.km !== null).sort((a, b) => a.km - b.km);
  const best = geo[0];

  let status;
  let chosen;
  if (best && best.km <= ACCEPT_KM) {
    status = 'ok';
    chosen = best;
  } else if (best && best.km <= REVIEW_KM) {
    status = 'review';
    chosen = best;
  } else if (
    // No coordinates on any candidate: only an exact title match is
    // accepted, and only as review. Many museums and churches are simply
    // not geotagged on Wikipedia.
    scored.some((c) => c.title.toLowerCase() === place.nameLocal.toLowerCase())
  ) {
    status = 'review';
    chosen = scored.find((c) => c.title.toLowerCase() === place.nameLocal.toLowerCase());
  } else {
    return {
      ...base,
      status: 'none',
      reason: best ? `nearest article is ${best.km.toFixed(0)} km away` : 'no geo match',
      nearest: best ? { title: best.title, km: Number(best.km.toFixed(1)) } : undefined,
    };
  }

  if (!(await headOk(chosen.thumb))) {
    return { ...base, status: 'none', reason: 'thumbnail did not return an image' };
  }

  return {
    ...base,
    status,
    photo: chosen.thumb,
    article: chosen.title,
    articleUrl: chosen.pageUrl,
    file: chosen.file,
    distanceKm: chosen.km === null ? null : Number(chosen.km.toFixed(1)),
  };
}

// Run with a concurrency cap. Wikipedia is tolerant, but there is no reason to pile on.
const results = [];
let cursor = 0;
let done = 0;
async function worker() {
  while (cursor < targets.length) {
    const place = targets[cursor++];
    const out = await resolve(place);
    results.push(out);
    done++;
    if (done % 25 === 0 || done === targets.length) {
      console.log(`  ${done}/${targets.length}...`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

results.sort((a, b) => a.destSlug.localeCompare(b.destSlug) || a.id.localeCompare(b.id));
const count = (s) => results.filter((r) => r.status === s).length;

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'en.wikipedia.org lead images, geo-verified against destinations.ts',
      acceptKm: ACCEPT_KM,
      reviewKm: REVIEW_KM,
      totals: {
        checked: results.length,
        ok: count('ok'),
        review: count('review'),
        none: count('none'),
        error: count('error'),
      },
      results,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log('');
console.log(`ok      ${count('ok')}   (geo-verified, safe to apply)`);
console.log(`review  ${count('review')}   (plausible, needs a human look)`);
console.log(`none    ${count('none')}   (no honest match found)`);
console.log(`error   ${count('error')}`);
console.log(`\nWrote ${OUT}`);
