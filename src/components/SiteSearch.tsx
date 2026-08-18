'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Flag from '@/components/Flag';
import { Skeleton } from '@/components/Skeleton';
import type { SearchHits, SearchKind, SearchResult } from '@/lib/siteSearch';
import { OFFLINE_HINT, useOnline } from '@/lib/offline/online';

// The group headings are defined here rather than imported from `siteSearch`:
// any value (non-type) import from that module would drag the entire catalog
// into the main bundle and defeat exactly what the dynamic import is meant
// to save.
const KIND_LABELS: Record<SearchKind, string> = {
  country: 'מדינות',
  city: 'ערים',
  place: 'מקומות',
};

/**
 * Site-wide search - one button that opens a search overlay, and the same
 * overlay is used everywhere search has an entry point (the nav, the
 * destination catalog). The button has two shapes: `icon` for the dense
 * nav, and `field` for pages where search is a primary action.
 *
 * The catalog itself is loaded via dynamic import only at the moment of
 * opening, so a button in the nav does not drag all the data into every
 * page's bundle.
 *
 * **The overlay is rendered in a portal onto the body, and that is not
 * decoration.** The nav button sits inside the `<header>`, and the header
 * carries `backdrop-blur` - and backdrop-filter creates a containing block
 * for position:fixed. Without the portal, `fixed inset-0` is measured
 * against the header instead of the screen: measured in a real browser at
 * 390px - 360x74 instead of 360x740. The result on the phone is exactly
 * what Netanel photographed: a shaded band the height of the nav ending in
 * a hard line, with the panel floating over an undimmed page below it.
 * AccountButton already fell into this exact trap and was fixed; this is
 * the very same bug, in a different component.
 */

type Variant = 'icon' | 'field' | 'menu-row';

const SearchIcon = ({ className = '' }: { className?: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    className={className}
    aria-hidden
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
);

export default function SiteSearch({
  variant = 'icon',
  onNavigate,
}: {
  variant?: Variant;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<((q: string) => SearchHits) | null>(null);
  /** Starter destinations - loaded together with the catalog, so the empty state is not empty */
  const [popular, setPopular] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  /**
   * Site search scans the **entire** catalog, which is loaded here via a
   * dynamic `import()` and is deliberately not stored on the device (only
   * the trip's cities are stored). Without a network there is nothing to
   * search, so the button is disabled and says so - instead of opening onto
   * a panel stuck empty, which is exactly what "looks broken" means.
   */
  const offline = !useOnline();

  // The data is loaded only when search is actually opened
  useEffect(() => {
    if (!open || search) return;
    let alive = true;
    import('@/lib/siteSearch').then((m) => {
      const index = m.buildSearchIndex();
      if (!alive) return;
      // Wrapped in an extra function because setState treats a function as an update-from-previous
      setSearch(() => (q: string) => m.searchSiteHits(index, q));
      setPopular(m.popularDestinations(index));
    });
    return () => {
      alive = false;
    };
  }, [open, search]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  // Ctrl/Cmd+K opens, Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (offline) return;
        setOpen((v) => !v);
      } else if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [offline]);

  const hits = useMemo(() => (search ? search(query) : { results: [], omitted: 0 }), [search, query]);
  /**
   * What keyboard navigation moves through. When the field is empty these
   * are the starter destinations, so ArrowDown and Enter work immediately
   * on open - without typing anything.
   */
  const results = query.trim().length < 2 ? popular : hits.results;

  useEffect(() => setActive(0), [query]);

  const go = useCallback(
    (r: SearchResult) => {
      setOpen(false);
      onNavigate?.();
      router.push(r.href);
    },
    [router, onNavigate],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) go(r);
      else if (query.trim()) askAgent();
    }
  };

  /** Whatever is not in the catalog - hand off to the agent, which can explore a new destination and say honestly what is known */
  const askAgent = () => {
    setOpen(false);
    onNavigate?.();
    router.push(`/chat?q=${encodeURIComponent(`ספר לי על ${query.trim()}`)}`);
  };

  // ---- The trigger button ----
  const trigger =
    variant === 'field' ? (
      <button
        onClick={() => setOpen(true)}
        disabled={offline}
        title={offline ? OFFLINE_HINT : undefined}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-night/15 bg-shell px-4 py-3 text-start text-night/45 shadow-inner transition enabled:hover:border-sunset/40 enabled:hover:text-night/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SearchIcon />
        <span className="text-sm font-medium">
          {offline ? 'חיפוש בקטלוג דורש חיבור' : 'חיפוש יעד, עיר או מקום…'}
        </span>
      </button>
    ) : variant === 'menu-row' ? (
      <button
        onClick={() => setOpen(true)}
        disabled={offline}
        title={offline ? OFFLINE_HINT : undefined}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-start font-medium text-night/80 transition enabled:hover:bg-night/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SearchIcon />
        חיפוש
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        aria-label="חיפוש באתר"
        disabled={offline}
        title={offline ? OFFLINE_HINT : 'חיפוש באתר (Ctrl+K)'}
        className="flex h-9 w-9 items-center justify-center rounded-full text-night/70 transition enabled:hover:bg-night/5 enabled:hover:text-night disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SearchIcon />
      </button>
    );

  return (
    <>
      {trigger}

      {/* Connection dropped while the panel is open - it disappears
          immediately, instead of staying open over a search that will
          return nothing */}
      {open &&
        !offline &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex justify-center bg-night/40 px-4 pt-[10vh] backdrop-blur-[2px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="h-fit w-full max-w-xl overflow-hidden rounded-3xl bg-shell shadow-[var(--shadow-pop)] ring-1 ring-night/10">
              <div className="flex items-center gap-2.5 border-b border-night/10 px-4 py-3">
                <SearchIcon className="shrink-0 text-night/40" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  role="combobox"
                  aria-expanded
                  aria-controls="site-search-results"
                  aria-label="חיפוש יעד, עיר או מקום"
                  placeholder="חיפוש יעד, עיר או מקום…"
                  className="w-full bg-transparent text-night outline-none placeholder:text-night/40"
                />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="סגירה"
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-night/45 transition hover:bg-night/5 hover:text-night"
                >
                  Esc
                </button>
              </div>

              <div id="site-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
                {query.trim().length < 2 ? (
                  /*
                    The empty state used to be an explanatory paragraph and
                    nothing to click - a search overlay that opens and shows
                    documentation. Now it opens with real destinations, by
                    the editorial rating that exists in the data, and the
                    arrow keys work immediately.
                  */
                  popular.length > 0 ? (
                    <>
                      <div className="px-3 pb-1 pt-2 text-xs font-bold text-night/40">
                        {/* A precise name, not "popular": we have no
                            popularity measurement, there is an editorial
                            rating in the data. */}
                        היעדים המדורגים ביותר
                      </div>
                      {popular.map((r, i) => (
                        <Row key={r.key} r={r} activeRow={i === active} onPick={() => go(r)} />
                      ))}
                    </>
                  ) : (
                    <CatalogRowsSkeleton />
                  )
                ) : !search ? (
                  <CatalogRowsSkeleton />
                ) : results.length === 0 ? (
                  <div className="px-3 py-4">
                    {/* An honest empty state: no invented results - we offer to ask the agent */}
                    <p className="text-sm font-semibold text-night">
                      אין &quot;{query.trim()}&quot; בקטלוג שלנו.
                    </p>
                    <button
                      onClick={askAgent}
                      className="mt-2 rounded-xl bg-sunset px-4 py-2 text-sm font-bold text-cream transition hover:bg-sunset-deep"
                    >
                      לשאול את הסוכן ←
                    </button>
                  </div>
                ) : (
                  <>
                  {results.map((r, i) => {
                    const prev = results[i - 1];
                    return (
                      <div key={r.key}>
                        {(!prev || prev.kind !== r.kind) && (
                          <div className="px-3 pb-1 pt-2 text-xs font-bold text-night/40">
                            {KIND_LABELS[r.kind]}
                          </div>
                        )}
                        <Row
                          r={r}
                          activeRow={i === active}
                          onHover={() => setActive(i)}
                          onPick={() => go(r)}
                        />
                      </div>
                    );
                  })}
                  {/* The per-kind cap can omit results. We say so instead of
                      silently showing a truncated list. */}
                  {hits.omitted > 0 && (
                    <p className="px-3 pt-2 text-xs font-medium text-night/40">
                      ועוד {hits.omitted} התאמות - כדאי לחדד את החיפוש.
                    </p>
                  )}
                  {/* There are results, but not necessarily what was
                      searched for: matching is substring containment, so
                      searching for Dubai also finds Olduvai Gorge. A
                      persistent escape row keeps things honest - whatever is
                      not in the catalog, the agent will tell the truth
                      about. */}
                  <button
                    onClick={askAgent}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-night/10 px-3 py-2.5 text-start text-xs font-semibold text-night/50 transition hover:bg-night/[0.04] hover:text-night"
                  >
                    לא מצאתם? לשאול את הסוכן על &quot;{query.trim()}&quot; ←
                  </button>
                  </>
                )}
                {/* Keyboard hint: also here so the panel does not look cut off at the bottom */}
                <p className="mt-1 hidden items-center gap-2 border-t border-night/10 px-3 pt-2 text-[11px] font-medium text-night/35 sm:flex">
                  <kbd className="rounded bg-night/5 px-1.5 py-0.5 font-sans">↑</kbd>
                  <kbd className="rounded bg-night/5 px-1.5 py-0.5 font-sans">↓</kbd>
                  לבחירה
                  <kbd className="rounded bg-night/5 px-1.5 py-0.5 font-sans">Enter</kbd>
                  לפתיחה
                  <span className="ms-auto">חיפוש לפי שם בעברית, שם מקומי או מדינה</span>
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * A result row. Extracted into its own component because the exact same row
 * serves both the starter destinations and the search results - the two
 * copies used to be separate in their keyboard behavior.
 */
/**
 * The rows the catalog will fill in. The catalog module is imported
 * dynamically on first open (it is ~2MB and must never sit in the nav's
 * bundle), so this is a real wait on a slow connection - and the panel used
 * to be one grey line of text that then jumped to a full list.
 */
function CatalogRowsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="טוענים את הקטלוג" className="py-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex w-full items-center gap-2.5 px-3 py-2.5" aria-hidden>
          <Skeleton className="h-4 w-6 shrink-0 rounded" />
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function Row({
  r,
  activeRow,
  onHover,
  onPick,
}: {
  r: SearchResult;
  activeRow: boolean;
  onHover?: () => void;
  onPick: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={activeRow}
      onMouseEnter={onHover}
      onClick={onPick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition ${
        activeRow ? 'bg-sunset/10' : 'hover:bg-night/[0.04]'
      }`}
    >
      <Flag flag={r.flag} label={r.title} size="md" />
      <span className="truncate font-semibold text-night">{r.title}</span>
      <span className="truncate text-xs font-medium text-night/45">{r.subtitle}</span>
    </button>
  );
}
