'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Flag from '@/components/Flag';
import type { SearchKind, SearchResult } from '@/lib/siteSearch';

// כותרות הקבוצות מוגדרות כאן ולא מיובאות מ-`siteSearch`: כל ייבוא ערך
// (לא-type) מהמודול ההוא היה גורר את כל הקטלוג לתוך ה-bundle הראשי
// ומבטל בדיוק את מה שהייבוא הדינמי בא לחסוך.
const KIND_LABELS: Record<SearchKind, string> = {
  country: 'מדינות',
  city: 'ערים',
  place: 'מקומות',
};

/**
 * חיפוש כלל-אתרי - כפתור אחד שפותח שכבת חיפוש, ואותה שכבה משמשת בכל
 * מקום שבו יש כניסה לחיפוש (הניווט, קטלוג היעדים). יש שתי צורות לכפתור:
 * `icon` לניווט הצפוף, ו-`field` לדפים שבהם החיפוש הוא פעולה ראשית.
 *
 * הקטלוג עצמו נטען בייבוא דינמי ברגע הפתיחה בלבד, כך שכפתור בניווט לא
 * גורר את כל הדאטה ל-bundle של כל עמוד.
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
  const [search, setSearch] = useState<((q: string) => SearchResult[]) | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // הדאטה נטענת רק כשבאמת פותחים חיפוש
  useEffect(() => {
    if (!open || search) return;
    let alive = true;
    import('@/lib/siteSearch').then((m) => {
      const index = m.buildSearchIndex();
      // עוטפים בפונקציה נוספת כי setState מפרש פונקציה כעדכון-לפי-קודם
      if (alive) setSearch(() => (q: string) => m.searchSite(index, q));
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

  // Ctrl/Cmd+K פותח, Escape סוגר
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => (search ? search(query) : []), [search, query]);

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

  /** מה שאין בקטלוג - שולחים לסוכן, שיודע לחקור יעד חדש ולומר בכנות מה ידוע */
  const askAgent = () => {
    setOpen(false);
    onNavigate?.();
    router.push(`/chat?q=${encodeURIComponent(`ספר לי על ${query.trim()}`)}`);
  };

  // ---- הכפתור ----
  const trigger =
    variant === 'field' ? (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-night/15 bg-shell px-4 py-3 text-start text-night/45 shadow-inner transition hover:border-sunset/40 hover:text-night/60"
      >
        <SearchIcon />
        <span className="text-sm font-medium">חיפוש יעד, עיר או מקום…</span>
      </button>
    ) : variant === 'menu-row' ? (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-start font-medium text-night/80 transition hover:bg-night/5"
      >
        <SearchIcon />
        חיפוש
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        aria-label="חיפוש באתר"
        title="חיפוש באתר (Ctrl+K)"
        className="flex h-9 w-9 items-center justify-center rounded-full text-night/70 transition hover:bg-night/5 hover:text-night"
      >
        <SearchIcon />
      </button>
    );

  return (
    <>
      {trigger}

      {open && (
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
                <p className="px-3 py-4 text-sm font-medium text-night/45">
                  מחפשים לפי שם בעברית, שם מקומי או מדינה - למשל &quot;קרואטיה&quot;,
                  &quot;אקרופוליס&quot; או &quot;Kyoto&quot;.
                </p>
              ) : !search ? (
                <p className="px-3 py-4 text-sm font-medium text-night/45">טוען את הקטלוג…</p>
              ) : results.length === 0 ? (
                <div className="px-3 py-4">
                  {/* מצב ריק כן: לא ממציאים תוצאה, מציעים לשאול את הסוכן */}
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
                      <button
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start transition ${
                          i === active ? 'bg-sunset/10' : 'hover:bg-night/[0.04]'
                        }`}
                      >
                        <Flag flag={r.flag} label={r.title} size="md" />
                        <span className="truncate font-semibold text-night">{r.title}</span>
                        <span className="truncate text-xs font-medium text-night/45">
                          {r.subtitle}
                        </span>
                      </button>
                    </div>
                  );
                })}
                {/* יש תוצאות, אבל לא בהכרח מה שחיפשו: החיפוש הוא הכלה
                    בתת-מחרוזת, ולכן "דובאי" מוצא גם "נקיק אולדובאי".
                    שורת מילוט קבועה שומרת על כנות - מה שאין בקטלוג, הסוכן
                    יגיד עליו את האמת. */}
                <button
                  onClick={askAgent}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-night/10 px-3 py-2.5 text-start text-xs font-semibold text-night/50 transition hover:bg-night/[0.04] hover:text-night"
                >
                  לא מצאתם? לשאול את הסוכן על &quot;{query.trim()}&quot; ←
                </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
