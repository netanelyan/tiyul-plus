'use client';

import { useEffect, useRef, useState } from 'react';
import type { Trip } from '@/lib/trip/types';
import { completeRange, countdown, formatHebrewRange, rangeDays, todayISO } from '@/lib/trip/dates';
import { OFFLINE_HINT } from '@/lib/offline/online';

/**
 * Trip dates: when you leave and when you return.
 *
 * ## Three decisions that explain this component
 *
 * **1. No new control on the screen.** The first version added its own pill
 * ("add dates") and with it a whole row above the map - on a screen already
 * suffering from 29 controls above the fold and 48% of the height gone before
 * anything of the trip is visible. Netanel photographed that and said "ugly,
 * not simple". Now the dates sit **inside the summary chip that already
 * exists** (the "8 days · 22 stops" chip), which was inert anyway - same spot,
 * zero new objects.
 *
 * **2. The date does not change the plan.** Netanel chose a range rather than
 * a single departure date, and a range has a day count of its own that can
 * disagree with what is already built. The temptation is to derive the days
 * from the range - and that is exactly how picking a date deletes a day full
 * of stops. The gap is shown, adding is an explicit button, and deletion never
 * happens from here.
 *
 * **3. One end is enough.** Whoever fills only the departure date gets the
 * return date from the trip's length, and vice versa - so the normal path is
 * always consistent.
 *
 * The countdown is computed **after mount** only: the server and the browser
 * can be on different days, and clock-dependent text during hydration is a
 * guaranteed mismatch (the same trap already documented here in PromptChips
 * and TripWorkspace).
 */
export default function TripDates({
  trip,
  summary,
  onSet,
  onAddDays,
  disabled = false,
}: {
  trip: Trip;
  /** Offline: the chip keeps showing the dates, but editing is not possible */
  disabled?: boolean;
  /** The text that was in the summary chip anyway - the "22 stops · 8 days" line */
  summary: string;
  onSet: (dates: { startDate?: string; endDate?: string }) => void;
  onAddDays: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * A horizontal shift that brings the panel back on screen.
   *
   * **Why by measurement and not CSS.** The button sits in the middle of the
   * header row, so no fixed anchor works: `end-0` overflowed 114px to the
   * right (that is Netanel's second screenshot - the departure-date field off
   * screen), and `start-0` overflowed 64px to the left. `position: fixed` is
   * not an option here because the screen root carries `.rise-in`, which
   * leaves a transform and therefore becomes a containing block - the trap
   * already documented in this file and in the Gotchas. Measuring after
   * opening works at every width, in both writing directions, and wherever
   * the button ends up living in the future.
   */
  const [shift, setShift] = useState(0);

  useEffect(() => setToday(todayISO()), []);

  useEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const M = 8;
    let dx = 0;
    if (r.left < M) dx = M - r.left;
    else if (r.right > window.innerWidth - M) dx = window.innerWidth - M - r.right;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dx) setShift(dx);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const dayCount = trip.days.length;
  const span = rangeDays(trip.startDate, trip.endDate);
  const mismatch = span !== null && dayCount > 0 && span !== dayCount ? span - dayCount : 0;
  const label = formatHebrewRange(trip.startDate, trip.endDate);
  const cd = today ? countdown(today, trip.startDate, trip.endDate) : null;

  const set = (field: 'startDate' | 'endDate', value: string) => {
    const next = { startDate: trip.startDate, endDate: trip.endDate, [field]: value || undefined };
    // An end deleted entirely clears both - "a trip without dates" is a valid state
    if (!next.startDate && !next.endDate) return onSet({});
    onSet(completeRange(dayCount, next.startDate, next.endDate));
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? OFFLINE_HINT : undefined}
        aria-expanded={open}
        aria-label={
          label
            ? `תאריכי הטיול: ${label}${cd && cd.kind !== 'past' ? `, ${cd.label}` : ''}`
            : 'הוספת תאריכים לטיול'
        }
        className="badge flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-full bg-night/5 px-3 py-1 text-xs font-semibold text-night/60 transition hover:bg-night/10 hover:text-night"
      >
        <span>{summary}</span>
        {label ? (
          <span className="font-bold text-sunset-deep">· {label}</span>
        ) : (
          <span className="text-night/40">· + תאריכים</span>
        )}
        {/*
          The countdown lives **inside the chip**, not as a layer floating
          under it. The previous version was `absolute -bottom-4` and floated
          between the chip and the button row, reading as a stray line
          intruding on another control's territory (Netanel's screenshot). As
          a filled pill inside the chip it is attached to what it describes,
          and cannot overlap anything.
        */}
        {cd && cd.kind !== 'past' && (
          <span className="rounded-full bg-sunset px-1.5 py-0.5 text-[11px] font-bold leading-none text-cream">
            {cd.label}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className="absolute start-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl bg-shell p-4 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        >
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="יוצאים"
              ariaLabel="תאריך יציאה"
              value={trip.startDate}
              onChange={(v) => set('startDate', v)}
            />
            <DateField
              label="חוזרים"
              ariaLabel="תאריך חזרה"
              value={trip.endDate}
              min={trip.startDate}
              onChange={(v) => set('endDate', v)}
            />
          </div>

          {span !== null && mismatch === 0 && (
            <p className="mt-2.5 text-xs font-medium text-night/50">
              {span} {span === 1 ? 'יום' : 'ימים'} - בדיוק כמו בתוכנית
            </p>
          )}

          {/* A mismatch: state it, don't fix it behind the user's back */}
          {mismatch > 0 && (
            <div className="mt-2.5 rounded-xl bg-sunset/10 p-2.5 ring-1 ring-sunset/25">
              <p className="text-xs font-semibold leading-relaxed text-night">
                התאריכים מכסים {mismatch} {mismatch === 1 ? 'יום' : 'ימים'} יותר מהתוכנית.
              </p>
              <button
                onClick={() => onAddDays(mismatch)}
                className="mt-1.5 rounded-lg bg-sunset px-3 py-1.5 text-xs font-bold text-cream transition hover:bg-sunset-deep"
              >
                להוסיף {mismatch} {mismatch === 1 ? 'יום' : 'ימים'} לתוכנית
              </button>
            </div>
          )}
          {mismatch < 0 && (
            <p className="mt-2.5 rounded-xl bg-night/5 p-2.5 text-xs font-semibold leading-relaxed text-night/70">
              בתוכנית {-mismatch} {-mismatch === 1 ? 'יום' : 'ימים'} יותר ממה שהתאריכים מכסים. אפשר
              להאריך את תאריך החזרה, או למחוק ימים מהתוכנית - לא נמחק לכם ימים לבד.
            </p>
          )}

          {(trip.startDate || trip.endDate) && (
            <button
              onClick={() => {
                onSet({});
                setOpen(false);
              }}
              className="mt-2.5 text-xs font-semibold text-night/45 transition hover:text-night"
            >
              ניקוי התאריכים
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A date field that looks like a field even when empty.
 *
 * **The bug Netanel photographed from the iPhone:** an empty
 * `<input type="date">` in iOS Safari renders as a completely featureless
 * box - no placeholder, no hint, nothing. Two empty, mysterious rectangles
 * in the panel. Desktop Chrome, on the other hand, draws its own
 * "dd/mm/yyyy" skeleton, so we can't just lay text over it - it would
 * collide.
 *
 * The fix: when the field is empty, the input's value text is painted
 * transparent (also hiding Chrome's skeleton - it carries no information
 * anyway) and our own "pick a date" hint layer sits on top, identical in
 * every browser. The moment there is a value - the input paints itself
 * again. `appearance-none` + `min-h` because iOS tends to shrink date
 * inputs with no content, and `text-start` on the value pseudo because iOS
 * centers it.
 *
 * The other half of the same fix, on desktop: Chrome draws its own calendar
 * indicator that collided with the hint layer (we have our own icon), so it
 * is hidden - and in exchange a click opens the calendar via `showPicker()`.
 * And while focused, the input becomes visible again (`focus:text-night`)
 * and the hint disappears, otherwise manually typing a date would be
 * invisible - transparent is transparent for the typist too.
 */
function DateField({
  label,
  ariaLabel,
  value,
  min,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value?: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-night/50">{label}</span>
      <span className="relative block">
        <input
          type="date"
          value={value ?? ''}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            // On desktop, with no indicator, a click only focuses - open the calendar ourselves
            try {
              e.currentTarget.showPicker?.();
            } catch {
              /* browser without showPicker - typing still works */
            }
          }}
          aria-label={ariaLabel}
          className={`peer min-h-11 w-full appearance-none rounded-xl border border-night/15 bg-cream px-2.5 py-2 text-base outline-none transition [color-scheme:light] focus:border-sunset/40 focus:text-night focus:ring-4 focus:ring-sunset/15 sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-start ${
            value ? 'text-night' : 'text-transparent'
          }`}
        />
        {!value && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center gap-1 text-sm font-medium text-night/40 peer-focus:hidden"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            בחירת תאריך
          </span>
        )}
      </span>
    </label>
  );
}
