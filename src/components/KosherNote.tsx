/**
 * A place's kashrut note - **the only place that renders `Place.kosherNote`**.
 *
 * Why this exists: exactly the same field was drawn in three places in three forms. On the
 * kashrut page and the destination page it was a green pill in one hex value, and in the map
 * popup it was a line of text in a different hex - an entirely different green, with no pill.
 * None of them was wrong on its own; the difference between them is the bug.
 *
 * The colour is a token (`--color-kosher`) and not a hardcoded hex, so it is both identical
 * everywhere and switches to an accessible shade when high contrast is enabled. A hardcoded hex
 * simply ignores that mode, and that was an accessibility defect and not merely an inconsistency.
 *
 * This is **not** the supervision badge - that is `KosherBadge`, and it stays separate:
 * supervision is a fact reported by a source and arrives with the "verify with the venue" caveat,
 * whereas the note is free-form description. Two different things, two components.
 */
export default function KosherNote({
  note,
  className = '',
}: {
  note?: string;
  className?: string;
}) {
  if (!note) return null;

  return (
    <p
      className={`rounded-lg bg-lagoon/10 px-3 py-2 text-xs font-semibold text-lagoon-deep ${className}`}
    >
      <span aria-hidden>✡️ </span>
      {note}
    </p>
  );
}
