/**
 * **The currency and language we request from Viator - and what can actually
 * be requested.**
 *
 * ## The situation before the change
 *
 * The currency was a single site-wide `VIATOR_CURRENCY`, defaulting to `USD`,
 * so the price of a tour in Vienna was shown in dollars. The language was a
 * fixed `en-US`.
 *
 * ## What they support at all, and why that constrains the answer
 *
 * Their documentation lists **only sixteen currencies**, and the shekel is not
 * one of them - which fits the "no conversion to shekels" instruction.
 * Currencies of many catalog destinations (Czech koruna, forint, baht, dirham,
 * lari) are simply not on the list.
 *
 * So the rule here is: **the local currency when they support it, otherwise a
 * defined fallback** - and not a guess. Requesting an unsupported currency is
 * an unexpected request, and there is nothing to display from an unexpected
 * answer.
 *
 * **The display never converts anything anyway**: `toOffer` reads
 * `pricing.currency` from their response and shows it as-is. This file only
 * affects what is *requested*, and the display stays "whatever they returned".
 */

/**
 * The currencies Viator's documentation lists explicitly. Sixteen.
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
 * The local currency of every country in the catalog, **only when it is on the
 * list above**.
 *
 * A country missing here is not missing by mistake - it is a country whose
 * currency is unsupported (Czechia, Hungary, Thailand, the UAE, Georgia,
 * Turkey, Poland, Morocco, and so on). They fall to `FALLBACK_CURRENCY`, and
 * that is intentional: a comparable dollar price beats a request they do not
 * know how to answer.
 *
 * The USA, Ecuador and Panama all use the dollar in practice.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // The eurozone
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
  // Euro in actual use, without being in the zone
  montenegro: 'EUR',

  // Their own currencies that are supported
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

  // US dollar in actual use
  usa: 'USD',
  ecuador: 'USD',
  panama: 'USD',
};

/** What is requested when there is no supported local currency. */
export const FALLBACK_CURRENCY = 'USD';

/**
 * The currency to request for a country. `VIATOR_CURRENCY` overrides
 * everything - a single manual switch in case everything must be pinned to one
 * value without a deploy.
 */
export function currencyForCountry(countrySlug: string | null | undefined): string {
  const forced = process.env.VIATOR_CURRENCY?.toUpperCase();
  if (forced && VIATOR_CURRENCIES.has(forced)) return forced;
  const local = countrySlug ? CURRENCY_BY_COUNTRY[countrySlug] : undefined;
  return local && VIATOR_CURRENCIES.has(local) ? local : FALLBACK_CURRENCY;
}

/**
 * The languages Viator supports. **Hebrew is not among them**, and there is no
 * way to request names and descriptions from it in Hebrew.
 *
 * The practical meaning, and it cannot be worked around on our side: product
 * names and descriptions come back in English. Translating them ourselves is
 * exactly the invention this section is built not to do - "every number and
 * every name comes from their response".
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
 * The language to request. An unsupported value in `VIATOR_LANGUAGE` is
 * **quietly rejected in favor of English** rather than sent -
 * `Accept-Language: he-IL` would return an unexpected response, and at best is
 * simply ignored.
 */
export function viatorLanguage(): string {
  const want = process.env.VIATOR_LANGUAGE;
  return want && VIATOR_LANGUAGES.has(want) ? want : FALLBACK_LANGUAGE;
}
