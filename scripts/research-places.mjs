// Research pipeline for new catalog places - proves a candidate before it is
// written, and refuses to write anything it could not prove.
//
// Input: a JSON file of candidates, each { dest, id, wiki, name, nameLocal,
// category, tags, priceLevel, durationMin, mustSee?, description }, where
// `wiki` is a Wikipedia title ("Tre Cime di Lavaredo"), optionally prefixed
// with a language ("de:Eibsee"), and may be a list of fallbacks.
//
// For every candidate, in this order, and it stops at the first failure:
//   1. coordinates from the Wikipedia coordinates API (never typed by hand -
//      the 2026-07-27 Triana typo was one character and 111km);
//   2. the article's lead image, checked on Commons: exists, is a commons file
//      (licence), is not an SVG/map/logo/montage by filename, and its real
//      width is read so the thumbnail asked for is never wider than the source
//      (the 960px trap that killed 170 URLs);
//   3. the derived thumbnail URL is HTTP-probed - a derived URL is not a
//      fetched one;
//   4. the coordinate is inside the destination's own geographic spread
//      (+10%), the same reference frame validate-catalog uses;
//   5. no existing place in the whole catalog shares the name or sits within
//      250 metres - the check runs against EVERY category, because the five
//      duplicates that slipped through in (dd) were filed under a different one.
//
// Output: <out>.verified.json (only the survivors, with lat/lng/photo filled)
// and <out>.sheet.html - a contact sheet of every survivor's photo next to its
// filename and its name, for the visual check that no filter can replace.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs \
//        scripts/research-places.mjs candidates.json out
import { readFileSync, writeFileSync } from 'node:fs';
import { destinations } from '../src/data/destinations.ts';
import { commonsThumb, BAD_FILE } from './lib/commons-url.mjs';

const UA = 'tiyulplus-catalog/1.0 (https://www.tiyulplus.com; contact: natikyan153@gmail.com)';
const [, , inFile, outBase] = process.argv;
if (!inFile || !outBase) {
  console.error('usage: research-places.mjs candidates.json outBase');
  process.exit(2);
}
const candidates = JSON.parse(readFileSync(inFile, 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return res.json();
  }
  throw new Error(`rate limited: ${url}`);
}

/** Wikipedia: coordinates + lead image filename for one title in one language. */
async function wikiLookup(lang, title) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&redirects=1&format=json` +
    `&prop=coordinates|pageimages&piprop=name&titles=${encodeURIComponent(title)}`;
  const j = await getJson(url);
  const pages = Object.values(j.query?.pages ?? {});
  const p = pages[0];
  if (!p || p.missing !== undefined) return { missing: true };
  const c = p.coordinates?.[0];
  return {
    title: p.title,
    lat: c?.lat,
    lon: c?.lon,
    image: p.pageimage ?? null,
  };
}

/** Commons: does the file exist on commons (not a local upload), and how wide is it? */
async function commonsInfo(file) {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&redirects=1&format=json` +
    `&prop=imageinfo&iiprop=size|mime|url&titles=${encodeURIComponent('File:' + file)}`;
  const j = await getJson(url);
  const p = Object.values(j.query?.pages ?? {})[0];
  if (!p || p.missing !== undefined) return null;
  const ii = p.imageinfo?.[0];
  if (!ii) return null;
  // Follow a redirect to the canonical title - thumbnails exist only under it.
  const canonical = p.title.replace(/^File:/, '');
  return { file: canonical, width: ii.width, mime: ii.mime };
}

async function probe(url) {
  // upload.wikimedia.org rate-limits bursts with 429, and a 429 is not "no photo":
  // the first run of batch 2 lost every Slovenian photo to exactly that.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    const ct = res.headers.get('content-type') ?? '';
    return res.ok && ct.startsWith('image/');
  }
  throw new Error(`rate limited on upload: ${url}`);
}

const NON_PHOTO = /(montage|collage|panorama_montage|banner|sign|schild|logo|karte|map|wappen|coat|flag|locator|icon|diagram|\.svg)/i;

function norm(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9֐-׿]/g, '');
}
function haversineKm(a, b, c, d) {
  const R = 6371;
  const toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(c - a);
  const dLon = toR(d - b);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toR(a)) * Math.cos(toR(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const URBAN = new Set(['food', 'market', 'cafe', 'shopping', 'kosher-food', 'kosher-market']);
const allPlaces = destinations.flatMap((d) => d.places.map((p) => ({ ...p, dest: d.slug })));
const usedIds = new Set(allPlaces.map((p) => p.id));
const usedPhotos = new Map();
for (const p of allPlaces) if (p.photo) usedPhotos.set(p.photo, `${p.dest}/${p.id}`);

const verified = [];
const rejected = [];
for (const c of candidates) {
  const tag = `${c.dest}/${c.id}`;
  const reject = (why) => {
    rejected.push({ id: tag, why });
    console.log(`REJECT ${tag}: ${why}`);
  };
  const dest = destinations.find((d) => d.slug === c.dest);
  if (!dest) {
    reject('unknown destination');
    continue;
  }
  if (usedIds.has(c.id) || verified.some((v) => v.id === c.id)) {
    reject('id already used');
    continue;
  }

  // 1. coordinates, trying each wiki title in order
  const wikis = Array.isArray(c.wiki) ? c.wiki : [c.wiki];
  let hit = null;
  let lang = 'en';
  for (const w of wikis) {
    const m = w.match(/^([a-z]{2,3}):(.+)$/);
    lang = m ? m[1] : 'en';
    const title = m ? m[2] : w;
    const r = await wikiLookup(lang, title);
    await sleep(150);
    if (r.missing) continue;
    if (Number.isFinite(r.lat) && Number.isFinite(r.lon)) {
      hit = r;
      break;
    }
    // keep the image even without coords, in case a later title has coords only
    if (!hit && r.image) hit = { ...r, lat: undefined };
  }
  // Fallback: OpenStreetMap via Nominatim, filtered on the OSM class/type
  // rather than on the name - the Almaty Green Bazaar lesson (2026-07-29 (jj)):
  // the same name returns the market AND two bus stops named after it, and
  // only `type` tells them apart. Serial, 1 req/sec, per Nominatim's policy.
  if ((!hit || !Number.isFinite(hit.lat)) && c.osm) {
    await sleep(1100);
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&q=${encodeURIComponent(c.osm.q)}`;
    const rows = await getJson(url);
    const re = new RegExp(c.osm.type, 'i');
    const ok = rows
      .filter((r) => re.test(`${r.category}/${r.type}`))
      .map((r) => ({ ...r, km: haversineKm(+r.lat, +r.lon, dest.center.lat, dest.center.lng) }))
      .sort((a, b) => a.km - b.km)[0];
    if (ok) {
      hit = { ...(hit ?? {}), title: `osm:${ok.osm_type}/${ok.osm_id} ${ok.display_name.slice(0, 60)}`, lat: +ok.lat, lon: +ok.lon };
      console.log(`  osm    ${tag}: ${ok.category}/${ok.type} ${ok.display_name.slice(0, 80)}`);
    }
  }
  // Third source: Wikidata. Many articles carry a coordinate on the item
  // (P625) that the Wikipedia coordinates API never indexes, and the item
  // often has an image (P18) too. `wd` is a label to search; the first item
  // with a coordinate inside the destination's spread wins - the spread is
  // what stops "Juta" from resolving to a village in Hungary.
  if ((!hit || !Number.isFinite(hit.lat)) && c.wd) {
    const search = await getJson(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=${c.wdLang ?? 'en'}&limit=7&search=${encodeURIComponent(c.wd)}`,
    );
    await sleep(200);
    const ids = (search.search ?? []).map((s) => s.id);
    if (ids.length) {
      const ents = await getJson(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&ids=${ids.join('|')}`,
      );
      await sleep(200);
      for (const id of ids) {
        const e = ents.entities?.[id];
        const co = e?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
        if (!co) continue;
        const dl = Math.abs(co.latitude - dest.center.lat);
        const dg = Math.abs(co.longitude - dest.center.lng);
        if (dl > 3 || dg > 3) continue; // a different place with the same name
        const img = e.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
        hit = {
          ...(hit ?? {}),
          title: `wd:${id} ${e.labels?.en?.value ?? ''}`,
          lat: co.latitude,
          lon: co.longitude,
          image: hit?.image ?? img,
        };
        console.log(`  wd     ${tag}: ${id} ${e.labels?.en?.value ?? ''} ${img ? 'P18:' + img : ''}`);
        break;
      }
    }
  }
  if (!hit || !Number.isFinite(hit.lat)) {
    reject('no coordinates on any Wikipedia article given (and no OSM or Wikidata match)');
    continue;
  }
  const lat = +hit.lat.toFixed(5);
  const lng = +hit.lon.toFixed(5);
  if (Number.isInteger(hit.lat) && Number.isInteger(hit.lon)) {
    reject('whole-degree coordinates - placeholder on Wikipedia');
    continue;
  }

  // 4. distance guard against the destination's own spread (+10%)
  const spread = { lat: 0, lng: 0 };
  for (const p of dest.places) {
    if (URBAN.has(p.category)) continue;
    spread.lat = Math.max(spread.lat, Math.abs(p.lat - dest.center.lat));
    spread.lng = Math.max(spread.lng, Math.abs(p.lng - dest.center.lng));
  }
  const tol = { lat: Math.max(spread.lat * 1.1, 0.35), lng: Math.max(spread.lng * 1.1, 0.35) };
  const dLat = Math.abs(lat - dest.center.lat);
  const dLng = Math.abs(lng - dest.center.lng);
  if ((dLat > tol.lat || dLng > tol.lng) && !c.allowFar) {
    reject(
      `outside the destination's spread: Δ${dLat.toFixed(2)}/${dLng.toFixed(2)} vs tolerance ${tol.lat.toFixed(2)}/${tol.lng.toFixed(2)} (${lat},${lng})`,
    );
    continue;
  }

  // 5. duplicates anywhere in the catalog
  const nn = norm(c.nameLocal);
  const nh = norm(c.name);
  const dup = allPlaces.find(
    (p) =>
      norm(p.nameLocal) === nn ||
      norm(p.name) === nh ||
      haversineKm(p.lat, p.lng, lat, lng) < 0.25,
  );
  if (dup) {
    reject(`duplicate of ${dup.dest}/${dup.id} (${dup.name} @ ${dup.lat},${dup.lng})`);
    continue;
  }

  // 2+3. photo - optional: a place with no usable photo ships without one
  let photo;
  let photoFile;
  if (hit.image && !NON_PHOTO.test(hit.image) && !BAD_FILE.test(hit.image)) {
    const info = await commonsInfo(hit.image);
    await sleep(150);
    if (info && /^image\/(jpeg|png|webp)$/.test(info.mime) && !NON_PHOTO.test(info.file)) {
      const width = info.width >= 500 ? 500 : info.width >= 330 ? 330 : info.width >= 250 ? 250 : null;
      if (width) {
        const url = commonsThumb(info.file, width);
        await sleep(400);
        if (url && !usedPhotos.has(url) && (await probe(url))) {
          photo = url;
          photoFile = info.file;
          usedPhotos.set(url, tag);
        }
      }
    }
  }

  verified.push({
    ...c,
    wikiTitle: `${lang}:${hit.title}`,
    lat,
    lng,
    photo,
    photoFile,
  });
  console.log(`OK     ${tag}  ${lat},${lng}  ${photoFile ? 'photo:' + photoFile : 'NO PHOTO'}`);
}

writeFileSync(`${outBase}.verified.json`, JSON.stringify(verified, null, 2));
writeFileSync(`${outBase}.rejected.json`, JSON.stringify(rejected, null, 2));

// Contact sheet for the visual check.
const cells = verified
  .filter((v) => v.photo)
  .map(
    (v) => `<figure><img src="${v.photo}" loading="eager"><figcaption><b>${v.dest}/${v.id}</b><br>${v.name}<br><span dir="ltr">${v.nameLocal}</span><br><small dir="ltr">${v.photoFile}</small></figcaption></figure>`,
  )
  .join('\n');
writeFileSync(
  `${outBase}.sheet.html`,
  `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px Arial}main{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:6px}figure{margin:0}img{width:100%;height:150px;object-fit:cover;display:block}figcaption{padding:3px;line-height:1.25}small{color:#666;word-break:break-all}</style><main>${cells}</main>`,
);
console.log(`\n${verified.length} verified, ${rejected.length} rejected, ${verified.filter((v) => v.photo).length} with photo`);
