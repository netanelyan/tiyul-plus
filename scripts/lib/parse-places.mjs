// פרסור קליל של src/data/destinations.ts בלי להריץ TypeScript.
// הקובץ נכתב ביד ובפורמט אחיד, ולכן סריקה לפי הזחה מספיקה כאן ובטוחה
// יותר מאשר להריץ את הקוד: אין תלות ב-tsc, אין path aliases, ואין סיכון
// שהרצת דאטה תפעיל תופעות לוואי.
//
// שני הסקריפטים (fetch-photos, apply-photos) חולקים את הפרסור הזה כדי
// שההתאמה בין הדוח לבין הקובץ תהיה על אותו בסיס בדיוק.
import { readFileSync } from 'node:fs';

export const DESTINATIONS_FILE = 'src/data/destinations.ts';

/**
 * @typedef {object} ParsedPlace
 * @property {string} id
 * @property {string} destSlug     ה-slug של היעד שהמקום שייך לו
 * @property {string} name         שם עברי
 * @property {string} nameLocal    שם לועזי - זה מה שמחפשים בוויקיפדיה
 * @property {number} lat
 * @property {number} lng
 * @property {boolean} hasPhoto
 * @property {number} idLine       מספר שורה (0-based) של שורת ה-id
 * @property {string} indent       ההזחה של שדות האובייקט, לשמירה על פורמט
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

    // שדות של אותו אובייקט = שורות באותה הזחה בדיוק, עד ה-id הבא או עד
    // שההזחה מתקצרת (סוף האובייקט). ערכים רב-שורתיים לא מעניינים אותנו.
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

    // שם יכול להיות בגרש בודד או במרכאות כפולות: prettier עובר למרכאות
    // כפולות כשיש גרש בתוך המחרוזת (למשל "St. Stephen's Cathedral").
    const str = (raw) =>
      (raw ?? '').match(/^'([^']*)'/)?.[1] ?? (raw ?? '').match(/^"([^"]*)"/)?.[1] ?? '';

    const lat = Number.parseFloat(fields.lat ?? '');
    const lng = Number.parseFloat(fields.lng ?? '');
    const nameLocal = str(fields.nameLocal);
    const name = str(fields.name);

    // אובייקט שאין לו קואורדינטות ושם לועזי הוא לא מקום (למשל רשומה אחרת
    // שבמקרה יש בה id) - מדלגים במקום לנחש.
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

/** מרחק בקילומטרים בין שתי נקודות (haversine) */
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
