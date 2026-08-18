/**
 * Skeleton primitives - the shape a screen holds while its content is still
 * on the way.
 *
 * Why shapes and not a spinner: a spinner says "wait" and nothing more, so
 * the screen empties out and then jumps back with everything at once. A
 * skeleton keeps the layout on screen from the first frame, and the arriving
 * content fills a frame that already exists instead of shoving the page
 * around under the reader's eyes.
 *
 * Three rules this file exists to keep, so the pattern cannot drift the way
 * the panel headers did:
 *
 * 1. **Shapes only - never fake text and never a number.** A grey bar the
 *    width of a title is a promise about layout. A placeholder naming a city
 *    would be a claim about content we do not have yet, and a placeholder
 *    stop count would be an invented number - which is the one thing this
 *    product does not do.
 * 2. **One status region per screen.** `SkeletonScreen` carries role=status
 *    and hides the shapes from assistive tech, so a screen reader hears one
 *    sentence rather than twenty empty boxes.
 * 3. **Skeleton the screen, never the count.** Rows are a hint about height;
 *    a list that comes back empty simply replaces them with one honest line
 *    inside the same card, which is a small change. What must not be drawn is
 *    a wait that could end on a *different screen* - "please sign in", "this
 *    link is invalid" - because a promise broken half a second later is worse
 *    than a plain wait. Where that is possible the dots stay until the
 *    outcome is known.
 *
 * The shimmer lives in one CSS class (`.skeleton-block` in globals.css,
 * `.skeleton-block-invert` on dark surfaces); both already freeze to a
 * static tint under prefers-reduced-motion.
 */

/** One grey shape. Size and rounding come from the caller - this only paints. */
export function Skeleton({
  className = '',
  invert = false,
}: {
  /** Tailwind sizing/rounding for this particular shape */
  className?: string;
  /** On a dark surface (the night bands) the night-tinted shimmer is invisible */
  invert?: boolean;
}) {
  return <div className={`${invert ? 'skeleton-block-invert' : 'skeleton-block'} ${className}`} />;
}

/**
 * The wrapper every skeleton screen goes in: it announces the wait once and
 * hides the shapes themselves, which carry no meaning to a screen reader.
 */
export function SkeletonScreen({
  label,
  className = '',
  children,
}: {
  /** What is loading, phrased in Hebrew for the screen reader */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/**
 * A run of identical rows - the shape of a list that is on its way (search
 * results, activities, suggestions). The row count is a hint about height,
 * not a claim about how many results there will be, so it stays small.
 */
export function SkeletonRows({
  rows = 3,
  height = 'h-12',
  className = '',
  invert = false,
}: {
  rows?: number;
  /** Row height as a Tailwind class, matched to the real row it stands in for */
  height?: string;
  className?: string;
  invert?: boolean;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} invert={invert} className={`${height} rounded-xl`} />
      ))}
    </div>
  );
}
