'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Logo from '@/components/Logo';

/**
 * The login modal, and the only one on the site.
 *
 * It used to be a private function inside AccountButton, which meant the nav
 * was the only thing that could open it - so every other surface that needs a
 * signed-in user (subscribing, the shared trip, the pre-departure check) could
 * do nothing but print a sentence pointing at a button somewhere else on the
 * page. On a phone that button is off screen, so the sentence was a dead end.
 * Lifting the modal out is what lets any surface open it; LoginGate is what
 * those surfaces call.
 *
 * The modal's principles: no passwords (a code sent to email), six digit
 * cells with paste and auto-submit, an animated success state, remembering
 * the last email, a countdown for resending, Escape closes. If the user
 * clicks the link in the email instead of typing a code - supabase-js picks
 * up the session from the URL and the modal closes on its own.
 *
 * The modal renders in a portal into the body: it sits inside the header,
 * and the header has backdrop-blur which creates a containing block for
 * position:fixed (the same trap as rise-in+transform documented in
 * TripWorkspace) - without the portal the "full screen" gets jailed inside
 * the nav bar.
 */

const RESEND_SECONDS = 30;
const LAST_EMAIL_KEY = 'tiyul-plus:last-email';

type Step = 'email' | 'code' | 'success';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const submittingRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus only on devices with a physical keyboard: on a phone,
  // autoFocus pops the keyboard immediately and hides the modal before it is
  // even seen.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) emailInputRef.current?.focus();
  }, []);

  /*
    The last email, remembered only if it was asked for.

    This used to be written on every login attempt and kept after logout, which
    made it the one thing the site stored on the device that is **not** needed to
    deliver anything - a convenience, and on a shared computer a convenience that
    shows the next person who was here. The privacy policy said so in a warning,
    which is the wrong place to solve it.

    Default off, and finding an address already stored is what ticks the box - so
    somebody who opted in before keeps their prefill and can now turn it off.
  */
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY);
      if (last) {
        setEmail(last);
        setRemember(true);
      }
    } catch {
      /* no storage - start empty */
    }
  }, []);

  // Escape closes (not mid-verification and not on the success screen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'success') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  // A login completed externally (the link from the email) - skip straight to success
  useEffect(() => {
    if (auth.user && step !== 'success') {
      setStep('success');
      const t = setTimeout(onClose, 1400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  async function sendCode() {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    const res = await auth.sendCode(email.trim());
    setBusy(false);
    if (res.ok) {
      try {
        // Unticking it has to DELETE, not merely stop writing - otherwise the
        // address from a previous visit survives the choice to stop keeping it.
        if (remember) localStorage.setItem(LAST_EMAIL_KEY, email.trim());
        else localStorage.removeItem(LAST_EMAIL_KEY);
      } catch {
        /* not critical */
      }
      setStep('code');
      setCode('');
      setResendIn(RESEND_SECONDS);
    } else setError(res.error ?? 'משהו השתבש');
  }

  async function submitCode(value?: string) {
    const token = (value ?? code).trim();
    if (token.length !== 6 || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    const res = await auth.verifyCode(email.trim(), token);
    setBusy(false);
    submittingRef.current = false;
    if (res.ok) {
      setStep('success');
      setTimeout(onClose, 1400);
    } else {
      setError(res.error ?? 'משהו השתבש');
      setCode('');
    }
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <button
        aria-label="סגירה"
        onClick={step === 'success' ? undefined : onClose}
        className="fixed inset-0 bg-night/55 backdrop-blur-[3px]"
      />
      <div className="flex min-h-full items-center justify-center p-4 sm:py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="התחברות לטיול+"
        className="rise-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-shell shadow-2xl ring-1 ring-night/10"
      >
        {/* Branded header: night background with a subtle sunrise glow + the logo */}
        <div className="relative bg-night px-6 pb-5 pt-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 90% at 85% 110%, rgba(255,89,65,0.35) 0%, rgba(255,197,49,0.12) 45%, transparent 70%)',
            }}
          />
          <div className="relative flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cream/10 ring-1 ring-cream/15">
              <Logo reversed className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-black leading-tight text-cream">
                טיול<span className="text-sunset-glow">+</span>
              </p>
              <p className="text-[11px] font-medium text-cream/60">סוכן הנסיעות החכם</p>
            </div>
            {step !== 'success' && (
              <button
                onClick={onClose}
                aria-label="סגירה"
                className="ms-auto flex h-8 w-8 items-center justify-center rounded-full text-cream/50 transition hover:bg-cream/10 hover:text-cream"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-7">
          {step === 'email' && (
            <div key="email" className="rise-in">
              <h2 className="display text-2xl text-night">הטיולים שלך, בכל מכשיר</h2>
              <div className="mt-4 space-y-2.5">
                <Benefit icon="cloud" text="כל טיול נשמר בחשבון - לא הולך לאיבוד" />
                <Benefit icon="sync" text="מתחילים בטלפון, ממשיכים במחשב" />
                <Benefit icon="lock" text="בלי סיסמאות - קוד חד-פעמי למייל" />
              </div>
              <label htmlFor="login-email" className="mt-5 block text-xs font-bold text-night/65">
                כתובת המייל
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                placeholder="you@example.com"
                dir="ltr"
                ref={emailInputRef}
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/65 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
              />
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs font-medium leading-relaxed text-night/70">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-night/30"
                />
                <span>
                  לזכור את הכתובת במכשיר הזה
                  <span className="block text-night/65">
                    לא מומלץ במחשב משותף. אפשר לבטל בכל כניסה.
                  </span>
                </span>
              </label>
              <button
                onClick={sendCode}
                disabled={busy || !emailValid}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 font-bold text-cream shadow-sm transition hover:bg-sunset-deep disabled:opacity-40"
              >
                {busy && <Spinner />}
                {busy ? 'שולח קוד…' : 'המשך עם המייל'}
              </button>
            </div>
          )}

          {step === 'code' && (
            <div key="code" className="rise-in">
              <h2 className="display text-2xl text-night">הקוד בדרך אליך</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-night/70">
                נשלח קוד בן 6 ספרות אל{' '}
                <span className="font-semibold text-night" dir="ltr">
                  {email.trim()}
                </span>
              </p>
              <OtpBoxes
                value={code}
                disabled={busy}
                onChange={(v) => {
                  setCode(v);
                  setError(null);
                  if (v.length === 6) void submitCode(v);
                }}
              />
              <button
                onClick={() => submitCode()}
                disabled={busy || code.length !== 6}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 font-bold text-cream shadow-sm transition hover:bg-sunset-deep disabled:opacity-40"
              >
                {busy && <Spinner />}
                {busy ? 'מאמת…' : 'התחברות'}
              </button>
              <div className="mt-3.5 flex items-center justify-between text-xs font-semibold">
                <button
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                  className="text-night/65 transition hover:text-night"
                >
                  → החלפת מייל
                </button>
                {resendIn > 0 ? (
                  <span className="text-night/65" aria-live="polite">
                    אפשר לשלוח שוב בעוד {resendIn} שנ׳
                  </span>
                ) : (
                  <button
                    onClick={sendCode}
                    disabled={busy}
                    className="text-sunset-deep transition hover:underline"
                  >
                    שליחת קוד חדש
                  </button>
                )}
              </div>
              <p className="mt-3 rounded-lg bg-night/[0.04] px-3 py-2 text-[11px] leading-relaxed text-night/65">
                לא רואים את המייל? בדקו את תיקיית הספאם, או לחצו על הקישור שבמייל -
                גם הוא מחבר אתכם.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div key="success" className="rise-in flex flex-col items-center py-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lagoon/15">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-lagoon-deep"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h2 className="display mt-4 text-2xl text-night">מחוברים!</h2>
              <p className="mt-1 text-sm text-night/70">
                הטיולים שלך נשמרים ומסתנכרנים מעכשיו בכל מכשיר.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-sunset/10 px-3 py-2.5 text-sm font-semibold text-sunset-deep" role="alert">
              {error}
            </p>
          )}

          {step === 'email' && (
            <p className="mt-5 border-t border-night/10 pt-3 text-center text-[11px] leading-relaxed text-night/65">
              בלחיצה על ״המשך עם המייל״ אתם מסכימים ל
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-night/70 underline hover:text-sunset-deep"
              >
                תנאי השימוש
              </Link>{' '}
              ול
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-night/70 underline hover:text-sunset-deep"
              >
                מדיניות הפרטיות
              </Link>{' '}
              שלנו · ההתחברות יוצרת חשבון אם עוד אין לך אחד
            </p>
          )}
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Six code cells: one hidden input above styled cells ---------- */

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div
      dir="ltr"
      className="relative mt-5 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* The real input - invisible, absorbs typing, pasting and code autofill */}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="קוד אימות בן 6 ספרות"
        autoFocus
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full opacity-0"
      />
      <div className="flex justify-between gap-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = i < value.length;
          const active = focused && i === Math.min(value.length, 5);
          return (
            <div
              key={i}
              aria-hidden
              className={`flex h-14 flex-1 items-center justify-center rounded-xl border-2 bg-cream text-2xl font-black text-night transition ${
                active
                  ? 'border-sunset ring-4 ring-sunset/15'
                  : filled
                    ? 'border-night/25'
                    : 'border-night/10'
              }`}
            >
              {value[i] ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cream/40 border-t-cream"
    />
  );
}

function Benefit({ icon, text }: { icon: 'cloud' | 'sync' | 'lock'; text: string }) {
  const paths = {
    cloud: <path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 6 6 0 0 0-11.7 1.62A4 4 0 0 0 7 19h10.5Z" />,
    sync: (
      <>
        <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
        <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
        <path d="M3 21v-5h5" />
        <path d="M21 3v5h-5" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  };
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunset/10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          // Was a hardcoded #e03e27, which meant it silently ignored
          // high-contrast mode - the defect the colour tokens exist to prevent.
          className="h-4 w-4 text-sunset-deep"
          aria-hidden
        >
          {paths[icon]}
        </svg>
      </span>
      <span className="text-sm font-medium text-night/75">{text}</span>
    </div>
  );
}
