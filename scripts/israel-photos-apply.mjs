/**
 * Normalise the Wikimedia hero URLs and write them into the catalog.
 *
 * Three things the raw API response got wrong, none of which would have failed a build:
 *
 * 1. **Host.** It answers on `thumb.wikimedia.org`; every other photo in this catalog
 *    is on `upload.wikimedia.org`, which is what `photoMirror.ts` documents and what
 *    the mirror rewrites from. A second host would work today and silently sit outside
 *    the mirror.
 * 2. **Tracking parameters.** `?utm_source=en.wikipedia.org&utm_campaign=api` came
 *    attached. Those do not belong in stored data.
 * 3. **Two of them were not photographs.** The API's "page image" for Israel is the
 *    FLAG, and for the Golan Heights it is a MAP - both SVG-derived PNGs. They return
 *    200, they render, and they are wrong in a way only looking catches. Replaced with
 *    real photographs of the place.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'tiyul-plus-catalog/1.0 (natikyan153@gmail.com)';
const WIDTH = 960;

/** Where the API's own choice was a flag or a map, an article that has a photograph. */
const OVERRIDE = {
  'country:israel': 'Masada',
  golan: 'Nimrod Fortress',
};

const TARGETS = [
  ['country:israel', 'Israel'],
  ['jerusalem', 'Jerusalem'],
  ['tel-aviv', 'Tel Aviv'],
  ['dead-sea', 'Dead Sea'],
  ['eilat', 'Eilat'],
  ['mitzpe-ramon', 'Makhtesh Ramon'],
  ['galilee-kinneret', 'Sea of Galilee'],
  ['golan', 'Golan Heights'],
  ['haifa-carmel', 'Haifa'],
  ['akko-caesarea', 'Acre, Israel'],
];

/** upload.wikimedia.org, no query string. Rejects anything SVG-derived. */
function normalise(raw) {
  const u = new URL(raw);
  u.search = '';
  u.hostname = 'upload.wikimedia.org';
  const s = u.toString();
  if (/\.svg\.png$/i.test(s)) return null; // a flag or a map, not a photograph
  return s;
}

async function heroFor(article) {
  const api =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages' +
    `&piprop=thumbnail&pithumbsize=${WIDTH}&titles=${encodeURIComponent(article)}`;
  const body = await (await fetch(api, { headers: { 'User-Agent': UA } })).json();
  const page = Object.values(body?.query?.pages ?? {})[0];
  const raw = page?.thumbnail?.source;
  if (!raw) return null;
  const url = normalise(raw);
  if (!url) return null;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  return res.ok ? url : null;
}

const photos = {};
for (const [slug, article] of TARGETS) {
  let url = await heroFor(OVERRIDE[slug] ?? article);
  if (!url && OVERRIDE[slug]) url = await heroFor(article); // fall back to the original
  if (url) {
    photos[slug] = url;
    console.log(`${slug.padEnd(20)} OK  ${url.slice(40, 130)}`);
  } else {
    console.log(`${slug.padEnd(20)} NO USABLE PHOTO - leaving the gradient fallback`);
  }
  await new Promise((r) => setTimeout(r, 300));
}

// ---------- write them in ----------
let dest = readFileSync('src/data/destinations.ts', 'utf8');
let added = 0;
for (const [slug, url] of Object.entries(photos)) {
  if (slug.startsWith('country:')) continue;
  const anchor = `    slug: '${slug}',\n    name:`;
  const at = dest.indexOf(anchor);
  if (at === -1) {
    console.log(`! ${slug} not found in destinations.ts`);
    continue;
  }
  // After bestSeason, which every generated entry has, so the field order stays stable.
  const seasonAt = dest.indexOf('    bestSeason:', at);
  const lineEnd = dest.indexOf('\n', seasonAt) + 1;
  dest = dest.slice(0, lineEnd) + `    photo: '${url}',\n` + dest.slice(lineEnd);
  added += 1;
}
writeFileSync('src/data/destinations.ts', dest, 'utf8');

let countries = readFileSync('src/data/countries.ts', 'utf8');
if (photos['country:israel']) {
  const at = countries.indexOf("    slug: 'israel',");
  const tagAt = countries.indexOf('    tagline:', at);
  const lineEnd = countries.indexOf('\n', tagAt) + 1;
  countries =
    countries.slice(0, lineEnd) + `    photo: '${photos['country:israel']}',\n` + countries.slice(lineEnd);
  writeFileSync('src/data/countries.ts', countries, 'utf8');
  console.log('countries.ts: photo added');
}
console.log(`destinations.ts: ${added} photos added`);
