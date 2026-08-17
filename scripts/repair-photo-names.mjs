// Repairing broken Commons filenames in the catalog.
//
// Why this exists: a browser scan on 2026-07-27 found that 151 of the 1,396 photo
// URLs in the catalog return 404, and **not one of them is rescuable at another
// width** (960/500/330/250 were tried). In other words these are dead files, not a
// width problem. The root cause in most cases is **extension letter case**: Commons
// filenames are case-sensitive, and an earlier pass converted ".JPG" to ".jpg". In a
// sample of 16 URLs, 14 came back to life from restoring the original case alone -
// same photo, same subject.
//
// Additional corruption classes identified in the same scan:
//   * double encoding:      Torre_Bel%C3%A9m  (instead of Torre_Belém)
//   * swallowed apostrophe: musée_dart        (instead of musée_d'art)
//   * lowercase first letter: bengmealea      (Commons always capitalizes the first letter)
//
// **The trap that hid all of this:** a wrong filename still matches its own md5,
// because the /x/xy/ prefix is derived from the same wrong string. So a prefix scan
// over 1,620 URLs returned 0 errors and proved nothing. Only an HTTP check can see
// this class - which is why this script verifies against Commons instead of guessing.
//
// Running it (needs network - the sandbox blocks upload.wikimedia.org, so this runs
// on Netanel's machine or in a session with a browser):
//   node scripts/repair-photo-names.mjs --dry     # report only, no writes
//   node scripts/repair-photo-names.mjs           # fix and write
//
// The script never invents a replacement photo: it fixes the **existing filename**
// only. If no variant is found on Commons, the URL is left as-is and reported as
// UNRESOLVED, so a human decides. Omission beats a guess.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DRY = process.argv.includes('--dry');
const FILES = ['src/data/destinations.ts', 'src/data/countries.ts'];
const MANIFEST = 'scripts/photo-verified.json';
const API = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED_WIDTHS = [960, 500, 330, 250];

// Wikimedia policy requires a User-Agent that identifies the tool and gives a way
// to make contact. A generic UA is a known cause of 429/403, and we got a 429 on the
// first run.
const HEADERS = {
  'User-Agent': 'tiyul-plus-photo-repair/1.1 (https://github.com/netanelyan/tiyul-plus)',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept-Encoding': 'gzip',
};
const BACKOFF_MS = [2_000, 5_000, 12_000, 30_000, 60_000];
const PACE_MS = 1_000; // between batches. Deliberately slow - better to run a minute longer than to get blocked.

/**
 * The Commons path is a pure function of the filename: md5 of the unencoded name.
 * Verified against the catalog: 1,106 of 1,263 live URLs reproduce byte-for-byte.
 *
 * The remaining 157 differ only in parenthesis-encoding style: encodeURIComponent
 * leaves "(" and ")" as-is, while MediaWiki encodes them as %28/%29. **Both forms
 * live in the catalog and both work**, so this is purely a style matter - but we
 * keep the original style so the diff shows only the real fix and not encoding
 * noise. The md5 prefix is identical in both forms, because it is derived from the
 * decoded name.
 */
function thumbUrl(filename, width, encodeParens = false) {
  const h = createHash('md5').update(filename, 'utf8').digest('hex');
  let e = encodeURIComponent(filename).replace(/'/g, '%27');
  if (encodeParens) e = e.replace(/\(/g, '%28').replace(/\)/g, '%29');
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${e}/${width}px-${e}`;
}

/** All plausible variants of a broken filename, from most to least likely. */
function variants(name) {
  const stem = name.replace(/\.[A-Za-z]+$/, '');
  const ext = (name.match(/\.[A-Za-z]+$/) || ['.jpg'])[0];
  const stems = new Set([stem]);
  // Double encoding: if %XX sequences remain after decoding, they were encoded twice
  if (stem.includes('%')) {
    try {
      const d = decodeURIComponent(stem);
      if (d !== stem) stems.add(d);
    } catch {
      /* invalid % sequence - ignore */
    }
  }
  // Commons always capitalizes the first letter
  for (const s of [...stems]) if (/^[a-z]/.test(s)) stems.add(s[0].toUpperCase() + s.slice(1));
  const exts = [ext, '.JPG', '.jpg', '.jpeg', '.JPEG', '.png', '.PNG', '.tif', '.tiff'];
  const out = [];
  for (const s of stems) for (const e of exts) out.push(s + e);
  return [...new Set(out)].filter((v) => v !== name);
}

/**
 * The REDIRECT trap, caught in production on 2026-07-27 and it cost one fix out of
 * 112: `Kykkos_monastry_from_the_air.JPG` is a Commons **redirect** to
 * `Kykkos_monastery_from_the_air.jpg` (note: both the spelling AND the extension
 * case). The API returns full imageinfo for the redirect - exists, 4416x3312,
 * image/jpeg - but **thumbnails exist only under the canonical title**, so the thumb
 * URL we built from the redirected name returned 404 at every width.
 *
 * The conclusion: `prop=imageinfo` alone does not prove the thumb will work. So we
 * request `iiurlwidth` and take `thumburl` **as-is** - it is always canonical - and
 * add `redirects=1` so titles resolve. Independent md5 construction remains only as
 * a fallback.
 */
/** imageinfo returns both existence and source width - both are needed to pick a legal width. */
/**
 * Existence + source-width lookup against Commons.
 *
 * **POST and not GET, and this is not cosmetic.** The first version packed 45
 * filenames into a GET query string. Some of the names here are longer than 100
 * characters, so the URL exceeded the limit and the request failed - and
 * `if (!res.ok) continue` swallowed the failure silently. The result: 88 files were
 * reported "not found" while they exist, and the split was determined by batch luck
 * rather than by the name. The fallback search found exactly those same files with a
 * .JPG extension.
 *
 * This is exactly the same mistake this session keeps chasing: **absence of evidence
 * read as evidence of absence.** So now: POST (no length limit), a smaller batch,
 * retry, and a real failure **throws** instead of being swallowed.
 */
async function lookup(titles) {
  // On-disk cache, because Commons rate-limits (429) and without it every block
  // loses all progress and forces starting over from zero - which only increases the
  // load and invites the next 429. A repeated run resumes from where it stopped.
  const CACHE = '.cache/commons-lookup.json';
  mkdirSync('.cache', { recursive: true });
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const found = new Map(Object.entries(cache).filter(([, v]) => v > 0));
  const asked = new Set(Object.keys(cache));
  const todo = titles.filter((t) => !asked.has(t));
  if (todo.length < titles.length)
    console.log(`resuming: ${titles.length - todo.length} titles already looked up, ${todo.length} to go`);

  const BATCH = 40;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const body = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'imageinfo',
      iiprop: 'size|url',
      titles: batch.map((t) => `File:${t}`).join('|'),
      // redirects=1 resolves redirects, and iiurlwidth returns a canonical thumburl
      // usable as-is instead of building the md5 ourselves. See the REDIRECT trap above.
      redirects: '1',
      iiurlwidth: '500',
    });
    let j = null;
    for (let attempt = 0; attempt < 6 && !j; attempt++) {
      try {
        const res = await fetch(API, { method: 'POST', headers: HEADERS, body });
        if (res.status === 429 || res.status >= 500) {
          // Retry-After is what Wikimedia asks us to honor. Without it - exponential backoff.
          const ra = Number(res.headers.get('retry-after'));
          const waitMs = Number.isFinite(ra) && ra > 0 ? ra * 1000 : BACKOFF_MS[attempt] ?? 60_000;
          if (attempt < 5) {
            console.log(`  HTTP ${res.status} on batch ${Math.floor(i / BATCH) + 1}, waiting ${Math.round(waitMs / 1000)}s...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        j = await res.json();
      } catch (e) {
        if (attempt === 5) {
          writeFileSync(CACHE, JSON.stringify(cache));
          throw new Error(
            `Commons lookup failed for batch ${Math.floor(i / BATCH) + 1} after 6 attempts: ${e.message}.\n` +
              `Progress WAS saved to ${CACHE} - just run the script again and it resumes.\n` +
              `Refusing to continue silently: a skipped batch is what made an earlier run ` +
              `report 88 false "not found" results.`,
          );
        }
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt] ?? 60_000));
      }
    }
    // formatversion=2 returns pages as an array, and titles with spaces instead of underscores
    const hit = new Set();
    for (const p of j?.query?.pages ?? [])
      if (p.imageinfo?.[0]) {
        const key = p.title.replace(/^File:/, '').replace(/ /g, '_');
        found.set(key, p.imageinfo[0].width);
        hit.add(key);
        cache[key] = p.imageinfo[0].width;
      }
    // Also record what was asked and not found, otherwise every re-run asks the same names again
    for (const t of batch) if (!hit.has(t)) cache[t] = 0;
    writeFileSync(CACHE, JSON.stringify(cache));
    process.stdout.write(`\r  looked up ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    await new Promise((r) => setTimeout(r, PACE_MS));
  }
  if (todo.length) console.log('');
  return found;
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const dead = Object.entries(manifest)
  .filter(([, v]) => v && typeof v === 'object' && v.ok === false)
  .map(([u]) => u);

if (dead.length === 0) {
  console.log(`No URLs are recorded as failing in ${MANIFEST}. Nothing to repair.`);
  process.exit(0);
}

const nameOf = (u) => decodeURIComponent(u.split('/').pop().replace(/^\d+px-/, ''));
const names = [...new Set(dead.map(nameOf))];
console.log(`${dead.length} dead URLs across ${names.length} distinct filenames.`);

const candByName = new Map(names.map((n) => [n, variants(n)]));
const found = await lookup([...new Set([...candByName.values()].flat())]);

/**
 * A normalized form for detecting "same name, different spelling": strip
 * accents/diacritics, fold case, and drop everything that is not a letter or digit.
 * That way `Üçhisar` and `Uçhisar`, `Krakow` and `Kraków`, `Slîtere` and `Slītere`,
 * and all three apostrophe kinds (ASCII ' , U+2019 ’ , U+02BB ʻ) map to the same
 * string.
 *
 * This is **not** a guess: a match here means the name is identical up to spelling,
 * so it is still a rename of the same file and not a choice of a different photo. A
 * partial or merely similar match stays outside this and is reported to a human.
 */
const norm = (s) =>
  s
    .replace(/\.[A-Za-z]+$/, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const fix = new Map(); // oldName -> { name, width }
const stillOpen = [];
for (const [n, cands] of candByName) {
  const hit = cands.find((c) => found.has(c));
  if (hit) fix.set(n, { name: hit, srcWidth: found.get(hit), how: 'variant' });
  else stillOpen.push(n);
}
const byVariant = fix.size;

// Second stage: for what did not resolve, ask Commons search and accept **only** a
// result whose normalized form is identical to the original name. That catches
// diacritic, apostrophe-kind and punctuation differences - i.e. the exact same file
// - without opening a door to picking a different photo.
const unresolved = [];
for (const n of stillOpen) {
  const target = norm(n);
  const term = n.replace(/\.[A-Za-z]+$/, '').replace(/[_-]+/g, ' ').replace(/%[0-9A-F]{2}/gi, ' ');
  let matched = null;
  try {
    const r = await fetch(
      `${API}?action=query&format=json&formatversion=2&generator=search&gsrsearch=${encodeURIComponent(
        `filetype:bitmap ${term}`,
      )}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=size`,
      { headers: { 'User-Agent': HEADERS['User-Agent'] } },
    );
    const j = await r.json();
    for (const p of j?.query?.pages ?? []) {
      if (!p.imageinfo?.[0]) continue;
      const cand = p.title.replace(/^File:/, '').replace(/ /g, '_');
      if (norm(cand) === target) {
        matched = { name: cand, srcWidth: p.imageinfo[0].width, how: 'spelling' };
        break;
      }
    }
  } catch {
    /* search is an aid - its failure just leaves the name on the list for a human */
  }
  if (matched) fix.set(n, matched);
  else unresolved.push(n);
  await new Promise((r) => setTimeout(r, PACE_MS));
}
const bySpelling = fix.size - byVariant;
console.log(
  `repairable: ${fix.size} (${byVariant} by filename variant, ${bySpelling} by spelling-only match)   unresolved: ${unresolved.length}`,
);
for (const [n, f] of fix)
  if (f.how === 'spelling') console.log(`  spelling: ${n}\n         -> ${f.name}`);

let rewrites = 0;
for (const file of FILES) {
  let src = readFileSync(file, 'utf8');
  for (const u of dead) {
    const f = fix.get(nameOf(u));
    if (!f) continue;
    const want = +(u.match(/\/(\d+)px-/)?.[1] ?? 500);
    // Never request a thumb wider than the source - that is exactly the silent 404 from the previous incident
    const width = ALLOWED_WIDTHS.find((w) => w <= f.srcWidth && w <= want) ?? ALLOWED_WIDTHS.at(-1);
    const next = thumbUrl(f.name, width, u.includes('%28') || u.includes('%29'));
    if (src.includes(u)) {
      src = src.split(u).join(next);
      manifest[next] = { ok: true, ts: Date.now() };
      delete manifest[u];
      rewrites++;
    }
  }
  if (!DRY) writeFileSync(file, src);
}

console.log(`${DRY ? '[dry run] would rewrite' : 'rewrote'} ${rewrites} URL occurrences.`);
if (unresolved.length) {
  console.log(`\n${unresolved.length} filenames could NOT be resolved and were left untouched.`);
  console.log('Commons search suggestions below are NOT applied - a human picks, or nothing ships.');
  console.log('Watch for the known traps: coat of arms, corporate logo, montage, and the right');
  console.log('name attached to the WRONG CITY (Cartagena_Cathedral returns Spain, not Colombia).\n');
  for (const n of unresolved) {
    const term = n.replace(/\.[A-Za-z]+$/, '').replace(/[_-]+/g, ' ').replace(/%[0-9A-F]{2}/gi, ' ');
    let sug = [];
    try {
      const r = await fetch(
        `${API}?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
          `filetype:bitmap ${term}`,
        )}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=size`,
        { headers: { 'User-Agent': HEADERS['User-Agent'] } },
      );
      const j = await r.json();
      sug = Object.values(j?.query?.pages ?? {})
        .filter((p) => p.imageinfo)
        .map((p) => `${p.title.replace(/^File:/, '')} (${p.imageinfo[0].width}px)`);
    } catch {
      /* search is an aid only - its failure does not take down the repair */
    }
    console.log(`  ${n}`);
    for (const s of sug) console.log(`      ? ${s}`);
    await new Promise((r) => setTimeout(r, PACE_MS));
  }
}
if (!DRY) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
  console.log(`\n${MANIFEST} updated. Now run:`);
  console.log('  node scripts/verify-photos.mjs --force');
  console.log('  node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/validate-catalog.mjs');
}
