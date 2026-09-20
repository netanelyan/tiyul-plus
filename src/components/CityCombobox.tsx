'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Flag from '@/components/Flag';
import { filterCities, type CityOption } from '@/lib/citySearch';

/**
 * Choosing cities for a trip: a single search field with a dropdown, instead of a grid of dozens
 * of cards (the catalog passed the original 8 cities long ago). The selection stays multiple - the
 * chosen cities are shown as removable chips.
 *
 * The component is presentational only: it holds no trip state, but receives citySlugs and
 * reports changes through onToggle - exactly the same logic the grid had.
 * Shared by the planner (/planner) and the structured questionnaire (/start).
 */

/**
 * Prefix for the option ids. They have to exist for aria-activedescendant to
 * have anything to point at - the input declared the attribute's siblings
 * (role, aria-controls, aria-autocomplete) and then never told a screen reader
 * which option was current, so the highlight was visible and unannounced.
 */
const OPTION_ID = 'city-combobox-option-';

export default function CityCombobox({
  options,
  citySlugs,
  onToggle,
  autoFocus = false,
}: {
  options: CityOption[];
  citySlugs: string[];
  onToggle: (slug: string) => void;
  /** Autofocus - only on screens with a mouse, so a keyboard does not pop up on mobile */
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  /**
   * Place the list against the input, by writing to the element rather than
   * through state.
   *
   * The list is portalled to the body (see the render), so it needs real
   * coordinates. Doing that through state would mean setting state inside an
   * effect on every scroll frame - a cascading render per frame, and the
   * pattern the react-hooks rule rejects. Writing the four properties directly
   * is both cheaper and the thing a positioned popover actually wants.
   *
   * It flips above the field when there is more room there, which on a phone
   * is what happens once the step has any content above it.
   */
  const placeList = useCallback(() => {
    const input = inputRef.current;
    const list = listRef.current;
    if (!input || !list) return;
    const r = input.getBoundingClientRect();
    const GAP = 8;
    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - GAP;
    const flip = below < 200 && above > below;
    list.style.left = `${r.left}px`;
    list.style.width = `${r.width}px`;
    list.style.maxHeight = `${Math.max(140, Math.min(288, flip ? above : below))}px`;
    if (flip) {
      list.style.top = 'auto';
      list.style.bottom = `${window.innerHeight - r.top + GAP}px`;
    } else {
      list.style.bottom = 'auto';
      list.style.top = `${r.bottom + GAP}px`;
    }
  }, []);

  useEffect(() => {
    if (autoFocus && window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, [autoFocus]);

  const selected = useMemo(
    () => citySlugs.map((s) => options.find((o) => o.slug === s)).filter(Boolean) as typeof options,
    [citySlugs, options],
  );

  const matches = useMemo(() => {
    const pool = filterCities(options, query);
    // Cities already chosen sink to the end of the list rather than disappearing (they can be removed from there too)
    return [...pool].sort(
      (a, b) => Number(citySlugs.includes(a.slug)) - Number(citySlugs.includes(b.slug)),
    );
  }, [options, query, citySlugs]);

  /**
   * Keep the active option in view when it moves past the edge of the list.
   *
   * Without this, Arrow-ing down a 166-option list highlights options nobody
   * can see: the list scrolls only by mouse, so the keyboard walks off the
   * bottom and the highlight simply disappears. DOM-only, so no render.
   */
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`#${OPTION_ID}${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    placeList();
    const onMove = () => placeList();
    // Capture, so a scroll inside any ancestor moves the list too, not just
    // a scroll of the document.
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, placeList, matches.length]);


  // Close on a click outside the component
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      // The list is portalled to the body, so it is NOT inside rootRef - without
      // checking it as well, clicking an option would close the list before the
      // click landed on it.
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const pick = (slug: string) => {
    onToggle(slug);
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        if (matches.length === 0) return 0;
        return (next + matches.length) % matches.length;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = matches[activeIndex];
      if (opt) pick(opt.slug);
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setActiveIndex(Math.max(0, matches.length - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      // Backspace in an empty field removes the last chip - behaviour familiar from tag inputs
      onToggle(selected[selected.length - 1].slug);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Chips for the chosen cities */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <span
              key={o.slug}
              className="badge rounded-full bg-sunset/10 py-1 ps-2 pe-1 text-sm font-semibold text-night ring-1 ring-sunset/30"
            >
              <Flag flag={o.flag} label={o.name} size="sm" />
              {o.name}
              <button
                type="button"
                onClick={() => onToggle(o.slug)}
                aria-label={`הסרת ${o.name}`}
                className="ms-0.5 flex h-5 w-5 items-center justify-center rounded-full text-night/45 transition hover:bg-sunset/20 hover:text-night"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // Reset here rather than in an effect on `query`: a new filter means a
          // new first match, and doing it in the same event avoids a render
          // whose only job is to correct the one before it.
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="city-combobox-list"
        aria-autocomplete="list"
        aria-activedescendant={open && matches.length > 0 ? `${OPTION_ID}${activeIndex}` : undefined}
        aria-label="חיפוש עיר או מדינה"
        placeholder={
          selected.length > 0 ? 'להוסיף עוד עיר…' : 'חיפוש עיר או מדינה: וינה, יוון, בנגקוק…'
        }
        className="w-full rounded-2xl border border-night/15 bg-shell px-4 py-3 text-night shadow-inner outline-none transition placeholder:text-night/45 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
      />

      {/*
        Portalled to the body, and that is the whole fix for the clipping.

        The step this sits in is a TransitionPanel, whose .panel-box carries
        `overflow: hidden` so the outgoing step does not show while it slides.
        An absolutely-positioned list inside it was therefore cut off at the
        panel's edge - measured at 375px: a 288px list with 134px of it hidden,
        about two of 166 options visible, inside a scroll container whose
        scrollbar is invisible. Removing that overflow was not an option; it is
        what makes the transition work.

        Fixed rather than absolute, positioned by placeList against the input.
        The body has no transformed ancestor, so `fixed` means the viewport
        here - the trap that jails a fixed child inside the header is documented
        in AccountButton and is exactly what portalling avoids.
      */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
        <div
          ref={listRef}
          id="city-combobox-list"
          role="listbox"
          className="fixed z-[70] overflow-y-auto rounded-2xl bg-shell p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        >
          {matches.length === 0 ? (
            <p className="px-3 py-3 text-sm font-medium text-night/50">
              אין עיר כזו בקטלוג. אפשר לנסות שם מדינה, או לבחור מהרשימה.
            </p>
          ) : (
            matches.map((o, i) => {
              const isSelected = citySlugs.includes(o.slug);
              return (
                <button
                  key={o.slug}
                  id={`${OPTION_ID}${i}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(o.slug)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition ${
                    i === activeIndex ? 'bg-sunset/10' : 'hover:bg-night/[0.04]'
                  }`}
                >
                  <Flag flag={o.flag} label={o.name} size="md" />
                  <span className="truncate font-semibold text-night">{o.name}</span>
                  <span className="truncate text-xs font-medium text-night/45">{o.country}</span>
                  {isSelected && (
                    <span className="ms-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sunset text-xs font-bold text-cream">
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>,
          document.body,
        )}
    </div>
  );
}
