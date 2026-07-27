'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Logo from '@/components/Logo';
import { travelerLevel } from '@/data/worldCountries';

/**
 * חשבון המשתמש בניווט + מודל ההתחברות.
 *
 * עקרונות המודל: בלי סיסמאות (קוד למייל), שישה תאי ספרות עם הדבקה
 * ושליחה אוטומטית, מצב הצלחה מונפש, זכירת המייל האחרון, ספירה לאחור
 * לשליחה חוזרת, Escape סוגר. אם המשתמש לוחץ על הקישור שבמייל במקום
 * להזין קוד - supabase-js קולט את הסשן מה-URL והמודל נסגר מעצמו.
 *
 * המודל מרונדר ב-portal אל ה-body: הוא יושב בתוך ההדר, ולהדר יש
 * backdrop-blur שיוצר containing block ל-position:fixed (אותה מלכודת
 * כמו rise-in+transform שמתועדת ב-TripWorkspace) - בלי portal ה"מסך
 * המלא" נכלא בתוך פס הניווט.
 */
export default function AccountButton() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
            <img src={auth.profile.avatar} alt="" className="h-full w-full object-cover" />
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
              {/* כותרת לילה - אותה שפה עיצובית כמו מודל ההתחברות */}
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
                      <img src={auth.profile.avatar} alt="" className="h-full w-full object-cover" />
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
                {/* שורת הדרכון - סטטוס כיפי שמושך אל האזור האישי */}
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
                  קישור לניהול רק לאדמין/בעלים. זו נוחות ולא אבטחה: התפקיד
                  כאן נקרא מהפרופיל בדפדפן, ולכן מי שיערוך אותו ידנית יראה
                  קישור - ויקבל "לא נמצא", כי כל נתיב /api/admin קורא את
                  התפקיד מהדאטהבייס מחדש בכל בקשה.
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
                <p className="mt-1 px-3 pb-1 text-center text-[10px] font-medium text-[#007f76]">
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
        className="flex items-center gap-1.5 rounded-xl bg-night/5 px-3.5 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-night/10"
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

/* ================================ המודל ================================ */

const RESEND_SECONDS = 30;
const LAST_EMAIL_KEY = 'tiyul-plus:last-email';

type Step = 'email' | 'code' | 'success';

function LoginModal({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const submittingRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // פוקוס אוטומטי רק במכשירים עם מקלדת פיזית: בטלפון autoFocus מקפיץ
  // את המקלדת מיד ומסתיר את המודל לפני שרואים אותו בכלל.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) emailInputRef.current?.focus();
  }, []);

  // מייל אחרון שזכור מהתחברות קודמת
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY);
      if (last) setEmail(last);
    } catch {
      /* אין אחסון - מתחילים ריק */
    }
  }, []);

  // Escape סוגר (לא באמצע אימות ולא במסך ההצלחה)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'success') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  // התחברות שהושלמה מבחוץ (קישור מהמייל) - מדלגים ישר להצלחה
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
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
      } catch {
        /* לא קריטי */
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
        {/* כותרת ממותגת: רקע לילה עם זריחה עדינה + הלוגו */}
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
                טיול<span className="text-sunset">+</span>
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
              <label htmlFor="login-email" className="mt-5 block text-xs font-bold text-night/50">
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
                className="mt-1.5 w-full rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/30 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
              />
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
              <p className="mt-1.5 text-sm leading-relaxed text-night/60">
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
                  className="text-night/50 transition hover:text-night"
                >
                  → החלפת מייל
                </button>
                {resendIn > 0 ? (
                  <span className="text-night/40" aria-live="polite">
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
              <p className="mt-3 rounded-lg bg-night/[0.04] px-3 py-2 text-[11px] leading-relaxed text-night/50">
                לא רואים את המייל? בדקו את תיקיית הספאם, או לחצו על הקישור שבמייל -
                גם הוא מחבר אתכם.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div key="success" className="rise-in flex flex-col items-center py-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00a896]/15">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#007f76"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <h2 className="display mt-4 text-2xl text-night">מחוברים!</h2>
              <p className="mt-1 text-sm text-night/60">
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
            <p className="mt-5 border-t border-night/10 pt-3 text-center text-[11px] leading-relaxed text-night/40">
              ההתחברות יוצרת חשבון אם עוד אין לך אחד · נשמרים רק המייל והטיולים שלך
            </p>
          )}
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- שישה תאי קוד: input נסתר אחד מעל תאים מעוצבים ---------- */

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
      {/* ה-input האמיתי - בלתי נראה, סופג הקלדה, הדבקה ו-autofill של קוד */}
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
          stroke="#e03e27"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          {paths[icon]}
        </svg>
      </span>
      <span className="text-sm font-medium text-night/75">{text}</span>
    </div>
  );
}
