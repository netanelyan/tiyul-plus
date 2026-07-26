// צובר תוצאות של חיפוש תמונות ידני מול dbpedia אל photo-report.json.
// הקלט הוא TSV פשוט ב-/tmp/photos.tsv עם השדות:
//   placeId <TAB> dbpediaArticle <TAB> thumbFile <TAB> lat <TAB> long
// (lat/long יכולים להיות NONE - אז אין אימות גיאוגרפי והרשומה נכנסת
// כ-review במקום ok.)
//
// הסקריפט מוודא מרחק מול הקואורדינטות שכבר בדאטה, פוסל שמות קבצים
// שנראים כמו לוגו/דגל/מפה, ובונה את כתובת הממוזערת דטרמיניסטית.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parsePlaces, distanceKm } from './parse-places.mjs';
import { commonsThumb, BAD_FILE } from './commons-url.mjs';

const TSV = process.argv[2] ?? '/tmp/photos.tsv';
const OUT = 'photo-report.json';
const ACCEPT_KM = 12;
const REVIEW_KM = 60;

const { places } = parsePlaces();
const byId = new Map(places.map((p) => [p.id, p]));

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { results: [] };
const results = new Map((prev.results ?? []).map((r) => [r.id, r]));

// dbpedia מחזירה לפעמים ‎\uXXXX‎ ולפעמים כתובת עם ‎?width=300‎ בזנב
const decode = (s) =>
  s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\?.*$/, '')
    .replace(/^File:/i, '')
    .trim();

let added = 0;
const rejected = [];

for (const raw of readFileSync(TSV, 'utf8').split('\n')) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const [id, article, fileRaw, latRaw, lngRaw] = line.split('\t').map((s) => (s ?? '').trim());
  const place = byId.get(id);
  if (!place) { rejected.push(`${id}: unknown place id`); continue; }
  if (place.hasPhoto) { rejected.push(`${id}: already has a photo`); continue; }

  const file = decode(fileRaw ?? '');
  if (!file || file === 'NONE') { rejected.push(`${id}: no thumbnail on the article`); continue; }
  if (BAD_FILE.test(file)) { rejected.push(`${id}: "${file}" looks like a logo/flag/map`); continue; }

  const photo = commonsThumb(file);
  if (!photo) { rejected.push(`${id}: "${file}" is not a usable raster image`); continue; }

  const lat = Number.parseFloat(latRaw);
  const lng = Number.parseFloat(lngRaw);
  let status = 'review';
  let km = null;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    km = Number(distanceKm(place.lat, place.lng, lat, lng).toFixed(1));
    if (km <= ACCEPT_KM) status = 'ok';
    else if (km > REVIEW_KM) { rejected.push(`${id}: article "${article}" is ${km} km from the place`); continue; }
  }

  results.set(id, {
    id, destSlug: place.destSlug, nameLocal: place.nameLocal,
    status, photo, article, file, distanceKm: km,
    source: 'dbpedia dbo:thumbnail; URL built from the Commons md5 path',
  });
  added++;
}

const all = [...results.values()].sort((a, b) => a.destSlug.localeCompare(b.destSlug) || a.id.localeCompare(b.id));
const count = (s) => all.filter((r) => r.status === s).length;

writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'dbpedia lead images, geo-checked against destinations.ts',
  acceptKm: ACCEPT_KM, reviewKm: REVIEW_KM,
  totals: { total: all.length, ok: count('ok'), review: count('review') },
  results: all,
}, null, 2) + '\n', 'utf8');

console.log(`+${added} this run · report now holds ${all.length} (ok ${count('ok')} / review ${count('review')})`);
if (rejected.length) {
  console.log(`rejected ${rejected.length}:`);
  for (const r of rejected) console.log('  ' + r);
}
