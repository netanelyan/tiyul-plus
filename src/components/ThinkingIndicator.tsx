/**
 * A shared "thinking/loading" indicator - three bouncing dots (bg-current, so the colour is
 * inherited from the surrounding text) instead of static text that looks stuck. Respects
 * prefers-reduced-motion (see globals.css) - instead of bouncing, the dots stay put in a fixed but
 * visually clear shade.
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
