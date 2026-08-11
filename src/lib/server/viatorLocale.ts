/**
 * **המטבע והשפה שאנחנו מבקשים מ-Viator - ומה באמת אפשר לבקש.**
 *
 * ## המצב לפני השינוי
 *
 * המטבע היה `VIATOR_CURRENCY` יחיד לכל האתר, עם ברירת מחדל `USD`, כך
 * שמחיר של סיור בווינה הוצג בדולרים. השפה הייתה `en-US` קבוע.
 *
 * ## מה הם בכלל תומכים בו, ולמה זה מגביל את התשובה
 *
 * התיעוד שלהם מונה **שישה עשר מטבעות בלבד**, והשקל אינו אחד מהם - מה
 * שמסתדר עם ההוראה "בלי המרה לשקלים". מטבעות של יעדים רבים בקטלוג
 * (קרונה צ׳כית, פורינט, באט, דירהם, לארי) פשוט אינם ברשימה.
 *
 * לכן הכלל כאן הוא: **המטבע המקומי כשהם תומכים בו, ואחרת נפילה
 * מוגדרת** - ולא ניחוש. בקשת מטבע לא נתמך היא בקשה לא צפויה, ובתשובה
 * לא צפויה אין מה להציג.
 *
 * **התצוגה ממילא לעולם לא ממירה כלום**: `toOffer` קורא את
 * `pricing.currency` מהתשובה שלהם ומציג אותו כפי שהוא. הקובץ הזה משפיע
 * רק על מה ש*מבקשים*, והתצוגה נשארת "מה שהם החזירו".
 */

/**
 * המטבעות שהתיעוד של Viator מונה במפורש. שש עשרה.
 * https://docs.viator.com/partner-api/affiliate/technical/
 */
export const VIATOR_CURRENCIES = new Set([
  'USD',
  'GBP',
  'EUR',
  'AUD',
  'HKD',
  'SGD',
  'CHF',
  'JPY',
  'NOK',
  'CAD',
  'NZD',
  'INR',
  'BRL',
  'ZAR',
  'DKK',
  'SEK',
]);

/**
 * המטבע המקומי של כל מדינה בקטלוג, **רק כשהוא ברשימה שלמעלה**.
 *
 * מדינה שאינה כאן אינה חסרה בטעות - היא מדינה שהמטבע שלה אינו נתמך
 * (צ׳כיה, הונגריה, תאילנד, איחוד האמירויות, גאורגיה, טורקיה, פולין,
 * מרוקו, וכן הלאה). הן נופלות ל-`FALLBACK_CURRENCY`, וזה מכוון: עדיף
 * מחיר בדולר שאפשר להשוות מאשר בקשה שהם לא יודעים לענות עליה.
 *
 * ארצות הברית, אקוודור ופנמה משתמשות כולן בדולר בפועל.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // גוש האירו
  austria: 'EUR',
  slovakia: 'EUR',
  italy: 'EUR',
  greece: 'EUR',
  spain: 'EUR',
  germany: 'EUR',
  cyprus: 'EUR',
  slovenia: 'EUR',
  croatia: 'EUR',
  portugal: 'EUR',
  netherlands: 'EUR',
  ireland: 'EUR',
  lithuania: 'EUR',
  estonia: 'EUR',
  latvia: 'EUR',
  france: 'EUR',
  malta: 'EUR',
  belgium: 'EUR',
  finland: 'EUR',
  // אירו בשימוש בפועל, בלי להיות בגוש
  montenegro: 'EUR',

  // מטבעות משלהן שנתמכים
  switzerland: 'CHF',
  japan: 'JPY',
  norway: 'NOK',
  sweden: 'SEK',
  denmark: 'DKK',
  canada: 'CAD',
  'new-zealand': 'NZD',
  australia: 'AUD',
  india: 'INR',
  brazil: 'BRL',
  'south-africa': 'ZAR',
  singapore: 'SGD',
  'united-kingdom': 'GBP',

  // דולר אמריקאי בפועל
  usa: 'USD',
  ecuador: 'USD',
  panama: 'USD',
};

/** מה מבקשים כשאין מטבע מקומי נתמך. */
export const FALLBACK_CURRENCY = 'USD';

/**
 * המטבע לבקש עבור מדינה. `VIATOR_CURRENCY` דורס הכל - מפסק ידני אחד
 * למקרה שצריך לקבע הכול לערך אחד בלי דיפלוי.
 */
export function currencyForCountry(countrySlug: string | null | undefined): string {
  const forced = process.env.VIATOR_CURRENCY?.toUpperCase();
  if (forced && VIATOR_CURRENCIES.has(forced)) return forced;
  const local = countrySlug ? CURRENCY_BY_COUNTRY[countrySlug] : undefined;
  return local && VIATOR_CURRENCIES.has(local) ? local : FALLBACK_CURRENCY;
}

/**
 * השפות ש-Viator תומכת בהן. **עברית אינה ביניהן**, ואין דרך לבקש
 * ממנה שמות ותיאורים בעברית.
 *
 * המשמעות המעשית, ואי אפשר לעקוף אותה מהצד שלנו: שמות המוצרים
 * והתיאורים חוזרים באנגלית. לתרגם אותם אצלנו זו בדיוק ההמצאה
 * שהמדור הזה בנוי לא לעשות - "כל מספר וכל שם מגיעים מהתשובה שלהם".
 */
export const VIATOR_LANGUAGES = new Set([
  'en',
  'en-US',
  'da',
  'da-DK',
  'nl',
  'nl-NL',
  'no',
  'no-NO',
  'es',
  'es-ES',
  'sv',
  'sv-SE',
  'fr',
  'fr-FR',
  'it',
  'it-IT',
  'de',
  'de-DE',
  'pt',
  'pt-PT',
  'ja',
  'ja-JP',
]);

export const FALLBACK_LANGUAGE = 'en-US';

/**
 * השפה לבקש. ערך לא נתמך ב-`VIATOR_LANGUAGE` **נדחה בשקט לטובת
 * אנגלית** במקום להישלח - `Accept-Language: he-IL` היה מחזיר תשובה לא
 * צפויה, ובמקרה הטוב פשוט מתעלמים ממנו.
 */
export function viatorLanguage(): string {
  const want = process.env.VIATOR_LANGUAGE;
  return want && VIATOR_LANGUAGES.has(want) ? want : FALLBACK_LANGUAGE;
}
