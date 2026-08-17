import type { KosherVerification } from '@/lib/types';

/**
 * The kashrut badge - the only place on the site that renders a kashrut status.
 *
 * Policy (decided 2026-07-25): there is no per-record "verified/pending review" system. The
 * information is collected by the AI from public sources (Chabad houses, the supervising
 * bodies' own sites), presented as reported, and a general "verify with the venue" disclaimer
 * appears beside every record and at the top of the kashrut page. Supervision is still never
 * invented - only what the source reported is shown (hard rules 2 and 3 in force).
 */

export default function KosherBadge({
  verification,
  className = '',
  compact = false,
}: {
  verification?: KosherVerification;
  className?: string;
  /** A shortened version for the map popup */
  compact?: boolean;
}) {
  if (!verification) return null;

  return (
    <p
      className={`rounded-lg bg-night/5 px-3 py-1.5 text-xs font-semibold text-night/70 ${className}`}
    >
      <span aria-hidden>✡️ </span>
      השגחה: {verification.supervision}
      {!compact && <span className="font-medium text-night/50"> · לוודא מול המקום</span>}
    </p>
  );
}
