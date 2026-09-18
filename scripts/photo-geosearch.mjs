// Offers a Commons photo for places that have none, by geosearch: files whose
// OWN geotag sits within a few hundred metres of the place. Distance is to the
// photograph, not to an article centroid, which is what makes it safe for
// places Wikipedia never wrote about (2026-07-29 (jj)).
//
// It never writes the data file. It emits <out>.candidates.json and a contact
// sheet - the human look is mandatory, because a correctly geotagged photo
// taken 30 metres from a park can be a picture of a parked bus.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs \
//        scripts/photo-geosearch.mjs id1,id2,... out
import { writeFileSync } from 'node:fs';
import { destinations } from '../src/data/destinations.ts';
import { commonsThumb, BAD_FILE } from './lib/commons-url.mjs';

const UA = 'tiyulplus-catalog/1.0 (https://www.tiyulplus.com; contact: natikyan153@gmail.com)';
const [, , idList, outBase] = process.argv;
const wanted = new Set((idList ?? '').split(',').filter(Boolean));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(3000 * (a + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  throw new Error('rate limited');
}
async function probe(url) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      await sleep(4000 * (a + 1));
      continue;
    }
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
  }
  return false;
}
const NON_PHOTO =
  /(montage|collage|banner|sign|schild|logo|karte|map|wappen|coat|flag|locator|icon|diagram|plan|plaque|tafel|schema|\.svg|\.png|\.gif|\.tif)/i;

const used = new Set(destinations.flatMap((d) => d.places.map((p) => p.photo)).filter(Boolean));
const out = [];
for (const d of destinations)
  for (const p of d.places) {
    if (!wanted.has(p.id) || p.photo) continue;
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=geosearch&gsnamespace=6` +
      `&gscoord=${p.lat}|${p.lng}&gsradius=600&gslimit=25`;
    const j = await getJson(url);
    await sleep(300);
    const files = (j.query?.geosearch ?? [])
      .map((g) => ({ file: g.title.replace(/^File:/, ''), dist: g.dist }))
      .filter((f) => /\.jpe?g$/i.test(f.file) && !NON_PHOTO.test(f.file) && !BAD_FILE.test(f.file));
    const picks = [];
    for (const f of files.slice(0, 6)) {
      const info = await getJson(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=size|mime&titles=${encodeURIComponent('File:' + f.file)}`,
      );
      await sleep(300);
      const ii = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
      if (!ii || ii.mime !== 'image/jpeg' || ii.width < 500 || ii.height > ii.width * 1.6) continue;
      const thumb = commonsThumb(f.file, 500);
      if (!thumb || used.has(thumb)) continue;
      if (!(await probe(thumb))) continue;
      picks.push({ file: f.file, dist: f.dist, photo: thumb });
      if (picks.length >= 3) break;
    }
    out.push({ dest: d.slug, id: p.id, name: p.name, nameLocal: p.nameLocal, lat: p.lat, lng: p.lng, picks });
    console.log(`${d.slug}/${p.id}: ${picks.length} candidates`);
  }
writeFileSync(`${outBase}.candidates.json`, JSON.stringify(out, null, 1));
const cells = out
  .flatMap((o) =>
    o.picks.map(
      (k, i) =>
        `<figure><img src="${k.photo}"><figcaption><b>${o.id} #${i}</b> ${Math.round(k.dist)}m<br>${o.name}<br><small dir="ltr">${k.file}</small></figcaption></figure>`,
    ),
  )
  .join('');
writeFileSync(
  `${outBase}.sheet.html`,
  `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px Arial}main{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;padding:5px}figure{margin:0}img{width:100%;height:140px;object-fit:cover;display:block}figcaption{padding:2px;line-height:1.2}small{color:#666;word-break:break-all}</style><main>${cells}</main>`,
);
