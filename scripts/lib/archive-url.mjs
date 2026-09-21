/**
 * The two pure decisions the photo mirror makes, kept out of the script so they
 * can be tested.
 *
 * `src/lib/photoArchive.test.ts` guards both. That matters most for
 * `archiveUrl`: it is the one place in this repo that deliberately asks
 * Wikimedia for a WIDER thumbnail than the URL already names, and widening
 * without knowing the source width is exactly the mistake that killed 170
 * catalog URLs in an earlier session. The rule is only safe because the
 * credits manifest carries each original's real width.
 *
 * The storage path is NOT decided here - it comes from `src/lib/photoMirror.ts`,
 * because the browser derives the same path at render time and two
 * implementations of one string format is how they drift. That module is the
 * single definition; this file only re-exports it so the script reads as one
 * piece. Importing a `.ts` file is why the script runs through the type-stripping
 * loader (`npm run mirror:photos`).
 */
import {
  MIRROR_WIDTH,
  mirrorFileName,
  mirrorPathname,
  widenedThumb,
} from '../../src/lib/photoMirror.ts';

/**
 * The widest thumbnail worth archiving.
 *
 * 1200 rather than the catalog's old 960 ceiling: a destination hero is a
 * full-bleed image, and at DPR 2 on a laptop that is already past 960. Commons
 * measures 2,768 of 2,978 files at 960px or more, and the great majority are
 * several thousand pixels wide, so the extra width is nearly always available.
 */
export const ARCHIVE_WIDTH = MIRROR_WIDTH;

/** The Commons filename inside a thumb URL, decoded. */
export const fileNameFromUrl = mirrorFileName;

/**
 * Where the copy is stored.
 *
 * Width is deliberately NOT part of the path. The path names "our copy of this
 * photograph", and the stored file is up to `ARCHIVE_WIDTH` wide - less when the
 * original is smaller, which is true of about 200 files. Putting the achieved
 * width in the path would mean the renderer could not derive it without knowing
 * each original's size, i.e. it would need the manifest, which is the whole
 * thing this design avoids.
 */
export const blobPath = mirrorPathname;

/**
 * The URL to archive from, and the width it will be.
 *
 * The rule lives in `src/lib/photoMirror.ts` because the share-card builder
 * needs the same decision, and two implementations of "how wide may we ask
 * Commons for" is how they drift - the same reason `blobPath` is a re-export
 * rather than a copy. Read `widenedThumb` there for why it is safe.
 */
export const archiveUrl = widenedThumb;
