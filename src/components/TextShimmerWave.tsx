/**
 * Text with a wave of light travelling through it, one letter at a time - for
 * the moments the agent is working and there is something to say about what it
 * is doing. Where there is no label, three dots (ThinkingIndicator) still read
 * better than a shimmering nothing.
 *
 * CSS only, no dependency: the animation is one keyframe in globals.css and the
 * component only hands each character its delay. See the note there for why
 * nothing here moves - a transform would force `display: inline-block` on every
 * character, and that reorders digits inside an RTL line.
 *
 * Accessibility: the split characters are hidden from assistive tech and the
 * whole string is exposed once, so a screen reader says "building the route"
 * rather than spelling it out.
 */
export default function TextShimmerWave({
  children,
  className = '',
  durationMs = 1400,
  spread = 0.55,
}: {
  children: string;
  className?: string;
  /** One full pulse of a single character. */
  durationMs?: number;
  /** How much of the pulse the wave is stretched across, 0..1. Higher = slower sweep. */
  spread?: number;
}) {
  const chars = Array.from(children);

  return (
    <span className={`inline-block ${className}`}>
      <span className="sr-only">{children}</span>
      <span aria-hidden>
        {chars.map((char, i) => (
          <span
            key={i}
            className="shimmer-wave-char"
            style={
              {
                '--shimmer-duration': `${durationMs}ms`,
                // The wave starts at the first character - which in an RTL line is
                // the rightmost one - and travels along the reading direction.
                '--shimmer-delay': `${(i / Math.max(chars.length, 1)) * durationMs * spread}ms`,
              } as React.CSSProperties
            }
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  );
}
