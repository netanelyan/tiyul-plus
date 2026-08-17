/**
 * A country flag as an image, not as a Unicode character.
 *
 * Why: a flag emoji is built from two "regional indicator" characters (AT = A + T), and
 * the operating system has to compose them into a single glyph. Windows deliberately
 * does not - Segoe UI Emoji simply does not draw national flags - so the user sees "AT".
 * This cannot be solved with font-family: the system is not looking for a fallback font,
 * it is refusing to compose. The only solution that looks identical on every system is
 * an image.
 *
 * The data stays as it is (the flag field still holds an emoji): the ISO code is derived
 * from the emoji itself at runtime, so there is no need to add a field to 79 records.
 */

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

const WIDTHS = { sm: 'w20', md: 'w40', lg: 'w80' } as const;
type Size = keyof typeof WIDTHS;

// Height matched to a line of text - the flag sits exactly where the emoji sat
const BOX: Record<Size, { h: number; w: number }> = {
  sm: { h: 12, w: 16 },
  md: { h: 15, w: 20 },
  lg: { h: 21, w: 28 },
};

export default function Flag({
  flag,
  code,
  label,
  size = 'md',
  className = '',
}: {
  /** The emoji from the data (for example dest.flag) - the code is derived from it */
  flag?: string;
  /** Or alternatively an ISO code directly ('at') */
  code?: string;
  /** The country/destination name in Hebrew - for accessible alt text */
  label?: string;
  size?: Size;
  className?: string;
}) {
  const cc = (code ?? countryCodeFromFlag(flag))?.toLowerCase() ?? null;
  const { h, w } = BOX[size];

  // No valid code (for example a non-national flag) - fall back to the original emoji
  if (!cc) {
    return flag ? (
      <span className={className} aria-hidden={!label}>
        {flag}
      </span>
    ) : null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- flagcdn, without next/image optimisation
    <img
      src={`https://flagcdn.com/${WIDTHS[size]}/${cc}.png`}
      srcSet={`https://flagcdn.com/${WIDTHS[size]}/${cc}.png 1x, https://flagcdn.com/${
        size === 'sm' ? 'w40' : size === 'md' ? 'w80' : 'w160'
      }/${cc}.png 2x`}
      width={w}
      height={h}
      alt={label ? `דגל ${label}` : ''}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 rounded-[2px] object-cover align-[-0.1em] shadow-[0_0_0_1px_rgba(36,27,77,0.12)] ${className}`}
      style={{ width: w, height: h }}
    />
  );
}
