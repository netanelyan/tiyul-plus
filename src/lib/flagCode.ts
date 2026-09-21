/**
 * Turning a flag emoji into an ISO code, and that code into a country name.
 *
 * In a .ts module rather than inside Flag.tsx because these are pure
 * functions with a guard test behind them, and node's type stripping cannot
 * load a .tsx file from a test.
 */
import { WORLD_COUNTRIES } from '@/data/worldCountries';

const REGIONAL_INDICATOR_BASE = 0x1f1e6; // 🇦

/** A flag emoji -> its ISO code ('at'). Returns null for anything that is not a pair of regional indicators. */
export function countryCodeFromFlag(flag?: string): string | null {
  if (!flag) return null;
  const points = [...flag].map((c) => c.codePointAt(0) ?? 0);
  const letters = points
    .filter((p) => p >= REGIONAL_INDICATOR_BASE && p <= REGIONAL_INDICATOR_BASE + 25)
    .map((p) => String.fromCharCode('a'.charCodeAt(0) + (p - REGIONAL_INDICATOR_BASE)));
  return letters.length === 2 ? letters.join('') : null;
}

/**
 * The country this flag belongs to, in Hebrew, from the flag's own ISO code.
 *
 * The alt text used to be built from whatever the caller passed as `label`,
 * and most callers pass the CITY: a day header on the Prague page rendered
 * `alt="flag of Prague"` on flagcdn's `cz.png` - the Czech flag, described as the
 * flag of a city that has none. Wrong on every city page in the catalog,
 * because the template simply interpolated the wrong field.
 *
 * Deriving it here from the code the image itself is built from means the
 * picture and its description cannot disagree, and no call site has to
 * remember which of the two names belongs in the attribute.
 */
export function countryNameFromCode(code: string): string | null {
  return WORLD_COUNTRIES.find((c) => c.code === code)?.name ?? null;
}
