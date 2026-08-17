'use client';

import { bestDays, tallyDates } from '@/lib/trip/dateOverlap';
import { formatHebrewDate } from '@/lib/trip/dates';
import type { GroupDateVote } from '@/lib/trip/groupClient';

/**
 * "Which day works for everyone" - the question groups actually fail on.
 *
 * Two roles, one component. A member taps yes/no per candidate day; the organiser
 * sees the tally and who is blocking. The arithmetic is in `dateOverlap.ts` and
 * tested there, because the organiser books flights on the number it prints.
 *
 * **A day nobody answered is shown as unanswered, never as agreed.** That is the
 * whole reason `pending` exists as a separate count rather than being folded into
 * either side.
 */
export default function GroupDates({
  options,
  votes,
  memberIds,
  myId,
  onMark,
  disabled,
}: {
  options: string[];
  votes: GroupDateVote[];
  memberIds: string[];
  myId: string | null;
  onMark?: (day: string, ok: boolean) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;

  const tallies = tallyDates(options, memberIds, votes);
  const best = bestDays(tallies, 1)[0];
  const mine = new Map(votes.filter((v) => v.member_id === myId).map((v) => [v.day, v.ok]));

  return (
    <div>
      {best && (
        <p className="text-xs font-semibold text-night/60">
          {best.everyone ? (
            <>
              🎉 <b className="text-night">{formatHebrewDate(best.day, { weekday: true })}</b> מתאים לכולם
            </>
          ) : (
            <>
              הכי מתאים כרגע: <b className="text-night">{formatHebrewDate(best.day, { weekday: true })}</b> ·{' '}
              {best.yes} מתוך {memberIds.length}
              {best.pending > 0 && ` (${best.pending} עוד לא ענו)`}
            </>
          )}
        </p>
      )}

      <ul className="mt-2 space-y-1.5">
        {tallies.map((t) => {
          const my = mine.get(t.day);
          return (
            <li
              key={t.day}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-cream/70 px-3 py-2 ring-1 ring-night/10"
            >
              <span className="min-w-0 flex-1 text-sm font-semibold text-night">
                {formatHebrewDate(t.day, { weekday: true })}
              </span>
              <span className="whitespace-nowrap text-xs font-bold text-night/55">
                👍 {t.yes} · 👎 {t.no}
                {t.pending > 0 && <span className="text-night/35"> · {t.pending} טרם ענו</span>}
              </span>
              {onMark && (
                <span className="flex gap-1.5">
                  <button
                    onClick={() => onMark(t.day, true)}
                    disabled={disabled}
                    aria-pressed={my === true}
                    aria-label={`מתאים לי - ${formatHebrewDate(t.day, { weekday: true })}`}
                    className={`min-h-[40px] min-w-[52px] rounded-full px-3 text-xs font-bold ring-1 transition active:scale-95 ${
                      my === true
                        ? 'bg-lagoon text-cream ring-lagoon'
                        : 'bg-shell text-night/60 ring-night/15 hover:bg-lagoon/10'
                    }`}
                  >
                    מתאים
                  </button>
                  <button
                    onClick={() => onMark(t.day, false)}
                    disabled={disabled}
                    aria-pressed={my === false}
                    aria-label={`לא מתאים לי - ${formatHebrewDate(t.day, { weekday: true })}`}
                    className={`min-h-[40px] min-w-[52px] rounded-full px-3 text-xs font-bold ring-1 transition active:scale-95 ${
                      my === false
                        ? 'bg-night text-cream ring-night'
                        : 'bg-shell text-night/60 ring-night/15 hover:bg-night/5'
                    }`}
                  >
                    לא
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
