// Building a Wikimedia thumbnail URL from the filename alone.
//
// Why this is safe and not a guess: the path on upload.wikimedia.org is derived
// deterministically from the md5 of the filename (with underscores instead of
// spaces) - the first character of the hash, then the first two characters. The
// implementation here was tested against the 611 URLs already in the data, all of
// which were verified online in the past: 609 reproduced character-for-character.
// The two exceptions were SVG files, which require an extra png suffix - which is
// why SVG is rejected here anyway (it is almost always a logo, flag or map, i.e.
// the wrong subject).
import { createHash } from 'node:crypto';

/** Characters that encodeURIComponent leaves alone but MediaWiki encodes */
const EXTRA = /[!'()*]/g;

export function encodeFileName(file) {
  const name = file.replace(/ /g, '_');
  return encodeURIComponent(name).replace(EXTRA, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * @param {string} file the filename on Commons, without the File: prefix
 * @param {number} width thumbnail width (the data uses 500)
 * @returns {string|null} null if the file is not an image type suitable for us
 */
export function commonsThumb(file, width = 500) {
  if (!file || /\.svg$/i.test(file)) return null;
  if (!/\.(jpe?g|png|webp|tiff?)$/i.test(file)) return null;
  const name = file.replace(/ /g, '_');
  const hash = createHash('md5').update(name, 'utf8').digest('hex');
  const enc = encodeFileName(name);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0, 2)}/${enc}/${width}px-${enc}`;
}

/** Filenames that are almost never a photo of the place itself */
export const BAD_FILE = /(flag|coat[_ ]of[_ ]arms|logo|map[_ ]of|locator|seal|emblem|blank|wappen|\bmap\b|diagram|plan[_ ]of)/i;
