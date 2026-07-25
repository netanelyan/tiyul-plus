import type { KosherVerification } from '@/lib/types';

/**
 * תג הכשרות - המקום היחיד באתר שמרנדר סטטוס כשרות.
 *
 * מדיניות (הוחלט 2026-07-25): אין מערכת "מאומת/ממתין לבדיקה" פר-רשומה.
 * המידע נאסף ע"י ה-AI ממקורות ציבוריים (בתי חב"ד, אתרי הגופים
 * המשגיחים), מוצג כפי שנמסר, ודיסקליימר כללי "לוודא מול המקום" מופיע
 * ליד כל רשומה ובראש עמוד הכשרות. עדיין לא ממציאים השגחות - מציגים רק
 * מה שנמסר במקור (hard rule 2/3 בתוקף).
 */

export default function KosherBadge({
  verification,
  className = '',
  compact = false,
}: {
  verification?: KosherVerification;
  className?: string;
  /** גרסה מקוצרת לפופאפ המפה */
  compact?: boolean;
}) {
  if (!verification) return null;

  return (
    <p
      className={`rounded-lg bg-night/5 px-3 py-1.5 text-xs font-semibold text-night/70 ${className}`}
    >
      <span aria-hidden>✡️ </span>
      השגחה: {verification.supervision}
      {!compact && <span className="font-medium text-night/50"> · לוודא מול המקום</span>}
    </p>
  );
}
