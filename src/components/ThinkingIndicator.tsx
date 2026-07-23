/**
 * מחוון "חושב/טוען" משותף - שלוש נקודות קופצות (bg-current, כך שהצבע
 * יורש מהטקסט הסובב) במקום טקסט סטטי שנראה תקוע. מכבד prefers-reduced-
 * motion (ראו globals.css) - במקום קפיצה, הנקודות נשארות במקום בגוון
 * קבוע אך ברור מבחינה חזותית.
 */
export default function ThinkingIndicator({
  label,
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {label && <span>{label}</span>}
      <span className="inline-flex items-center gap-1" aria-hidden>
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-current" />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: '0.15s' }} />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: '0.3s' }} />
      </span>
    </span>
  );
}
