/**
 * Mirrors every catalog photograph into our own storage, at 1280px, with its
 * credit.
 *
 * ## What changed, and why this is now the serving path
 *
 * The first version of this script was an *archive*: it copied the bytes as
 * insurance and nothing rendered from it, on the reasoning that Commons resizes
 * on demand and a single stored width would ship 150KB to a phone that was
 * getting 60KB. That reasoning assumed the copy would be served raw. It is not -
 * it is served through `next/image`, which resizes per device from the 1280px
 * original, so the phone gets a smaller file than Commons was sending it AND a
 * dense screen finally gets something sharp.
 *
 * The two problems it fixes were both real and measured:
 *
 * - **Blurry on retina.** Catalog URLs are 250-500px. A card is ~360 CSS px on a
 *   DPR 3 phone, i.e. ~1080 real pixels.
 * - **A Commons rename is a silent dead image.** The URL embeds the filename and
 *   an md5 of it, and there is no redirect. This log records 151 dead URLs from
 *   one earlier pass and several sessions spent repairing them by hand.
 *
 * ## Resumable, and it has to be
 *
 * ~3,000 files paced for Wikimedia is a long run. The manifest is written after
 * every batch and a file that already has a `url` is skipped, so a throttle, a
 * dropped connection or a Ctrl-C costs a batch rather than the run. Nothing is
 * re-uploaded: the storage path is derived from the filename, so a second run
 * over the same file would be an identical overwrite, and it is skipped instead.
 *
 * ## The derived path is verified, not trusted
 *
 * `src/lib/photoMirror.ts` derives the public URL at render time with no lookup.
 * That only works if the store returns exactly the URL we derived, so every
 * upload asserts it. A mismatch aborts the run rather than filling a manifest
 * with URLs the site will never ask for.
 *
 * ## Usage
 *
 *   npm run mirror:photos -- --dry          # download + plan, no upload
 *   npm run mirror:photos                   # mirror what is missing
 *   npm run mirror:photos -- --limit 50     # a slice, for a first run
 *   npm run mirror:photos -- --force        # re-upload everything
 *
 * Needs BLOB_READ_WRITE_TOKEN for a real run. When it finishes, put the store's
 * origin in NEXT_PUBLIC_PHOTO_MIRROR_BASE - the script prints it - and redeploy.
 * Until that variable is set the site keeps serving from Commons exactly as
 * before, which is what makes this safe to run in pieces.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ARCHIVE_WIDTH, archiveUrl, blobPath, fileNameFromUrl } from './lib/archive-url.mjs';

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
const UA = 'tiyul-plus-photo-mirror/2.0 (https://www.tiyulplus.com; natikyan153@gmail.com)';

/* ---------- the list of files to mirror ---------- */

/**
 * Every distinct Commons thumb URL the catalog references.
 *
 * Read out of the data with a regex rather than by importing it: the only thing
 * needed here is the URLs, and the data file is 44,000 lines of TypeScript.
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
  if (!existsSync(MANIFEST)) return { generatedAt: null, base: null, width: null, files: {} };
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
 * `dead` - which would have written "this photograph no longer exists" into the
 * manifest for eleven files that were perfectly fine, and then skipped them on
 * every later run. This project's log has the same lesson from a photo-geosearch
 * pass, where it cost a whole run.
 *
 * Only a genuine 404 or 410 is a death. Anything else is retried, and if it
 * still will not come it is reported as unresolved and left out of the manifest
 * so the next run picks it up again.
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
    const wait =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return download(url, attempt + 1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: true, buf, contentType: res.headers.get('content-type') ?? 'image/jpeg' };
}

/**
 * Imported lazily so `--dry` runs with no token and no SDK loaded. A mirror
 * script that cannot be rehearsed without provisioning a paid store is one
 * nobody rehearses.
 */
async function upload(path, buf, contentType) {
  const { put } = await import('@vercel/blob');
  const res = await put(path, buf, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    // The bytes never change under a given path, so a long immutable cache is
    // free correctness. next/image caches its own transformations separately.
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return res.url;
}

function main() {
  if (!DRY && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      'BLOB_READ_WRITE_TOKEN is not set.\n' +
        'Create a Blob store in the Vercel dashboard, copy its read-write token,\n' +
        'and either export it or run with --dry to rehearse without uploading.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }
  return run();
}

async function run() {
  const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
  const manifest = loadManifest();
  manifest.width = ARCHIVE_WIDTH;
  const urls = catalogThumbUrls();

  /*
    A collision would mean one photograph silently overwriting another in the
    store, and it is checked over the WHOLE catalog rather than over the slice
    being uploaded - a `--limit` run must not be able to hide one.
  */
  const byPath = new Map();
  for (const url of urls) {
    const name = fileNameFromUrl(url);
    if (!name) continue;
    const path = blobPath(name);
    const clash = byPath.get(path);
    if (clash && clash !== name) {
      console.error(`path collision: "${clash}" and "${name}" both map to ${path}`);
      process.exitCode = 1;
      return;
    }
    byPath.set(path, name);
  }

  const todo = [];
  for (const url of urls) {
    const name = fileNameFromUrl(url);
    if (!name) continue;
    const have = manifest.files[name];
    // Resumable: anything already uploaded, or already known gone from Commons,
    // is left alone unless --force.
    if (!FORCE && have && (have.url || have.dead)) continue;
    todo.push({ url, name, sourceWidth: credits[name]?.width ?? null });
  }

  console.log(
    `${urls.length} distinct catalog photos, ` +
      `${Object.values(manifest.files).filter((f) => f.url).length} already mirrored, ` +
      `${todo.length} to do${LIMIT === Infinity ? '' : ` (limited to ${LIMIT})`}`,
  );

  let done = 0;
  let dead = 0;
  let unresolved = 0;
  let bytes = 0;
  const slice = todo.slice(0, LIMIT === Infinity ? undefined : LIMIT);

  for (const item of slice) {
    const { url, width } = archiveUrl(item.url, item.sourceWidth);
    const path = blobPath(item.name);

    const got = await download(url);
    if (got.dead) {
      // A dead source is a finding, not an error: it is exactly the loss this
      // mirror exists to prevent, and it happened before we got here. Recorded
      // so the next run does not keep asking, and so the count is visible.
      dead++;
      console.log(`  DEAD ${got.status}  ${item.name}`);
      manifest.files[item.name] = { dead: true, status: got.status, source: url };
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

    /*
      The credit travels with the copy. The catalog keeps pointing at Commons, so
      `lib/server/photoCredit.ts` can still resolve Artist and LicenseShortName
      from the URL - but a mirror that recorded only bytes would be a set of
      photographs with no licence attached to them, which is the situation this
      project spent a session fixing.
    */
    const c = credits[item.name] ?? {};
    const record = {
      path,
      width,
      bytes: got.buf.length,
      artist: c.artist ?? null,
      license: c.license ?? null,
      licenseUrl: c.licenseUrl ?? null,
      descriptionUrl: c.descriptionUrl ?? null,
      source: url,
    };

    if (DRY) {
      manifest.files[item.name] = { ...record, dry: true };
    } else {
      const blobUrl = await upload(path, got.buf, got.contentType);
      const base = blobUrl.slice(0, blobUrl.indexOf('/', 'https://'.length));
      // The renderer derives `${base}/${path}` with no lookup. If the store
      // disagrees, every mirrored image on the site would 404 - so stop here
      // rather than write a manifest the site cannot use.
      if (blobUrl !== `${base}/${path}`) {
        console.error(
          `\nthe store returned a path we do not derive:\n  expected ${base}/${path}\n  got      ${blobUrl}\n` +
            'Fix mirrorPathname() in src/lib/photoMirror.ts before continuing.',
        );
        saveManifest(manifest);
        process.exitCode = 1;
        return;
      }
      manifest.files[item.name] = { ...record, url: blobUrl };
      manifest.base ??= base;
    }
    done++;

    // Paced for Wikimedia's sake, and the manifest lands often enough that an
    // interruption costs a batch rather than the run. A dry run writes nothing
    // at all - a rehearsal that leaves a manifest behind looks like state.
    if (done % 25 === 0) {
      if (!DRY) saveManifest(manifest);
      console.log(`  ${done}/${slice.length} - ${(bytes / 1e6).toFixed(1)}MB so far`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  if (!DRY) saveManifest(manifest);

  const mirrored = Object.values(manifest.files).filter((f) => f.url).length;
  const missing = urls.length - mirrored - Object.values(manifest.files).filter((f) => f.dead).length;
  console.log(
    `\n${DRY ? 'DRY RUN - nothing uploaded. ' : ''}mirrored ${done}, gone-from-Commons ${dead}, ` +
      `unresolved ${unresolved} (will be retried), ${(bytes / 1e6).toFixed(1)}MB` +
      (DRY
        ? `\nestimated full-catalog size: ${(((bytes / Math.max(done, 1)) * urls.length) / 1e6).toFixed(0)}MB`
        : ''),
  );

  if (!DRY && manifest.base) {
    console.log(
      missing > 0
        ? `\n${missing} catalog photos are still not mirrored. Re-run until that reaches 0 BEFORE\n` +
            'setting NEXT_PUBLIC_PHOTO_MIRROR_BASE - a file that is not in the store yet would 404.'
        : `\nAll catalog photos are mirrored. Set this in Vercel and redeploy:\n` +
            `  NEXT_PUBLIC_PHOTO_MIRROR_BASE=${manifest.base}`,
    );
  }
}

await main();
