'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Held slightly longer than the enter animation (0.32s) on purpose: the enter
 * class is only present while a transition is in flight, and cutting it early
 * would snap the incoming panel into place.
 */
const TRANSITION_MS = 360;
/** How far a step slides. Deliberately small - this is a step, not a carousel. */
const OFFSET = 28;

type Phase = { shown: number; leaving: number | null; forward: boolean };

/**
 * One panel at a time out of several, with the outgoing one sliding away as the
 * incoming one arrives and the box growing or shrinking to fit. For stepped
 * flows (the questionnaire), where a step appearing out of nowhere reads as a
 * page reload.
 *
 * CSS animations + ResizeObserver, no dependency.
 *
 * The direction is derived from the index rather than passed in, so a caller
 * cannot forget to update it and animate backwards through a "next" button.
 * The offsets are physical - a transform is never mirrored by `dir` - so they
 * are chosen for the RTL flow this site is: forward, the next step arrives from
 * the left and the previous one leaves to the right.
 */
export default function TransitionPanel({
  activeIndex,
  children,
  className = '',
}: {
  activeIndex: number;
  children: React.ReactNode[];
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>({ shown: activeIndex, leaving: null, forward: true });
  const [height, setHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Adjusted during render rather than in an effect: the outgoing panel has to
  // exist in the same commit as the incoming one, or it is never painted at all.
  if (phase.shown !== activeIndex) {
    setPhase({ shown: activeIndex, leaving: phase.shown, forward: activeIndex > phase.shown });
  }

  const transitioning = phase.leaving !== null;

  useEffect(() => {
    if (!transitioning) return;
    const t = setTimeout(() => setPhase((p) => ({ ...p, leaving: null })), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [transitioning, activeIndex]);

  // The box follows the active content's own height, so a step that grows (an
  // open dropdown, an extra line of help text) is followed rather than clipped.
  // Re-observed per step: the content node is keyed, so each step is a new node
  // and the previous observation is of something already detached.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeIndex]);

  const outgoing = phase.leaving === null ? null : children[phase.leaving];

  return (
    <div
      className={`panel-box ${className}`}
      // Left alone until measured once, so the first paint is the content's
      // natural height and not a collapsed box.
      style={height === null ? undefined : { height }}
    >
      {outgoing != null && (
        <div
          // pointer-events-none because it sits ON TOP of the incoming panel for
          // a moment - without it the first click on the new step hits a ghost.
          className="panel-leave pointer-events-none absolute inset-x-0 top-0"
          aria-hidden
          style={{ '--panel-to': `${phase.forward ? OFFSET : -OFFSET}px` } as React.CSSProperties}
        >
          {outgoing}
        </div>
      )}
      <div
        ref={contentRef}
        key={activeIndex}
        className={transitioning ? 'panel-enter' : undefined}
        style={{ '--panel-from': `${phase.forward ? -OFFSET : OFFSET}px` } as React.CSSProperties}
      >
        {children[activeIndex]}
      </div>
    </div>
  );
}
