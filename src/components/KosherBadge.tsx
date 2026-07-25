import type { KosherVerification } from '@/lib/types';

/**
 * תג הכשרות - המקום היחיד באתר שמרנדר סטטוס כשרות.
 *
 * כלל ברזל (hard rule 2/3): רשומה שלא אומתה בפועל לעולם לא מקבלת את תג
 * האמון הירוק. כל עוד lastChecked הוא "pending-review" מוצג תג אזהרה
 * מובחן ויזואלית - "לא מאומת - לוודא מול המקום" - וההשגחה מוצגת כדיווח
 * ("נמסר: ...") ולא כעובדה שבדקנו. רק תאריך בדיקה אמיתי הופך את התג
 * לירוק ומאומת.
 */

export const isKosherVerified = (v?: KosherVerification) =>
  Boolean(v && v.lastChecked && v.lastChecked !== 'pending-review');

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
  const verified = isKosherVerified(verification);

  if (verified) {
    return (
      <p
        className={`rounded-lg bg-[#00a896]/10 px-3 py-1.5 text-xs font-semibold text-[#007f76] ${className}`}
      >
        <span aria-hidden>✓ </span>
        כשרות מאומתת · נבדק {verification.lastChecked} · {verification.supervision}
      </p>
    );
  }

  return (
    <p
      className={`rounded-lg bg-zest/25 px-3 py-1.5 text-xs font-semibold text-night ring-1 ring-zest ${className}`}
    >
      <span aria-hidden>⚠️ </span>
      לא מאומת - לוודא מול המקום
      {!compact && (
        <span className="font-medium text-night/70">
          {' '}
          · נמסר: {verification.supervision} · טיול+ עדיין לא בדק את הסטטוס מול המקום
        </span>
      )}
    </p>
  );
}
