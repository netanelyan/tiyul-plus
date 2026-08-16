/**
 * מדינת קטלוג → אזור זמן IANA, לצורך הצגת זמני שבת בשעון המקומי האמיתי
 * (כולל שעון קיץ) דרך Intl - בלי תלות חדשה ובלי חישוב offset מקו אורך,
 * שטועה בשעה שלמה בכל מדינה עם שעון קיץ.
 *
 * ## הכלל: אין ניחוש
 *
 * מדינה שאינה כאן, או עיר שנופלת מחוץ לטווחי הפיצול של מדינה
 * מרובת-אזורים, מקבלת null - וה-UI אומר בכנות שאין שעון אמין, במקום
 * להציג זמן הדלקת נרות שגוי בשעה. השמטה עדיפה על קירוב - במיוחד כאן,
 * שבו המחיר של טעות הוא הלכתי ולא רק מביך.
 *
 * מדינות מרובות אזורים מפוצלות לפי קו האורך של העיר עצמה; הטווחים
 * נבחרו לפי הערים שבקטלוג בפועל, לא כמיפוי עולמי כללי.
 */

const SINGLE_ZONE: Record<string, string> = {
  austria: 'Europe/Vienna',
  slovakia: 'Europe/Bratislava',
  czechia: 'Europe/Prague',
  hungary: 'Europe/Budapest',
  italy: 'Europe/Rome',
  greece: 'Europe/Athens',
  spain: 'Europe/Madrid',
  germany: 'Europe/Berlin',
  thailand: 'Asia/Bangkok',
  uae: 'Asia/Dubai',
  georgia: 'Asia/Tbilisi',
  azerbaijan: 'Asia/Baku',
  montenegro: 'Europe/Podgorica',
  jordan: 'Asia/Amman',
  cyprus: 'Asia/Nicosia',
  switzerland: 'Europe/Zurich',
  japan: 'Asia/Tokyo',
  tanzania: 'Africa/Dar_es_Salaam',
  peru: 'America/Lima',
  'new-zealand': 'Pacific/Auckland',
  iceland: 'Atlantic/Reykjavik',
  slovenia: 'Europe/Ljubljana',
  croatia: 'Europe/Zagreb',
  nepal: 'Asia/Kathmandu',
  vietnam: 'Asia/Ho_Chi_Minh',
  norway: 'Europe/Oslo',
  'south-africa': 'Africa/Johannesburg',
  armenia: 'Asia/Yerevan',
  uzbekistan: 'Asia/Samarkand',
  portugal: 'Europe/Lisbon',
  poland: 'Europe/Warsaw',
  netherlands: 'Europe/Amsterdam',
  romania: 'Europe/Bucharest',
  turkey: 'Europe/Istanbul',
  ireland: 'Europe/Dublin',
  bulgaria: 'Europe/Sofia',
  sweden: 'Europe/Stockholm',
  denmark: 'Europe/Copenhagen',
  finland: 'Europe/Helsinki',
  lithuania: 'Europe/Vilnius',
  estonia: 'Europe/Tallinn',
  latvia: 'Europe/Riga',
  albania: 'Europe/Tirane',
  bosnia: 'Europe/Sarajevo',
  serbia: 'Europe/Belgrade',
  'south-korea': 'Asia/Seoul',
  malaysia: 'Asia/Kuala_Lumpur',
  'sri-lanka': 'Asia/Colombo',
  cambodia: 'Asia/Phnom_Penh',
  laos: 'Asia/Vientiane',
  morocco: 'Africa/Casablanca',
  kyrgyzstan: 'Asia/Bishkek',
  argentina: 'America/Argentina/Buenos_Aires',
  'costa-rica': 'America/Costa_Rica',
  taiwan: 'Asia/Taipei',
  india: 'Asia/Kolkata',
  colombia: 'America/Bogota',
  france: 'Europe/Paris',
  'united-kingdom': 'Europe/London',
  singapore: 'Asia/Singapore',
  malta: 'Europe/Malta',
  belgium: 'Europe/Brussels',
  egypt: 'Africa/Cairo',
  oman: 'Asia/Muscat',
  'north-macedonia': 'Europe/Skopje',
  mongolia: 'Asia/Ulaanbaatar',
  bhutan: 'Asia/Thimphu',
  moldova: 'Europe/Chisinau',
  bolivia: 'America/La_Paz',
  guatemala: 'America/Guatemala',
  philippines: 'Asia/Manila',
  panama: 'America/Panama',
  ecuador: 'America/Guayaquil',
  mauritius: 'Indian/Mauritius',
  seychelles: 'Indian/Mahe',
};

/** מדינות מרובות אזורים: בחירה לפי קו האורך של העיר. טווחים לפי ערי הקטלוג. */
const MULTI_ZONE: Record<string, (lng: number) => string | null> = {
  usa: (lng) => {
    if (lng > -90) return 'America/New_York'; // ניו יורק, ניו אינגלנד, מיאמי
    if (lng > -110) return 'America/Denver'; // הפארקים של הדרום-מערב
    if (lng > -125) return 'America/Los_Angeles'; // לאס וגאס, קליפורניה
    return null;
  },
  canada: (lng) => {
    // הסדר קריטי: הליפקס (-63) חייבת להיבדק לפני הענף של טורונטו
    if (lng > -75) return 'America/Halifax';
    if (lng > -90) return 'America/Toronto';
    if (lng > -120) return 'America/Edmonton'; // באנף, קלגרי
    return 'America/Vancouver';
  },
  mexico: (lng) => (lng > -89.7 ? 'America/Cancun' : 'America/Mexico_City'),
  australia: (lng) => {
    if (lng > 140) return 'Australia/Hobart'; // טסמניה
    if (lng > 128) return 'Australia/Darwin'; // המרכז האדום (אולורו, אליס ספרינגס)
    return 'Australia/Perth';
  },
  indonesia: (lng) => (lng > 112 ? 'Asia/Makassar' : 'Asia/Jakarta'), // באלי / ג׳אווה
  kazakhstan: () => 'Asia/Almaty',
  brazil: () => 'America/Sao_Paulo', // ריו בלבד בקטלוג
  chile: () => 'America/Santiago',
};

/**
 * אזור הזמן של עיר בקטלוג. null = אין תשובה אמינה, וה-UI אומר זאת.
 */
export function timezoneFor(countrySlug: string, lng: number): string | null {
  const single = SINGLE_ZONE[countrySlug];
  if (single) return single;
  const multi = MULTI_ZONE[countrySlug];
  return multi ? multi(lng) : null;
}

/**
 * שעה מקומית אמיתית (כולל שעון קיץ) דרך Intl. מחזיר null כשהסביבה לא
 * מכירה את האזור (ICU חלקי) - עדיף כלום מזמן שגוי.
 */
export function formatInZone(utc: Date, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(utc);
  } catch {
    return null;
  }
}
