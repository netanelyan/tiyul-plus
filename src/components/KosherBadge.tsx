import {
  KASHRUT_DIET_LABEL,
  KASHRUT_KNOWLEDGE_LABEL,
  describeCertifications,
  kashrutCaveat,
  kashrutIsShippable,
} from '@/lib/kashrut';
import type { KashrutRecord } from '@/lib/types';

/**
 * The kashrut badge - the only place on the site that renders a kashrut record.
 *
 * ## What it shows, and why each part is not optional
 *
 * The certifying body **by name**, the date we read the source, and a caveat.
 * All three, always, because the traveler is the one deciding whether a given
 * supervision meets their standard and they cannot decide that from "kosher:
 * yes". The old badge printed a single free-text string that variously held a
 * body name, a disclaimer, meal logistics or the absence of certification, with
 * no way for a reader to tell which.
 *
 * ## What it deliberately does NOT do
 *
 * It does not rank, colour-code or otherwise imply that one certification is
 * better than another. A local rabbinate and a Badatz render identically. That
 * judgement belongs to the traveler and their rabbi, and a travel site putting
 * a green tick on one and an amber one on the other would be making it for
 * them.
 *
 * The colour split is by KNOWLEDGE state only - do we know, did we find none,
 * or have we not checked - which is a statement about our data and not about
 * anyone's kashrut.
 */
export default function KosherBadge({
  kashrut,
  className = '',
  compact = false,
}: {
  kashrut?: KashrutRecord;
  className?: string;
  /** A shortened version for the map popup */
  compact?: boolean;
}) {
  if (!kashrut) return null;

  const bodies = describeCertifications(kashrut);
  const verified = kashrutIsShippable(kashrut);

  // Tone follows what we KNOW, never how good a certification is.
  const tone =
    kashrut.knowledge === 'certified'
      ? 'bg-lagoon/10 text-lagoon-deep'
      : kashrut.knowledge === 'none-found'
        ? 'bg-night/8 text-night/70'
        : 'bg-night/5 text-night/60';

  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${tone} ${className}`}>
      <p className="font-semibold">
        <span aria-hidden>✡️ </span>
        {kashrut.knowledge === 'certified' ? (
          bodies ? (
            <>השגחה: {bodies}</>
          ) : (
            // certified, but the source never named the body. Saying so beats
            // printing the phrase "local supervision" where a name should be.
            <>יש השגחה · הגוף המשגיח לא צוין במקור</>
          )
        ) : (
          KASHRUT_KNOWLEDGE_LABEL[kashrut.knowledge]
        )}
        {kashrut.diet && (
          <span className="font-medium"> · {KASHRUT_DIET_LABEL[kashrut.diet]}</span>
        )}
      </p>

      {kashrut.arrangement && (
        <p className="mt-1 font-medium opacity-90">🕒 {kashrut.arrangement}</p>
      )}

      {!compact && (
        <>
          <p className="mt-1 font-medium opacity-80">
            {verified ? (
              <>נבדק ב-{kashrut.provenance.checked}</>
            ) : (
              // Never a date-shaped placeholder. "We do not have a check date"
              // is the fact, and it is said outright.
              <>אין לנו תאריך בדיקה</>
            )}
          </p>
          <p className="mt-1 font-medium opacity-70">{kashrutCaveat(kashrut)}</p>
        </>
      )}
    </div>
  );
}
