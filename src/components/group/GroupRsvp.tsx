'use client';

import type { GroupRsvp as Rsvp } from '@/lib/trip/groupClient';

const OPTIONS: { value: Rsvp['status']; label: string; on: string }[] = [
  { value: 'going', label: 'מגיע/ה', on: 'bg-lagoon text-cream ring-lagoon' },
  { value: 'maybe', label: 'אולי', on: 'bg-zest text-night ring-zest' },
  { value: 'no', label: 'לא הפעם', on: 'bg-night text-cream ring-night' },
];

/**
 * Who is actually coming.
 *
 * Deliberately the smallest of the four planning pieces - most groups know who is
 * in before the link is sent, so it earns one row and no more. Its real job is the
 * headcount the organiser needs when booking, which is why the counts are shown
 * even to members: "4 going" changes how people answer.
 */
export default function GroupRsvp({
  rsvp,
  myId,
  onSet,
  disabled,
}: {
  rsvp: Rsvp[];
  myId: string | null;
  onSet?: (status: Rsvp['status']) => void;
  disabled?: boolean;
}) {
  const mine = rsvp.find((r) => r.member_id === myId)?.status;
  const count = (s: Rsvp['status']) => rsvp.filter((r) => r.status === s).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-night/55">
        {count('going')} מגיעים
        {count('maybe') > 0 && ` · ${count('maybe')} אולי`}
        {count('no') > 0 && ` · ${count('no')} לא`}
      </span>
      {onSet && (
        <span className="flex gap-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => onSet(o.value)}
              disabled={disabled}
              aria-pressed={mine === o.value}
              className={`min-h-[40px] rounded-full px-3.5 text-xs font-bold ring-1 transition active:scale-95 ${
                mine === o.value ? o.on : 'bg-shell text-night/60 ring-night/15 hover:bg-night/5'
              }`}
            >
              {o.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
