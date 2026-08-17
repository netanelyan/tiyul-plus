/**
 * Catalog country -> IANA time zone, for showing Shabbat times on the real local
 * clock (including daylight saving) through Intl - with no new dependency and no
 * offset computed from longitude, which is a whole hour wrong in every country with
 * daylight saving.
 *
 * ## The rule: no guessing
 *
 * A country not listed here, or a city falling outside the split ranges of a
 * multi-zone country, gets null - and the UI says honestly that there is no reliable
 * clock, rather than showing a candle-lighting time that is an hour wrong. Omission
 * beats approximation - especially here, where the cost of an error is religious and
 * not merely embarrassing.
 *
 * Multi-zone countries are split by the longitude of the city itself; the ranges were
 * chosen from the cities actually in the catalog, not as a general world mapping.
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

/** Multi-zone countries: chosen by the city's longitude. Ranges follow the catalog's cities. */
const MULTI_ZONE: Record<string, (lng: number) => string | null> = {
  usa: (lng) => {
    if (lng > -90) return 'America/New_York'; // New York, New England, Miami
    if (lng > -110) return 'America/Denver'; // the Southwest parks
    if (lng > -125) return 'America/Los_Angeles'; // Las Vegas, California
    return null;
  },
  canada: (lng) => {
    // Order is critical: Halifax (-63) must be tested before the Toronto branch
    if (lng > -75) return 'America/Halifax';
    if (lng > -90) return 'America/Toronto';
    if (lng > -120) return 'America/Edmonton'; // Banff, Calgary
    return 'America/Vancouver';
  },
  mexico: (lng) => (lng > -89.7 ? 'America/Cancun' : 'America/Mexico_City'),
  australia: (lng) => {
    if (lng > 140) return 'Australia/Hobart'; // Tasmania
    if (lng > 128) return 'Australia/Darwin'; // the Red Centre (Uluru, Alice Springs)
    return 'Australia/Perth';
  },
  indonesia: (lng) => (lng > 112 ? 'Asia/Makassar' : 'Asia/Jakarta'), // Bali / Java
  kazakhstan: () => 'Asia/Almaty',
  brazil: () => 'America/Sao_Paulo', // only Rio is in the catalog
  chile: () => 'America/Santiago',
};

/**
 * The time zone of a city in the catalog. null = there is no reliable answer, and the UI says so.
 */
export function timezoneFor(countrySlug: string, lng: number): string | null {
  const single = SINGLE_ZONE[countrySlug];
  if (single) return single;
  const multi = MULTI_ZONE[countrySlug];
  return multi ? multi(lng) : null;
}

/**
 * A real local time (including daylight saving) through Intl. Returns null when the
 * environment does not know the zone (partial ICU) - nothing is better than a wrong time.
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
