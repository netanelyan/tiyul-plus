// Offline validator for the curated catalog (src/data/*).
//
// Why this exists: the catalog is the product's moat and it is edited by hand,
// so the failure mode is not a crash but a page that renders happily with a
// pin in the wrong country, a photo the project has no licence to hotlink, or
// an itinerary that references a place id that no longer exists. tsc cannot
// see any of that. This script can, and it needs no network, which matters
// because the authoring sandbox has no outbound egress.
//
// Run: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs
// Exit code is 1 if any ERROR is reported. WARN never fails the run.
//
// Deliberately NOT checked, because these are conventions and not defects:
//   * externalUrl using ?q=Name+Of+Place instead of ?q=lat,lng - both work,
//     and the name form often lands on a nicer Google Maps card.
//   * places that no day of the itinerary references - the places list is
//     meant to be broader than the suggested route.

import { readFileSync, existsSync } from 'node:fs';
import { destinations } from '../src/data/destinations.ts';
import { countries } from '../src/data/countries.ts';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// Wikimedia only serves these thumbnail widths for us, and only /commons/
// files are freely licensed. /wikipedia/en/ files are local uploads that are
// usually non-free, so hotlinking them is a licensing problem, not a style one.
const ALLOWED_WIDTHS = [250, 330, 500, 960];

// 960px is allowed BY WIKIMEDIA but is not allowed HERE unless it was actually
// probed. Wikimedia only serves a thumbnail NARROWER than the source file, so a
// 960px URL derived from a working 500px one by string-replacing the width 404s
// whenever the source image is under 960px wide - silently, because the page
// applies the photo as a raw CSS background with no onError handler, so a dead URL
// just falls back to the gradient.
//
// MEASURED, 2026-07-27, so nobody re-derives it: this mechanism is real but it was
// NOT the cause of the flat purple /countries cards. A browser probe of all 1,396
// catalog URLs found 151 dead, and not one of them was rescuable at 960/500/330/250
// - they are dead FILES (wrong or renamed Commons filenames), not sizing errors. The
// dead rate was 131/1264 at 500px versus 20/132 at 960px, so width barely correlates.
// Two real narrow sources did turn up (MUTRAHCORNICHE2.jpg at 604px, Wat_Phnom at
// 720px), which is why the rule stays. Note the trap that made this class invisible:
// a wrong filename still hashes consistently with its own md5 path prefix, so a
// prefix check cannot catch it. Only an HTTP probe can.
//
// To use 960px, run scripts/verify-photos.mjs in a networked environment first; a URL
// recorded ok:true in the manifest below is accepted at any allowed width.
const WIDTHS_NEEDING_PROOF = [960];
const PHOTO_HOSTS = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/',
  'https://images.unsplash.com/',
];

// The verification manifest, committed to the repo on purpose. The authoring
// sandbox has no outbound network, so whoever adds a photo here CANNOT probe it;
// the only thing standing between an unprobed URL and production is this file.
// ---------- אוכל, שווקים וקניות ----------
// קטגוריות שאוכלים בהן. חייבת להישאר תואמת ל-`isEating` ב-src/lib/categories.ts;
// אם מוסיפים שם קטגוריה, להוסיף גם כאן, אחרת הבדיקה מפסיקה לכסות אותה בשקט.
const EATING = new Set(['cafe', 'food', 'kosher-food']);
const KOSHER_STATUS = new Set(['kosher', 'not-kosher', 'unknown']);
// הקטגוריות שנוספו בפיצ׳ר האוכל והקניות - עליהן הכללים החדשים נאכפים.
const SOURCED_CATEGORIES = new Set(['food', 'market']);
const NO_HOURS_CATEGORIES = new Set(['food', 'market', 'cafe', 'shopping']);
const LINK_BY_COORDS = new Set(['food', 'market']);
// קטגוריות עירוניות: תמיד בתוך העיר או בפאתיה הקרובים.
const URBAN_CATEGORIES = new Set(['food', 'market', 'cafe', 'shopping', 'kosher-food', 'kosher-market']);
// שעון אמיתי, "שעות פתיחה", או "סגור ביום/בימי X". `1:25` של קנה מידה נופל
// כאן בכוונה - עדיף אזהרת שווא אחת מאשר שעה שנשמרה בלי שאיש שם לב.
const HOURS_RE =
  /(?:\d{1,2}:\d{2})|שעות\s*(?:ה)?פתיחה|סגור(?:ה|ים)?\s*(?:בימי|ביום|בשבת)|פתוח(?:ה|ים)?\s*(?:עד|24\/7)/;
const PRICE_RE = /₪|\$\d|€\s?\d|\d+\s*(?:יורו|דולר|שקלים|שקל)|עלות\s*הכניסה\s*\d/;

const MANIFEST_FILE = 'scripts/photo-verified.json';
const manifestExists = existsSync(MANIFEST_FILE);
let manifest = {};
if (manifestExists) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) ?? {};
  } catch {
    manifest = {};
  }
}
const probeState = (url) => {
  const v = manifest[url];
  if (v === undefined) return 'unknown';
  if (typeof v === 'number') return 'ok';
  return v && v.ok ? 'ok' : 'failed';
};

// Every photo URL, wherever it lives, gets the same checks. `cssBackground` marks
// the fields rendered as `background-image: url("...")` in an inline style
// (Country.photo, Destination.photo, iconicLandmark.photo). Those are wrapped in
// DOUBLE quotes deliberately: Commons filenames legitimately contain an apostrophe
// (Musee d'Orsay, Schindler's factory, ANSE SOURCE D'ARGENT) and encodeURIComponent
// does not escape it, so single-quoted CSS would terminate early and silently kill
// the whole declaration - the same invisible failure mode as a 404. A literal `"`
// never survives URL encoding, so only `"` has to be rejected here.
// Place photos go through <img src> and are not affected.
function checkPhoto(where, what, url, cssBackground) {
  if (!url) return;
  if (!PHOTO_HOSTS.some((h) => url.startsWith(h)))
    err(`${where}: ${what} is not a freely licensed source -> ${url}`);

  const w = url.match(/\/(\d+)px-/);
  if (w && !ALLOWED_WIDTHS.includes(+w[1]))
    err(`${where}: ${what} width ${w[1]} is not one of ${ALLOWED_WIDTHS.join('/')}`);
  if (w && WIDTHS_NEEDING_PROOF.includes(+w[1]) && probeState(url) === 'unknown')
    err(
      `${where}: ${what} is ${w[1]}px but was never HTTP-verified. Wikimedia 404s a thumbnail wider than the source file. Use 500px, or verify it and commit ${MANIFEST_FILE}.`,
    );

  // WARN and not ERROR, for now, only because 151 of these already exist in the
  // catalog and failing the gate would block every unrelated commit. The count is
  // surfaced as a hard number at the end of the run so it cannot be ignored, and
  // this should become an ERROR the moment the backlog reaches zero.
  if (probeState(url) === 'failed')
    warn(`${where}: ${what} is recorded in ${MANIFEST_FILE} as NOT serving 200 -> ${url}`);

  // A .svg in a photo field is almost always a coat of arms, a logo or a
  // location map rather than a photograph. Two shipped that way (the Vatican
  // Museums wearing an emblem, Barceloneta wearing a district map).
  if (/\.svg(\.png)?$/i.test(url))
    err(`${where}: ${what} is an SVG (emblem/logo/map), not a photograph -> ${url}`);

  // The SVG rule above only catches the vector case. The same species ships as
  // .png and .jpg all the time, and the filename says so out loud: Commons names
  // montages "X_montage", collages "X_collage", and road/street signs "X_Sign".
  // Nova Scotia's hero was CabotTrailSign.png - a road-sign GRAPHIC on a dark
  // navy field, with transparency, so the card read as a blue bar with a
  // silhouette on it. A montage is worse than useless in a card: it is six tiny
  // photos in one frame, unreadable at 500px.
  //
  // Matched on the decoded FILENAME, not the URL, and anchored with separators
  // so real words survive: "Piazza_Signoria" (Florence), "Iconsiam" (Bangkok)
  // and "Panorama" are photographs and must not trip this.
  const file = decodeURIComponent(url.split('/').pop() ?? '').replace(/^\d+px-/, '');
  const GRAPHIC = /(^|[_\-(])(sign|montage|montaje|collage|logo|emblem|seal|banner|wordmark|coat[_-]of[_-]arms|blason|wappen|escudo)([_\-)./]|$)/i;
  const m = file.match(GRAPHIC);
  if (m)
    err(
      `${where}: ${what} filename says "${m[2]}" - that is a graphic (sign/montage/collage/logo), not a photograph -> ${file}`,
    );

  if (cssBackground && url.includes('"'))
    err(`${where}: ${what} contains a double quote and is rendered inside CSS url("...") -> ${url}`);
}

const countrySlugs = new Set(countries.map((c) => c.slug));

// The country layer went completely unchecked until now. That is exactly why 48
// country photos could be spliced in unverified and nobody noticed: the /countries
// catalog renders Country.photo, and a coverage report that only measures
// destinations and places reports full coverage while the cards are blank.
const seenCountrySlug = new Set();
for (const c of countries) {
  if (seenCountrySlug.has(c.slug)) err(`duplicate country slug: ${c.slug}`);
  seenCountrySlug.add(c.slug);
  checkPhoto(c.slug, 'Country.photo', c.photo, true);
  if (!c.photo) warn(`${c.slug}: no Country.photo - the /countries card renders a flat gradient`);
}
const seenDestSlug = new Set();
const placeOwner = new Map();

for (const d of destinations) {
  if (seenDestSlug.has(d.slug)) err(`duplicate destination slug: ${d.slug}`);
  seenDestSlug.add(d.slug);

  if (!countrySlugs.has(d.countrySlug))
    err(`${d.slug}: countrySlug "${d.countrySlug}" has no matching country`);

  if (d.editorialRating) {
    const s = d.editorialRating.score;
    if (!(s >= 1 && s <= 5))
      err(`${d.slug}: editorialRating.score ${s} is outside 1-5 (the UI renders it as "/5")`);
  }

  // The destination-level hero and the iconic-landmark card are hotlinked the
  // same way place photos are, so they carry the same licensing and width
  // constraints. They were unchecked until every photoless destination got one.
  checkPhoto(d.slug, 'photo', d.photo, true);
  checkPhoto(d.slug, 'iconicLandmark.photo', d.iconicLandmark?.photo, true);

  // הפרישה הגאוגרפית הלגיטימית של היעד, נמדדת מהמקומות הלא-עירוניים
  // בלבד (אתרים, טבע, מוזיאונים, תצפיות). משמשת כמסגרת ייחוס לבדיקה 3b.
  const spread = { lat: 0, lng: 0 };
  if (d.center)
    for (const p of d.places) {
      if (URBAN_CATEGORIES.has(p.category)) continue;
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      spread.lat = Math.max(spread.lat, Math.abs(p.lat - d.center.lat));
      spread.lng = Math.max(spread.lng, Math.abs(p.lng - d.center.lng));
    }

  const ids = new Set();
  for (const p of d.places) {
    const where = `${d.slug}/${p.id}`;

    if (ids.has(p.id)) err(`${where}: duplicate place id inside the destination`);
    ids.add(p.id);
    if (placeOwner.has(p.id) && placeOwner.get(p.id) !== d.slug)
      err(`place id ${p.id} is used by both ${placeOwner.get(p.id)} and ${d.slug}`);
    placeOwner.set(p.id, d.slug);

    if (!(Math.abs(p.lat) <= 90) || !(Math.abs(p.lng) <= 180))
      err(`${where}: coordinates out of range (${p.lat}, ${p.lng})`);

    // A coordinate that is whole degrees on both axes was never a real
    // published value - it is a rounded placeholder, and one degree is
    // roughly 111km. The project rule is to drop the place rather than ship
    // a pin that confident and that wrong.
    if (Number.isInteger(p.lat) && Number.isInteger(p.lng))
      err(`${where}: whole-degree coordinates (${p.lat}, ${p.lng}) - placeholder, not a real fix`);

    // A place more than ~3 degrees from its destination centre is either
    // mis-typed or belongs to a different destination. Wide regional
    // destinations legitimately trip this, hence WARN and not ERROR.
    if (Math.abs(p.lat - d.center.lat) > 3 || Math.abs(p.lng - d.center.lng) > 3)
      warn(
        `${where}: ${p.lat},${p.lng} is far from the destination centre ${d.center.lat},${d.center.lng}`,
      );

    if (p.externalUrl) {
      const m = p.externalUrl.match(/[?&]q=(-?[\d.]+),(-?[\d.]+)(?:&|$)/);
      if (m && (Math.abs(+m[1] - p.lat) > 0.0005 || Math.abs(+m[2] - p.lng) > 0.0005))
        err(`${where}: externalUrl points at ${m[1]},${m[2]} but the place is at ${p.lat},${p.lng}`);
    }

    checkPhoto(where, 'photo', p.photo, false);

    if (p.rating !== undefined && !(p.rating >= 0 && p.rating <= 5))
      err(`${where}: rating ${p.rating} is outside 0-5`);

    // ---------- אוכל, שווקים וקניות: מקור, כשרות, ובלי שעות ומחירים ----------

    // 1. סטטוס כשרות מפורש לכל מקום שאוכלים בו. **ריק אינו מצב חוקי.**
    // ההשלכה אינה תיוג: `kosherStatusOf` מחזיר 'unknown' כשהשדה חסר,
    // וההגנה על מטייל שומר כשרות חוסמת 'unknown' בדיוק כמו 'not-kosher' -
    // כלומר שדה חסר משתיק מקום במקום להסביר אותו. עדיף לומר מה ידוע.
    if (EATING.has(p.category) && !p.category.startsWith('kosher')) {
      if (!p.kosherStatus)
        err(`${where}: category "${p.category}" is a place you eat at and has no kosherStatus - it must say kosher / not-kosher / unknown, never nothing`);
      else if (!KOSHER_STATUS.has(p.kosherStatus))
        err(`${where}: kosherStatus "${p.kosherStatus}" is not one of ${[...KOSHER_STATUS].join(' / ')}`);
    }
    // רשומת kosher-* גוזרת את הסטטוס שלה מהקטגוריה. שדה מפורש שסותר את
    // הקטגוריה הוא בדיוק סוג הסתירה שמגיע למטייל כטעות כשרות.
    if (p.category.startsWith('kosher') && p.kosherStatus && p.kosherStatus !== 'kosher')
      err(`${where}: category "${p.category}" but kosherStatus "${p.kosherStatus}" - contradictory`);

    // 2. מקור ותאריך. חובה על הקטגוריות שנוספו בפיצ׳ר הזה; הקטגוריות
    // הישנות לא נדרשות רטרואקטיבית, אבל מקור שכן נכתב חייב להיות תקין.
    if (p.source) {
      if (!/^https:\/\/\S+$/.test(p.source.url || ''))
        err(`${where}: source.url is not an https URL -> ${p.source.url}`);
      if (!p.source.title) err(`${where}: source.title is empty`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.source.checked || ''))
        err(`${where}: source.checked "${p.source.checked}" is not an ISO date (YYYY-MM-DD)`);
    } else if (SOURCED_CATEGORIES.has(p.category)) {
      err(`${where}: category "${p.category}" requires a source { url, title, checked }`);
    }

    // 3. בלי שעות פתיחה ובלי מחירים - הם מתיישנים בשקט, והמטייל מגלה
    // את זה מול דלת סגורה. נאכף על הקטגוריות של הפיצ׳ר; לשאר מודפסת
    // אזהרה בלבד, כי זה תוכן קיים ולא הגיוני לשכתב אותו כאן.
    const hoursHit = HOURS_RE.exec(p.description);
    const priceHit = PRICE_RE.exec(p.description);
    if (hoursHit || priceHit) {
      const what = hoursHit ? `opening hours ("${hoursHit[0]}")` : `a price ("${priceHit[0]}")`;
      if (NO_HOURS_CATEGORIES.has(p.category))
        err(`${where}: description states ${what} - hours and prices are never stored`);
      else warn(`${where}: description states ${what} (legacy entry, outside the food/shopping rule)`);
    }

    // 3b. מקום עירוני רחוק מדי ממרכז היעד. שוק או מסעדה נמצאים כמעט תמיד
    // בעיר עצמה, ולכן סטייה של מעלה שלמה היא כמעט תמיד שגיאת הקלדה - וזו
    // בדיוק הטעות שנעשתה כאן (37.38 שנכתב 38.38, מרחק של ~111 ק"מ).
    // בדיקת ה-externalUrl הקיימת אינה יכולה לתפוס את זה, כי הקישור נגזר
    // מאותו ערך שגוי. סף האזהרה הכללי (3 מעלות) רחב מדי לקטגוריות האלה.
    // הסף אינו קבוע: הוא נגזר מהפרישה של היעד עצמו. יעד בקנה מידה של
    // מדינה שלמה (גרנד קניון, ניו אינגלנד, אנדלוסיה) מחזיק ממילא אתרים
    // במרחק מעלות מהמרכז, ושם מסעדה בעיר השער היא נתון לגיטימי ולא טעות.
    // מסגרת הייחוס היא דווקא המקומות הלא-עירוניים - הם אלה שנפרשים
    // בלגיטימיות, והם אינם מחלקת הבאגים שהבדיקה הזאת שומרת עליה.
    if (URBAN_CATEGORIES.has(p.category) && d.center) {
      const dLat = Math.abs(p.lat - d.center.lat);
      const dLng = Math.abs(p.lng - d.center.lng);
      // 5% מעל הפרישה, לא הפרישה בדיוק: מסעדה באושוואיה נפלה מתחת לסף
      // ב-0.002 מעלות רק מפני שהעיר עצמה הייתה המקום הרחוק ביותר שהגדיר
      // אותו. הסף נועד לתפוס טעות של מעלה שלמה, לא של שני אלפיות.
      const tolLat = Math.max(1, spread.lat * 1.05);
      const tolLng = Math.max(1, spread.lng * 1.05);
      if (dLat > tolLat || dLng > tolLng)
        err(`${where}: ${p.category} sits ${dLat.toFixed(2)}/${dLng.toFixed(2)} degrees from the destination centre, past this destination's own spread of ${tolLat.toFixed(2)}/${tolLng.toFixed(2)} - an urban amenity that far out is almost always a typo`);
    }

    // 4. קישור לפי קואורדינטות ולא לפי שם. שם מתחלף ופותר לעיר אחרת -
    // הקטלוג כבר נשרף על "Cartagena" שפתר לספרד ועל "Deira" לאנגליה.
    if (LINK_BY_COORDS.has(p.category) && p.externalUrl && !/[?&]query=-?\d|[?&]q=-?\d/.test(p.externalUrl))
      err(`${where}: externalUrl links by NAME, not coordinates -> ${p.externalUrl}`);
  }

  // Two places in the SAME destination sharing a photo means the list renders
  // the same image twice and one of the two captions is wrong - usually a
  // broad "the national park" entry wearing the photo of one specific lake
  // that is also its own place. Across destinations this is fine and expected:
  // Sveti Stefan legitimately appears under both Kotor and Budva.
  const byPhoto = new Map();
  for (const p of d.places) {
    if (!p.photo) continue;
    byPhoto.set(p.photo, (byPhoto.get(p.photo) ?? []).concat(p.id));
  }
  for (const [url, ids2] of byPhoto)
    if (ids2.length > 1)
      err(`${d.slug}: places ${ids2.join(', ')} all use the same photo -> ${url}`);

  const days = d.itinerary.map((x) => x.day);
  if (days.some((v, i) => v !== i + 1))
    err(`${d.slug}: itinerary days are ${days.join(',')} - expected 1..${days.length}`);

  for (const day of d.itinerary)
    for (const pid of day.placeIds)
      if (!ids.has(pid)) err(`${d.slug} day ${day.day}: references missing place id "${pid}"`);
}

const places = destinations.reduce((n, d) => n + d.places.length, 0);

// Never let the absence of proof read as proof. This validator checks URL SHAPE;
// it cannot open a socket. If the manifest is missing there is no evidence in the
// repo that any photo actually serves 200, and that must be stated out loud
// rather than inferred from a green run.
const photoUrls = new Set();
for (const c of countries) if (c.photo) photoUrls.add(c.photo);
for (const d of destinations) {
  for (const u of [d.photo, d.iconicLandmark?.photo]) if (u) photoUrls.add(u);
  for (const p of d.places) if (p.photo) photoUrls.add(p.photo);
}
const proven = [...photoUrls].filter((u) => probeState(u) === 'ok').length;
const deadCount = [...photoUrls].filter((u) => probeState(u) === 'failed').length;
if (deadCount)
  console.log(
    `\nDEAD  ${deadCount} photo URLs are CONFIRMED not serving 200 (browser-probed 2026-07-27).` +
      ` They render as a silent gradient fallback. Root cause for most of them is file-extension` +
      ` case: an earlier pass lowercased Commons ".JPG" to ".jpg". 14 of a 16-URL sample were` +
      ` recovered by restoring the original case, so treat these as REPAIRABLE, not as deletions.`,
  );
if (!manifestExists)
  console.log(
    `\nNOTE  ${MANIFEST_FILE} is absent, so NONE of the ${photoUrls.size} photo URLs in the` +
      ` catalog has HTTP evidence in this repo. A passing run here means the URLs are well` +
      ` FORMED, not that they load. Run scripts/verify-photos.mjs where the network is open` +
      ` and commit the manifest.`,
  );
else if (proven < photoUrls.size)
  console.log(
    `\nNOTE  ${proven}/${photoUrls.size} photo URLs have HTTP evidence in ${MANIFEST_FILE}.` +
      ` The remaining ${photoUrls.size - proven} are unproven - rerun scripts/verify-photos.mjs.`,
  );

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(
  `\n${destinations.length} destinations, ${countries.length} countries, ${places} places` +
    ` - ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
