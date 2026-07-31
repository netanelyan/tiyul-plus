'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/lib/trip/TripContext';
import { tripLabel, type CityNames } from '@/lib/trip/label';
import SiteSearch from '@/components/SiteSearch';
import AccountButton from '@/components/AccountButton';

// כניסה אחת לטיול: /chat הוא גם השיחה וגם התוכנית (תצוגה מאוחדת) -
// אין יותר טאב צ׳אט נפרד מול טאב מתכנן.
const NAV_LINKS = [
  { href: '/countries', label: 'יעדים' },
  { href: '/chat', label: 'תכנון טיול' },
  { href: '/kosher', label: 'כשרות' },
];

/**
 * ניווט האתר: מ-md ומעלה קישורים בשורה + **פקד אחד** לטיולים; מתחת
 * ל-md המבורגר שפותח תפריט נפתח (כולל רשימת כל הטיולים ואת הקישורים).
 * נסגר בלחיצה על קישור/טאב ובהקשה מחוץ לתפריט. בלי ספריית תפריטים -
 * state + טוקנים בלבד.
 *
 * **למה פקד אחד ולא טאבים.** קודם הוצגו עד שני טיולים כגלולות ישירות
 * בשורה ועוד כפתור "עוד (N)". שלוש בעיות, כולן נראות בצילום מסך אחד:
 * הגלולה של הטיול הפעיל היא קורל מלא ויושבת בדיוק ליד "כשרות", כך
 * שהיא נקראת כפריט ניווט; שני טיולים הם רעש קבוע בשורה שאמורה להיות
 * קישורי האתר; ו-`max-w-24 truncate` חתך שמות ("ברטיסלבה + וינה"
 * נהיה "ברטיסלב…"). עכשיו: כניסה אחת שאומרת כמה טיולים יש, ורשימה
 * מלאה בלי חיתוך. אותן פעולות בדיוק, פחות רעש.
 */
export default function SiteNav({ cityNames }: { cityNames: CityNames }) {
  const [open, setOpen] = useState(false);
  const [tripsMenuOpen, setTripsMenuOpen] = useState(false);
  const { trips, currentId, hydrated, setCurrentId } = useTrip();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open && !tripsMenuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setTripsMenuOpen(false);
      }
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [open, tripsMenuOpen]);

  /** פותח טיול קיים כטאב פעיל: אם כבר ב-/chat זה קורה מיידית, אחרת מנווטים עם ?trip= */
  const openTrip = (id: string) => {
    setCurrentId(id);
    router.push(`/chat?trip=${id}`);
    setOpen(false);
    setTripsMenuOpen(false);
  };

  const myTrips = hydrated ? trips : [];

  return (
    <div ref={rootRef} className="relative">
      {/* md+: קישורים בשורה + טאבי הטיולים הפתוחים */}
      <nav className="hidden items-center gap-2 md:flex">
        <SiteSearch />
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3.5 py-1.5 text-sm font-medium text-night/70 transition hover:bg-night/5 hover:text-night"
          >
            {l.label}
          </Link>
        ))}
        {myTrips.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setTripsMenuOpen((v) => !v)}
              aria-expanded={tripsMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-night/70 transition hover:bg-night/5 hover:text-night"
            >
              הטיולים שלי
              <span className="rounded-full bg-night/10 px-1.5 text-xs font-bold text-night/60">
                {myTrips.length}
              </span>
              <span aria-hidden className="text-xs text-night/40">
                ▾
              </span>
            </button>
            {tripsMenuOpen && (
              <div
                role="menu"
                className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10"
              >
                {myTrips.map((t) => (
                  <button
                    key={t.id}
                    role="menuitem"
                    onClick={() => openTrip(t.id)}
                    className={`block w-full rounded-xl px-3.5 py-2 text-start transition ${
                      t.id === currentId
                        ? 'bg-sunset/10 text-sunset-deep'
                        : 'text-night/80 hover:bg-night/5'
                    }`}
                  >
                    {/* השם המלא, בלי חיתוך - ארוך נשבר לשתי שורות */}
                    <span className="block text-sm font-semibold leading-snug">{tripLabel(t, cityNames)}</span>
                    <span className="block text-xs font-medium text-night/40">
                      {t.id === currentId ? 'פתוח עכשיו' : `${t.days.length} ימים`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <AccountButton />
      </nav>

      {/* מתחת ל-md: כפתור החשבון וההמבורגר יושבים באותה שורה, צמודים */}
      <div className="flex items-center gap-1.5 md:hidden">
      <AccountButton />
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="תפריט"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-night/70 transition hover:bg-night/5"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>
      </div>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-shell p-2 shadow-[var(--shadow-pop)] ring-1 ring-night/10 md:hidden">
          <SiteSearch variant="menu-row" onNavigate={() => setOpen(false)} />
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-2.5 font-medium text-night/80 transition hover:bg-night/5"
            >
              {l.label}
            </Link>
          ))}
          {hydrated && trips.length > 0 && (
            <>
              <div className="mt-2 border-t border-night/10 px-4 pb-1 pt-2 text-xs font-bold text-night/40">
                הטיולים שלי
              </div>
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTrip(t.id)}
                  className={`block w-full rounded-xl px-4 py-2.5 text-start transition ${
                    t.id === currentId
                      ? 'bg-sunset/10 text-sunset-deep'
                      : 'text-night/80 hover:bg-night/5'
                  }`}
                >
                  {/* בלי truncate: שם ארוך נשבר לשתי שורות במקום להיחתך */}
                  <span className="block font-semibold leading-snug">{tripLabel(t, cityNames)}</span>
                  <span className="block text-xs font-medium text-night/40">
                    {t.id === currentId ? 'פתוח עכשיו' : `${t.days.length} ימים`}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
