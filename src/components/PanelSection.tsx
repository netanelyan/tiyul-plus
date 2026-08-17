import type { ReactNode } from 'react';

/**
 * The header of a block at the bottom of the trip screen - **one object, not five similar ones**.
 *
 * ## Why this exists
 *
 * Five blocks sit stacked there: what is happening on your dates, what is still
 * missing, daily spend, your pins, and all the days. They were written across five
 * different sessions, and each invented its own header - so one got an emoji and
 * the rest did not, one got a grey background with no ring and the others white
 * with a ring, and the same caret glyph appeared in three sizes. In a screenshot
 * it looked like three design systems on one screen.
 *
 * None of them was wrong on its own. **The difference between siblings is the
 * bug**, so the fix is not to align the three by hand - that holds until the next
 * block somebody adds - but to move the header into a single component that cannot
 * be deviated from without editing it.
 *
 * ## What is fixed and what is not
 *
 * **The top bar is entirely fixed**: ring, background, radius, padding, icon size,
 * text weight and caret size. It is the thing the eye compares when the blocks are
 * closed, and that is exactly the state in which the problem was visible.
 *
 * **The body stays each block's own**, and sits below the bar rather than inside
 * it - `bg-shell` on `bg-shell` is a difference of three colour values and is
 * invisible, so nested cards would smear into one mass. `PanelBody` is the wrapper
 * for a body that is continuous text; a block whose body is already a list of cards
 * does not need it.
 *
 * ## An icon is required, not optional
 *
 * `icon` is a required prop on purpose. One emoji out of five is exactly the state
 * Netanel photographed, and an optional field would invite it straight back.
 */

/** Marked `aria-hidden` - the emoji is decoration, the accessible name is the title */
function Head({
  icon,
  title,
  meta,
  badge,
  caret,
  open,
}: {
  icon: string;
  title: string;
  meta?: ReactNode;
  badge?: ReactNode;
  caret: boolean;
  open?: boolean;
}) {
  return (
    <>
      <span data-panel-icon aria-hidden className="text-base leading-none">
        {icon}
      </span>
      <span data-panel-label className="text-sm font-bold text-night">
        {title}
      </span>
      {badge}
      {meta && (
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-night/45">{meta}</span>
      )}
      {caret && (
        <span
          data-panel-caret
          aria-hidden
          className={`ms-auto text-xs text-night/40 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      )}
    </>
  );
}

const BAR =
  'flex w-full items-center gap-2 rounded-2xl bg-shell px-4 py-3 text-start ring-1 ring-night/10';

export default function PanelSection({
  panelKey,
  icon,
  title,
  meta,
  badge,
  ariaLabel,
  open,
  onToggle,
  className = '',
  children,
}: {
  /** A stable id for tests - lets siblings be compared in a browser rather than in the source */
  panelKey: string;
  icon: string;
  title: string;
  /** A quiet sub-line beside the title (for example the price range) */
  meta?: ReactNode;
  /** A small badge after the title (for example "1 open") */
  badge?: ReactNode;
  ariaLabel?: string;
  /** Set = the block collapses. Unset = the body is always visible and there is no caret */
  open?: boolean;
  onToggle?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const collapsible = typeof open === 'boolean' && !!onToggle;

  return (
    <section data-panel={panelKey} aria-label={ariaLabel} className={`mt-4 ${className}`}>
      {collapsible ? (
        <button
          type="button"
          data-panel-head
          onClick={onToggle}
          aria-expanded={open}
          className={`${BAR} transition hover:ring-night/20`}
        >
          <Head icon={icon} title={title} meta={meta} badge={badge} caret open={open} />
        </button>
      ) : (
        <div data-panel-head className={BAR}>
          <Head icon={icon} title={title} meta={meta} badge={badge} caret={false} />
        </div>
      )}

      <div className={collapsible && !open ? 'hidden' : 'mt-2 block'}>{children}</div>
    </section>
  );
}

/** An ordinary body: a single card below the bar, in the same language as the bar itself */
export function PanelBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-shell p-4 ring-1 ring-night/10 ${className}`}>{children}</div>
  );
}
