'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import LoginModal from '@/components/LoginModal';
import { travelerLevel } from '@/data/worldCountries';
import { OFFLINE_HINT, useOnline } from '@/lib/offline/online';

/**
 * The user account control in the nav: the avatar menu when signed in, the
 * sign-in button when not.
 *
 * The modal itself moved to LoginModal. While it lived here it was a private
 * function, so the nav was the only thing on the site that could open it -
 * which is why every other surface needing a signed-in user could only print
 * a sentence pointing back at this button. Anything can open it now; see
 * LoginGate.
 */
export default function AccountButton() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /**
   * Login is a one-time code by email - i.e. a server. Without a network the
   * button is disabled and says so, instead of opening a form that submits
   * to nowhere. Someone already signed in keeps seeing the menu: it is read
   * from local state, not from the network.
   */
  const offlineNow = !useOnline();

  if (!auth.enabled || !auth.ready) return null;

  if (auth.user) {
    const email = auth.user.email ?? '';
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-sunset text-sm font-black text-cream shadow-sm ring-2 ring-sunset/25 transition hover:bg-sunset-deep"
          title={email}
        >
          {auth.profile?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={auth.profile.avatar}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            ((auth.profile?.displayName || email)[0] ?? 'א').toUpperCase()
          )}
        </button>
        {menuOpen && (
          <>
            {typeof document !== 'undefined' &&
              createPortal(
                <button
                  aria-label="סגירה"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />,
                document.body,
              )}
            <div className="rise-in absolute end-0 top-11 z-50 w-72 overflow-hidden rounded-2xl bg-shell shadow-xl ring-1 ring-night/10">
              {/* Night header - the same design language as the login modal */}
              <div className="relative bg-night px-4 py-3.5">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(130% 130% at 12% 130%, rgba(255,89,65,0.4) 0%, rgba(255,197,49,0.14) 45%, transparent 70%)',
                  }}
                />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sunset text-lg font-black text-cream ring-2 ring-cream/20">
                    {auth.profile?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={auth.profile.avatar}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      ((auth.profile?.displayName || email)[0] ?? 'א').toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-cream">
                      {auth.profile?.displayName?.trim() || 'המטייל של טיול+'}
                    </p>
                    <p className="truncate text-[11px] font-medium text-cream/60" dir="ltr">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {/* The passport row - a fun status that pulls toward the account area */}
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 ring-1 ring-night/10 transition hover:ring-night/25"
                >
                  <span aria-hidden>{travelerLevel(auth.profile?.visited.length ?? 0).current.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-night">
                    {travelerLevel(auth.profile?.visited.length ?? 0).current.title}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-night/50">
                    {(auth.profile?.visited.length ?? 0) > 0
                      ? `${auth.profile!.visited.length} מדינות בדרכון`
                      : 'לחתום בדרכון ←'}
                  </span>
                </Link>

                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1.5 flex w-full items-center gap-2 rounded-xl bg-sunset px-3 py-2.5 text-start text-sm font-bold text-cream transition hover:bg-sunset-deep"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-3.9 3.6-7 8-7s8 3.1 8 7" />
                  </svg>
                  האזור האישי
                </Link>
                {/*
                  An admin link only for admin/owner. This is convenience,
                  not security: the role here is read from the profile in the
                  browser, so someone who edits it manually will see a link -
                  and get "not found", because every /api/admin route re-reads
                  the role from the database on every request.
                */}
                {auth.profile && auth.profile.role !== 'user' && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1.5 flex w-full items-center gap-2 rounded-xl bg-night px-3 py-2.5 text-start text-sm font-bold text-cream transition hover:bg-night-soft"
                  >
                    <span aria-hidden>{auth.profile.role === 'owner' ? '👑' : '🛠️'}</span>
                    אזור הניהול
                  </Link>
                )}
                <button
                  onClick={() => {
                    void auth.signOut();
                    setMenuOpen(false);
                  }}
                  className="mt-1.5 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-night/60 transition hover:bg-night/5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                    aria-hidden
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  התנתקות
                </button>
                <p className="mt-1 px-3 pb-1 text-center text-[10px] font-medium text-lagoon-deep">
                  ✓ הטיולים והפרופיל מסתנכרנים בין המכשירים
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={offlineNow}
        title={offlineNow ? OFFLINE_HINT : undefined}
        className="flex items-center gap-1.5 rounded-xl bg-night/5 px-3.5 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition enabled:hover:bg-night/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
          aria-hidden
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-3.9 3.6-7 8-7s8 3.1 8 7" />
        </svg>
        התחברות
      </button>
      {open && <LoginModal onClose={() => setOpen(false)} />}
    </>
  );
}
