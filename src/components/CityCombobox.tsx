'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

  useEffect(() => setActiveIndex(0), [query]);

  // Close on a click outside the component
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="city-combobox-list"
        aria-autocomplete="list"
        aria-label="חיפוש עיר או מדינה"
        placeholder={
          selected.length > 0 ? 'להוסיף עוד עיר…' : 'חיפוש עיר או מדינה: וינה, יוון, בנגקוק…'
        }
        className="w-full rounded-2xl border border-night/15 bg-shell px-4 py-3 text-night shadow-inner outline-none transition placeholder:text-night/45 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
      />

      {open && (
        <div
          id="city-combobox-list"
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-shell p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
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
        </div>
      )}
    </div>
  );
}
