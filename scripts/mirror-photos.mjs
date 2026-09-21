/**
 * Archives every catalog photograph into our own storage.
 *
 * ## An archive, not a CDN, and the difference is the whole design
 *
 * The plan this came from said "prefer the mirror when present". It should
 * not, for two reasons that only showed up once the numbers were real.
 *
 * **You cannot mirror a URL after it dies.** The reactive version - notice a
 * dead link, then copy it - is incoherent: the bytes are gone from Commons by
 * the time we know. A copy is only worth anything if it was taken while the
 * original was alive, which makes this necessarily a proactive, run-it-often
 * job rather than a repair.
 *
 * **Serving from the copy would cost bytes.** The cards render a responsive
 * srcSet (250/330/500/960) and Commons resizes on demand; we would have to
 * store every width to match it, and a single stored width would ship ~150KB
 * to a phone that gets ~60KB today. That is a measured regression traded for a
 * rare failure.
 *
 * So nothing serves from here. Commons stays primary, the rendering path is
 * untouched and literally cannot regress, and this is insurance on the
 * catalog's photographs - the part of the product that is hardest to rebuild.
 * When a URL does die, the bytes are still ours and a human can restore or
 * re-upload from the manifest.
 *
 * Storage only, near-zero bandwidth: about 450MB, which is cents a month.
 *
 * ## Usage
 *
 *   node scripts/mirror-photos.mjs --dry            # download + plan, no upload
 *   node scripts/mirror-photos.mjs                  # archive what is missing
 *   node scripts/mirror-photos.mjs --limit 50       # a slice, for a first run
 *   node scripts/mirror-photos.mjs --force          # re-archive everything
 *
 * Needs BLOB_READ_WRITE_TOKEN in the environment for a real run. It is
 * resumable by design - the manifest is written after every batch, so a
 * throttle or a dropped connection costs a batch and not the run.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { archiveUrl, blobPath, fileNameFromUrl } from './lib/archive-url.mjs';

const MANIFEST = 'scripts/photo-mirror.json';
const CREDITS = 'scripts/photo-credits.json';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();

/** Wikimedia asks tools to identify themselves with a contact. */
const UA = 'tiyul-plus-photo-archive/1.0 (https://www.tiyulplus.com; natikyan153@gmail.com)';

/* ---------- the list of files to archive ---------- */

/**
 * Every distinct Commons thumb URL the catalog references.
 *
 * Read out of the data with a regex rather than by importing it: this is a
 * plain script, the data file is 44,000 lines of TypeScript, and the only
 * thing needed here is the URLs.
 */
function catalogThumbUrls() {
  const urls = new Set();
  for (const file of ['src/data/destinations.ts', 'src/data/countries.ts']) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/https:\/\/upload\.wikimedia\.org\/\S*?\/(\d+)px-[^'"\s]+/g)) {
      urls.add(m[0]);
    }
  }
  return [...urls];
}

/* ---------- the manifest ---------- */

function loadManifest() {
  if (!existsSync(MANIFEST)) return { generatedAt: null, base: null, files: {} };
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

function saveManifest(m) {
  m.generatedAt = new Date().toISOString();
  writeFileSync(MANIFEST, `${JSON.stringify(m, null, 1)}\n`, 'utf8');
}

/* ---------- the run ---------- */

/**
 * Downloads one file, backing off rather than believing a throttle.
 *
 * **A rate limit is not an absence.** Wikimedia answers 429 readily under a
 * sequential run, and the first version of this script recorded those as
 * `dead` - which would have written "this photograph no longer exists" into
 * the manifest for eleven files that were perfectly fine, and then skipped
 * them on every later run. This project's log has the same lesson from a
 * photo-geosearch pass; it cost a whole run there.
 *
 * Only a genuine 404 or 410 is a death. Anything else is retried, and if it
 * still will not come, it is reported as unresolved and left out of the
 * manifest so the next run picks it up again.
 */
async function download(url, attempt = 0) {
  let res;
  try {
    res = await fetch(url, { headers: { 'user-agent': UA } });
  } catch (err) {
    if (attempt >= 4) return { ok: false, transient: true, status: 0, note: String(err) };
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    return download(url, attempt + 1);
  }
  if (res.status === 404 || res.status === 410) return { ok: false, dead: true, status: res.status };
  if (!res.ok) {
    if (attempt >= 4) return { ok: false, transient: true, status: res.status };
    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return download(url, attempt + 1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: true, buf, contentType: res.headers.get('content-type') ?? 'image/jpeg' };
}

/**
 * Imported lazily so `--dry` runs with no token and no SDK installed. An
 * archive script that cannot be rehearsed without provisioning a paid store
 * is one nobody rehearses.
 */
async function upload(path, buf, contentType) {
  const { put } = await import('@vercel/blob');
  const res = await put(path, buf, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return res.url;
}

async function main() {
  if (!DRY && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      'BLOB_READ_WRITE_TOKEN is not set.\n' +
        'Create a Blob store in the Vercel dashboard, copy its read-write token,\n' +
        'and either export it or run with --dry to rehearse without uploading.',
    );
    process.exitCode = 1;
    return;
  }

  const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
  const manifest = loadManifest();
  const urls = catalogThumbUrls();

  const todo = [];
  for (const url of urls) {
    const name = fileNameFromUrl(url);
    if (!name) continue;
    if (!FORCE && manifest.files[name]) continue;
    todo.push({ url, name, sourceWidth: credits[name]?.width ?? null });
  }

  console.log(
    `${urls.length} distinct catalog photos, ${Object.keys(manifest.files).length} already archived, ${todo.length} to do` +
      (LIMIT === Infinity ? '' : ` (limited to ${LIMIT})`),
  );

  let done = 0,
    dead = 0,
    unresolved = 0,
    bytes = 0;
  const slice = todo.slice(0, LIMIT === Infinity ? undefined : LIMIT);

  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    const { url, width } = archiveUrl(item.url, item.sourceWidth);
    const path = blobPath(item.name, width);

    const got = await download(url);
    if (got.dead) {
      // A dead source is a finding, not an error: it is exactly the loss this
      // archive exists to prevent, and it happened before we got here. It is
      // recorded so the next run does not keep asking.
      dead++;
      console.log(`  DEAD ${got.status}  ${item.name}`);
      manifest.files[item.name] = { dead: true, status: got.status, url };
      continue;
    }
    if (!got.ok) {
      // Unresolved, NOT absent - deliberately left out of the manifest so the
      // next run tries again instead of inheriting a wrong conclusion.
      unresolved++;
      console.log(`  retry-later ${got.status}  ${item.name}`);
      continue;
    }
    bytes += got.buf.length;

    if (DRY) {
      manifest.files[item.name] = { path, width, bytes: got.buf.length, dry: true };
    } else {
      const blobUrl = await upload(path, got.buf, got.contentType);
      manifest.files[item.name] = { path, width, bytes: got.buf.length, url: blobUrl };
      manifest.base ??= blobUrl.slice(0, blobUrl.indexOf('/', 'https://'.length));
    }
    done++;

    // Paced for Wikimedia's sake, and the manifest lands often enough that an
    // interruption costs a batch rather than the run. A dry run writes nothing
    // at all - a rehearsal that leaves a manifest behind is a rehearsal that
    // looks like state.
    if (done % 25 === 0) {
      if (!DRY) saveManifest(manifest);
      console.log(`  ${done}/${slice.length} - ${(bytes / 1e6).toFixed(1)}MB so far`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  if (!DRY) saveManifest(manifest);
  console.log(
    `\n${DRY ? 'DRY RUN - nothing uploaded. ' : ''}archived ${done}, gone-from-Commons ${dead}, ` +
      `unresolved ${unresolved} (will be retried), ${(bytes / 1e6).toFixed(1)}MB` +
      (DRY
        ? `\nestimated full-catalog size: ${(((bytes / Math.max(done, 1)) * urls.length) / 1e6).toFixed(0)}MB`
        : ''),
  );
}

await main();
