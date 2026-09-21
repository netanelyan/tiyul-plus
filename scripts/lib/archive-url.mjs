/**
 * The two pure decisions the photo archive makes, kept out of the script so
 * they can be tested.
 *
 * `src/lib/photoArchive.test.ts` guards both. That matters most for
 * `archiveUrl`: it is the one place in this repo that deliberately asks
 * Wikimedia for a WIDER thumbnail than the URL already names, and widening
 * without knowing the source width is exactly the mistake that killed 170
 * catalog URLs in an earlier session. The rule is only safe because the
 * credits manifest carries each original's real width.
 */
import { createHash } from 'node:crypto';

const THUMB = /^(https:\/\/upload\.wikimedia\.org\/\S*\/)(\d+)px-([^/]+)$/;

/** The widest thumbnail width worth archiving. Matches the catalog's ceiling. */
export const ARCHIVE_WIDTH = 960;

/** The Commons filename inside a thumb URL, decoded. */
export function fileNameFromUrl(url) {
  const m = url.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/\d+px-/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * The URL to archive from, and the width it will be.
 *
 * Widens towards ARCHIVE_WIDTH **only** as far as the known source width
 * allows, and never past it. With no known source width the width already in
 * the URL is the only one proven to exist, so it is left alone - the safe
 * direction to be wrong is downwards, because a narrower thumbnail always
 * exists and a wider one does not necessarily.
 */
export function archiveUrl(url, sourceWidth) {
  const m = url.match(THUMB);
  if (!m) return { url, width: null };
  const current = Number(m[2]);
  if (!sourceWidth || sourceWidth <= current) return { url, width: current };
  const width = Math.min(ARCHIVE_WIDTH, sourceWidth);
  if (width <= current) return { url, width: current };
  return { url: `${m[1]}${width}px-${m[3]}`, width };
}

/**
 * A deterministic path, addressed by the FILENAME rather than by the bytes.
 *
 * Re-running therefore produces the same path and an upload is idempotent,
 * which is what makes `--force` safe and a resumed run cheap. Bytes-addressing
 * would make every re-encode a new object and quietly grow the bill.
 */
export function blobPath(fileName, width) {
  const h = createHash('sha256').update(fileName).digest('hex');
  const ext = (fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'jpg').toLowerCase();
  return `catalog-photos/${h.slice(0, 2)}/${h}-${width ?? 'src'}.${ext}`;
}
