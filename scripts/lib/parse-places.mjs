// Lightweight parsing of src/data/destinations.ts without running TypeScript.
// The file is hand-written in a uniform format, so an indentation-based scan
// is sufficient here and safer than executing the code: no tsc dependency,
// no path aliases, and no risk that running the data triggers side effects.
//
// The two scripts (fetch-photos, apply-photos) share this parser so that the
// match between the report and the file rests on exactly the same basis.
import { readFileSync } from 'node:fs';

export const DESTINATIONS_FILE = 'src/data/destinations.ts';

/**
 * @typedef {object} ParsedPlace
 * @property {string} id
 * @property {string} destSlug     the slug of the destination the place belongs to
 * @property {string} name         Hebrew name
 * @property {string} nameLocal    Latin name - this is what gets searched on Wikipedia
 * @property {number} lat
 * @property {number} lng
 * @property {boolean} hasPhoto
 * @property {number} idLine       line number (0-based) of the id line
 * @property {string} indent       the indentation of the object's fields, to preserve formatting
 */

/** @returns {{ places: ParsedPlace[], lines: string[], source: string }} */
export function parsePlaces(file = DESTINATIONS_FILE) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  /** @type {ParsedPlace[]} */
  const places = [];
  let destSlug = '';

  for (let i = 0; i < lines.length; i++) {
    const destMatch = lines[i].match(/^ {4}slug: '([^']+)',$/);
    if (destMatch) {
      destSlug = destMatch[1];
      continue;
    }

    const idMatch = lines[i].match(/^( +)id: '([^']+)',$/);
    if (!idMatch) continue;

    const indent = idMatch[1];
    /** @type {Record<string, string>} */
    const fields = {};

    // Fields of the same object = lines at exactly the same indentation, up
    // to the next id or until the indentation shortens (end of the object).
    // Multi-line values are of no interest to us.
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() === '') continue;
      const lead = line.match(/^ */)[0];
      if (lead.length < indent.length) break;
      if (lead.length > indent.length) continue;
      if (/^ +id: '/.test(line)) break;
      const kv = line.match(/^ +([A-Za-z]+):\s*(.*)$/);
      if (kv) fields[kv[1]] = kv[2];
    }

    // A name can be in single quotes or double quotes: prettier switches to
    // double quotes when the string contains an apostrophe (e.g.
    // "St. Stephen's Cathedral").
    const str = (raw) =>
      (raw ?? '').match(/^'([^']*)'/)?.[1] ?? (raw ?? '').match(/^"([^"]*)"/)?.[1] ?? '';

    const lat = Number.parseFloat(fields.lat ?? '');
    const lng = Number.parseFloat(fields.lng ?? '');
    const nameLocal = str(fields.nameLocal);
    const name = str(fields.name);

    // An object with no coordinates and no Latin name is not a place (e.g.
    // some other record that happens to carry an id) - skip instead of guess.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !nameLocal) continue;

    places.push({
      id: idMatch[2],
      destSlug,
      name,
      nameLocal,
      lat,
      lng,
      hasPhoto: 'photo' in fields,
      idLine: i,
      indent,
    });
  }

  return { places, lines, source };
}

/** Distance in kilometers between two points (haversine) */
export function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
