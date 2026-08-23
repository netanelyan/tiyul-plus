'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reveals its children when they scroll into view - a short rise out of a blur.
 * For long pages where everything arriving at once reads as a wall (the pricing
 * page is over 5,000px on a phone); NOT for anything above the fold, which
 * should simply be there.
 *
 * IntersectionObserver, no dependency. The hidden state is a CSS class so the
 * element is already hidden in the first painted frame rather than flashing at
 * full opacity until the observer's first callback.
 *
 * Two ways it deliberately fails OPEN, because the failure mode of a reveal is
 * content nobody can read: an environment with no IntersectionObserver shows
 * everything immediately, and prefers-reduced-motion is handled in globals.css
 * by making the hidden state visible rather than by freezing it.
 */
export default function InView({
  children,
  className = '',
  delayMs = 0,
  /** Fire this far before the element's top edge reaches the viewport bottom. */
  margin = '0px 0px -80px 0px',
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Resolved in the initial state rather than in the effect, so a browser with
  // no observer never has a frame of hidden content - and guarded on `window`
  // so the server (where IntersectionObserver is also undefined) renders the
  // same hidden markup the client hydrates into.
  const [shown, setShown] = useState(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // An entry already on screen at mount (a deep link, a reload mid-page) is
    // reported by the observer's first callback, so nothing waits for a scroll
    // that may never come.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [margin]);

  return (
    <div
      ref={ref}
      className={`in-view ${shown ? 'in-view-visible' : ''} ${className}`}
      style={delayMs ? ({ '--in-view-delay': `${delayMs}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
