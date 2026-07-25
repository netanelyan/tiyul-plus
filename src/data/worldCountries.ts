/**
 * מדינות העולם לפיצ'ר "איפה כבר הייתם" באזור האישי - קוד ISO2 (לדגל),
 * שם בעברית ויבשת. לא רשימת או"ם ממצה: ~85 היעדים שמטיילים ישראלים
 * באמת מגיעים אליהם, כולל כל מדינות הקטלוג. הוספת מדינה = שורה אחת.
 */

export type Continent = 'אירופה' | 'אסיה' | 'אפריקה והמזרח התיכון' | 'אמריקה' | 'אוקיאניה';

export interface WorldCountry {
  code: string; // ISO2, lowercase - משמש גם לדגל (flagcdn)
  name: string; // עברית
  continent: Continent;
}

export const WORLD_COUNTRIES: WorldCountry[] = [
  // ---- אירופה ----
  { code: 'fr', name: 'צרפת', continent: 'אירופה' },
  { code: 'gb', name: 'בריטניה', continent: 'אירופה' },
  { code: 'it', name: 'איטליה', continent: 'אירופה' },
  { code: 'es', name: 'ספרד', continent: 'אירופה' },
  { code: 'de', name: 'גרמניה', continent: 'אירופה' },
  { code: 'at', name: 'אוסטריה', continent: 'אירופה' },
  { code: 'ch', name: 'שווייץ', continent: 'אירופה' },
  { code: 'nl', name: 'הולנד', continent: 'אירופה' },
  { code: 'be', name: 'בלגיה', continent: 'אירופה' },
  { code: 'pt', name: 'פורטוגל', continent: 'אירופה' },
  { code: 'gr', name: 'יוון', continent: 'אירופה' },
  { code: 'cy', name: 'קפריסין', continent: 'אירופה' },
  { code: 'cz', name: 'צ׳כיה', continent: 'אירופה' },
  { code: 'sk', name: 'סלובקיה', continent: 'אירופה' },
  { code: 'hu', name: 'הונגריה', continent: 'אירופה' },
  { code: 'pl', name: 'פולין', continent: 'אירופה' },
  { code: 'ro', name: 'רומניה', continent: 'אירופה' },
  { code: 'bg', name: 'בולגריה', continent: 'אירופה' },
  { code: 'rs', name: 'סרביה', continent: 'אירופה' },
  { code: 'hr', name: 'קרואטיה', continent: 'אירופה' },
  { code: 'si', name: 'סלובניה', continent: 'אירופה' },
  { code: 'me', name: 'מונטנגרו', continent: 'אירופה' },
  { code: 'al', name: 'אלבניה', continent: 'אירופה' },
  { code: 'ba', name: 'בוסניה והרצגובינה', continent: 'אירופה' },
  { code: 'mk', name: 'מקדוניה הצפונית', continent: 'אירופה' },
  { code: 'is', name: 'איסלנד', continent: 'אירופה' },
  { code: 'no', name: 'נורווגיה', continent: 'אירופה' },
  { code: 'se', name: 'שוודיה', continent: 'אירופה' },
  { code: 'dk', name: 'דנמרק', continent: 'אירופה' },
  { code: 'fi', name: 'פינלנד', continent: 'אירופה' },
  { code: 'ie', name: 'אירלנד', continent: 'אירופה' },
  { code: 'ee', name: 'אסטוניה', continent: 'אירופה' },
  { code: 'lv', name: 'לטביה', continent: 'אירופה' },
  { code: 'lt', name: 'ליטא', continent: 'אירופה' },
  { code: 'mt', name: 'מלטה', continent: 'אירופה' },
  { code: 'mc', name: 'מונקו', continent: 'אירופה' },
  { code: 'ua', name: 'אוקראינה', continent: 'אירופה' },
  { code: 'md', name: 'מולדובה', continent: 'אירופה' },
  { code: 'ru', name: 'רוסיה', continent: 'אירופה' },

  // ---- אסיה ----
  { code: 'tr', name: 'טורקיה', continent: 'אסיה' },
  { code: 'ge', name: 'גיאורגיה', continent: 'אסיה' },
  { code: 'am', name: 'ארמניה', continent: 'אסיה' },
  { code: 'az', name: 'אזרבייג׳ן', continent: 'אסיה' },
  { code: 'kz', name: 'קזחסטן', continent: 'אסיה' },
  { code: 'uz', name: 'אוזבקיסטן', continent: 'אסיה' },
  { code: 'kg', name: 'קירגיזסטן', continent: 'אסיה' },
  { code: 'mn', name: 'מונגוליה', continent: 'אסיה' },
  { code: 'th', name: 'תאילנד', continent: 'אסיה' },
  { code: 'vn', name: 'וייטנאם', continent: 'אסיה' },
  { code: 'kh', name: 'קמבודיה', continent: 'אסיה' },
  { code: 'la', name: 'לאוס', continent: 'אסיה' },
  { code: 'my', name: 'מלזיה', continent: 'אסיה' },
  { code: 'sg', name: 'סינגפור', continent: 'אסיה' },
  { code: 'id', name: 'אינדונזיה', continent: 'אסיה' },
  { code: 'ph', name: 'הפיליפינים', continent: 'אסיה' },
  { code: 'cn', name: 'סין', continent: 'אסיה' },
  { code: 'hk', name: 'הונג קונג', continent: 'אסיה' },
  { code: 'tw', name: 'טייוואן', continent: 'אסיה' },
  { code: 'jp', name: 'יפן', continent: 'אסיה' },
  { code: 'kr', name: 'דרום קוריאה', continent: 'אסיה' },
  { code: 'in', name: 'הודו', continent: 'אסיה' },
  { code: 'lk', name: 'סרי לנקה', continent: 'אסיה' },
  { code: 'np', name: 'נפאל', continent: 'אסיה' },
  { code: 'mv', name: 'המלדיביים', continent: 'אסיה' },

  // ---- אפריקה והמזרח התיכון ----
  { code: 'il', name: 'ישראל', continent: 'אפריקה והמזרח התיכון' },
  { code: 'jo', name: 'ירדן', continent: 'אפריקה והמזרח התיכון' },
  { code: 'ae', name: 'איחוד האמירויות', continent: 'אפריקה והמזרח התיכון' },
  { code: 'eg', name: 'מצרים', continent: 'אפריקה והמזרח התיכון' },
  { code: 'ma', name: 'מרוקו', continent: 'אפריקה והמזרח התיכון' },
  { code: 'tn', name: 'תוניסיה', continent: 'אפריקה והמזרח התיכון' },
  { code: 'ke', name: 'קניה', continent: 'אפריקה והמזרח התיכון' },
  { code: 'tz', name: 'טנזניה', continent: 'אפריקה והמזרח התיכון' },
  { code: 'et', name: 'אתיופיה', continent: 'אפריקה והמזרח התיכון' },
  { code: 'za', name: 'דרום אפריקה', continent: 'אפריקה והמזרח התיכון' },
  { code: 'mu', name: 'מאוריציוס', continent: 'אפריקה והמזרח התיכון' },
  { code: 'sc', name: 'סיישל', continent: 'אפריקה והמזרח התיכון' },

  // ---- אמריקה ----
  { code: 'us', name: 'ארצות הברית', continent: 'אמריקה' },
  { code: 'ca', name: 'קנדה', continent: 'אמריקה' },
  { code: 'mx', name: 'מקסיקו', continent: 'אמריקה' },
  { code: 'cr', name: 'קוסטה ריקה', continent: 'אמריקה' },
  { code: 'pa', name: 'פנמה', continent: 'אמריקה' },
  { code: 'gt', name: 'גואטמלה', continent: 'אמריקה' },
  { code: 'cu', name: 'קובה', continent: 'אמריקה' },
  { code: 'do', name: 'הרפובליקה הדומיניקנית', continent: 'אמריקה' },
  { code: 'co', name: 'קולומביה', continent: 'אמריקה' },
  { code: 'ec', name: 'אקוודור', continent: 'אמריקה' },
  { code: 'pe', name: 'פרו', continent: 'אמריקה' },
  { code: 'bo', name: 'בוליביה', continent: 'אמריקה' },
  { code: 'br', name: 'ברזיל', continent: 'אמריקה' },
  { code: 'ar', name: 'ארגנטינה', continent: 'אמריקה' },
  { code: 'cl', name: 'צ׳ילה', continent: 'אמריקה' },
  { code: 'uy', name: 'אורוגוואי', continent: 'אמריקה' },

  // ---- אוקיאניה ----
  { code: 'au', name: 'אוסטרליה', continent: 'אוקיאניה' },
  { code: 'nz', name: 'ניו זילנד', continent: 'אוקיאניה' },
  { code: 'fj', name: 'פיג׳י', continent: 'אוקיאניה' },
];

export const CONTINENTS: Continent[] = [
  'אירופה',
  'אסיה',
  'אפריקה והמזרח התיכון',
  'אמריקה',
  'אוקיאניה',
];

/** קוד ISO2 → אמוג'י דגל (לרכיב Flag, שמפענח אותו חזרה לתמונה) */
export function codeToFlagEmoji(code: string): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** דרגות המטייל - גיימיפיקציה קלה, בגובה העיניים */
export interface TravelerLevel {
  min: number;
  title: string;
  emoji: string;
}

export const TRAVELER_LEVELS: TravelerLevel[] = [
  { min: 0, title: 'עוד לא יצאנו לדרך', emoji: '🏠' },
  { min: 1, title: 'החותמת הראשונה', emoji: '🛂' },
  { min: 3, title: 'צוברים חותמות', emoji: '🎒' },
  { min: 7, title: 'מטיילים רציניים', emoji: '✈️' },
  { min: 12, title: 'חובקי עולם', emoji: '🌍' },
  { min: 20, title: 'אזרחי העולם', emoji: '🧭' },
  { min: 35, title: 'אגדת נסיעות', emoji: '🏆' },
];

export function travelerLevel(count: number): {
  current: TravelerLevel;
  next: TravelerLevel | null;
} {
  let current = TRAVELER_LEVELS[0];
  for (const l of TRAVELER_LEVELS) if (count >= l.min) current = l;
  const idx = TRAVELER_LEVELS.indexOf(current);
  return { current, next: TRAVELER_LEVELS[idx + 1] ?? null };
}
