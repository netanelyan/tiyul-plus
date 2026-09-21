'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Keep Tab inside an open modal, close it on Escape, and give focus back when
 * it closes.
 *
 * ## Why a trap, and only for a real modal
 *
 * A modal covers the page and the page behind it is inert to the eye. Without
 * a trap it is not inert to the keyboard: Tab walks straight out of the sheet
 * and into the nav, the footer and every link on the plan underneath, while
 * the reader still believes they are in the dialog. That is the whole reason
 * `aria-modal` exists, and the attribute is a claim the markup has to make
 * true.
 *
 * This is deliberately NOT used for dropdowns. A menu anchored to its button
 * is not modal - the page behind it is still there - and trapping focus in one
 * is its own bug: the standard behaviour is that Tab leaves and the menu
 * closes. Those get Escape and focus return, not a trap.
 *
 * Returning focus matters as much as the trap. Without it, closing a sheet
 * leaves focus on `document.body`, so the next Tab starts from the top of the
 * document - which on this site means walking the whole nav again to get back
 * to where you were.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  /*
    Held in a ref so a caller passing an inline arrow does not re-register the
    listener on every render - which would also re-run the focus-return cleanup
    and fight the sheet for focus.

    Written in an effect rather than during render: a ref is mutable state, and
    mutating it while rendering is the thing that makes a render impure.
  */
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const restoreTo = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      // Queried per keystroke, not once: the content of a sheet changes while
      // it is open (a reply arrives, a button enables) and a list captured at
      // open time would send Tab to an element that is no longer there.
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = root.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // Only if it is still on the page - after a navigation it is not.
      if (restoreTo?.isConnected) restoreTo.focus();
    };
  }, [ref, active]);
}
