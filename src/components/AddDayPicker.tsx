'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Country, Destination } from '@/lib/types';
import Flag from '@/components/Flag';
import { buildCityOptions, filterCities } from '@/lib/citySearch';

/**
 * הוספת יום לטיול: כפתור "+ יום…" שפותח רשימה עם חיפוש, במקום <select>
 * נייטיב שמנה את כל 45+ הערים בקטלוג. הערים שכבר בטיול מופיעות למעלה
 * ("עוד יום ב-"), ומתחתן שאר הקטלוג.
 *
 * הרכיב לא נוגע בלוגיקה: הוא רק קורא ל-onAddDay(slug) - בדיוק מה
 * שה-select עשה קודם עם trip.addDay.
 */
export default function AddDayPicker({
  destinations,
  countries,
  tripCitySlugs,
  onAddDay,
}: {
  destinations: Destination[];
  countries: Country[];
  /** הערים שכבר בטיול - מוצגות בקבוצה נפרדת בראש הרשימה */
  tripCitySlugs: string[];
  onAddDay: (citySlug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => buildCityOptions(destinations, countries), [destinations, countries]);
  const filtered = useMemo(() => filterCities(options, query), [options, query]);

  const inTrip = useMemo(
    () => tripCitySlugs.map((s) => filtered.find((o) => o.slug === s)).filter(Boolean) as typeof filtered,
    [filtered, tripCitySlugs],
  );
  const rest = useMemo(
    () => filtered.filter((o) => !tripCitySlugs.includes(o.slug)),
    [filtered, tripCitySlugs],
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const add = (slug: string) => {
    onAddDay(slug);
    setQuery('');
    setOpen(false);
  };

  const Row = ({ o, label }: { o: (typeof options)[number]; label: string }) => (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => add(o.slug)}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition hover:bg-sunset/10"
    >
      <Flag flag={o.flag} label={o.name} size="md" />
      <span className="truncate font-semibold text-night">{label}</span>
      <span className="ms-auto truncate ps-2 text-xs font-medium text-night/45">{o.country}</span>
    </button>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="rounded-full bg-shell px-3.5 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:ring-night/25"
      >
        + יום…
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="בחירת עיר ליום חדש"
          className="absolute end-0 top-full z-40 mt-2 w-72 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש עיר או מדינה…"
            aria-label="חיפוש עיר להוספת יום"
            className="w-full rounded-xl bg-cream px-3 py-2.5 text-sm text-night outline-none ring-1 ring-night/10 transition placeholder:text-night/40 focus:ring-2 focus:ring-sunset"
          />

          <div className="mt-1.5 max-h-64 overflow-y-auto">
            {inTrip.length > 0 && (
              <>
                <div className="px-3 pb-1 pt-2 text-xs font-bold text-night/40">כבר בטיול</div>
                {inTrip.map((o) => (
                  <Row key={`in-${o.slug}`} o={o} label={`עוד יום ב${o.name}`} />
                ))}
              </>
            )}
            {rest.length > 0 && (
              <>
                {inTrip.length > 0 && (
                  <div className="px-3 pb-1 pt-2 text-xs font-bold text-night/40">עיר חדשה</div>
                )}
                {rest.map((o) => (
                  <Row key={`new-${o.slug}`} o={o} label={o.name} />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm font-medium text-night/50">
                אין עיר כזו בקטלוג. אפשר לנסות שם מדינה.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
