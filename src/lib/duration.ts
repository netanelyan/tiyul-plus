// עברית תקנית למשך שהייה במקום.
//
// למה זה קובץ ולא ביטוי בתוך ה-JSX: הניסוח הקודם היה
// `כ-{Math.round(min / 30) / 2} שעות`, שמייצר "כ-1 שעות" ו-"כ-0.5 שעות".
// זה לא עברית. 248 מתוך המקומות בקטלוג יושבים בדיוק על 45 או 60 דקות,
// כלומר רוב הכרטיסים בעמוד יעד הציגו את הצורה השגויה.
//
// העברית מבחינה בין יחיד, זוגי ורבים, ו-`travel.ts` כבר עושה את זה נכון
// עבור זמני נסיעה ("כשעה נסיעה"). זו אותה הבחנה, במקום אחד משותף.

/** מעגל לחצאי שעה, כמו שהעמוד עשה קודם - רק הניסוח משתנה. */
export function roundToHalfHours(minutes: number): number {
  return Math.round(minutes / 30) / 2;
}

/**
 * "כחצי שעה" / "כשעה" / "כשעה וחצי" / "כשעתיים" / "כשעתיים וחצי" / "כ-3 שעות"
 * מחזיר null כשאין משך אמיתי, כדי שהקורא פשוט לא יציג כלום.
 */
export function formatDurationHe(minutes: number | undefined | null): string | null {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return null;

  const hours = roundToHalfHours(minutes);
  if (hours <= 0) return null;
  if (hours === 0.5) return 'כחצי שעה';
  if (hours === 1) return 'כשעה';
  if (hours === 1.5) return 'כשעה וחצי';
  if (hours === 2) return 'כשעתיים';
  if (hours === 2.5) return 'כשעתיים וחצי';

  // משלוש שעות ומעלה הצורה המספרית תקינה בעברית ("כ-3 שעות", "כ-4.5 שעות").
  const n = hours % 1 === 0 ? String(hours) : hours.toFixed(1);
  return `כ-${n} שעות`;
}
