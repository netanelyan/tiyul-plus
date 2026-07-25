/**
 * דגל מדינה כתמונה, לא כתו יוניקוד.
 *
 * למה: אימוג׳י דגל בנוי משני תווי "regional indicator" (🇦🇹 = A + T), ומערכת
 * ההפעלה צריכה לצרף אותם לגליף אחד. ווינדוס לא עושה את זה בכוונה - Segoe UI
 * Emoji פשוט לא מציירת דגלים לאומיים - ולכן המשתמש רואה "AT". זה לא נפתר
 * ב-font-family: המערכת לא מחפשת פונט חלופי, היא מסרבת לצרף. הפתרון היחיד
 * שנראה זהה בכל מערכת הוא תמונה.
 *
 * הדאטה נשארת כמו שהיא (השדה flag ממשיך להחזיק אימוג׳י): קוד ה-ISO נגזר
 * מהאימוג׳י עצמו בזמן ריצה, כך שאין צורך להוסיף שדה ל-79 רשומות.
 */

const REGIONAL_INDICATOR_BASE = 0x1f1e6; // 🇦

/** '🇦🇹' → 'at'. מחזיר null לכל מה שאינו זוג regional indicators. */
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

// גובה מותאם לשורת טקסט - הדגל יושב בדיוק במקום שהאימוג׳י ישב
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
  /** האימוג׳י מהדאטה (למשל dest.flag) - הקוד נגזר ממנו */
  flag?: string;
  /** לחלופין קוד ISO ישירות ('at') */
  code?: string;
  /** שם המדינה/היעד בעברית - לטקסט חלופי נגיש */
  label?: string;
  size?: Size;
  className?: string;
}) {
  const cc = (code ?? countryCodeFromFlag(flag))?.toLowerCase() ?? null;
  const { h, w } = BOX[size];

  // אין קוד תקין (למשל דגל שאינו לאומי) - נופלים חזרה לאימוג׳י המקורי
  if (!cc) {
    return flag ? (
      <span className={className} aria-hidden={!label}>
        {flag}
      </span>
    ) : null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- flagcdn, ללא אופטימיזציה של next/image
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
