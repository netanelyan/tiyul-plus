'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import Logo from '@/components/Logo';

/**
 * כפתור החשבון בניווט: התחברות בקוד למייל (בלי סיסמה), ותפריט קטן
 * למחובר. כשהחשבונות לא מוגדרים בסביבה - לא מרונדר כלום.
 *
 * חוויית הקוד: שדה ספרות גדול, שליחה אוטומטית כשהקוד מלא, ספירה
 * לאחור לשליחה חוזרת, ותזכורת לבדוק ספאם. אם המשתמש לוחץ על הקישור
 * שבמייל במקום להזין קוד - supabase-js קולט את הסשן מה-URL וההתחברות
 * מסתיימת מעצמה (בתנאי ש-Site URL מוגדר נכון בפרויקט).
 */
export default function AccountButton() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ההתחברות הושלמה (גם דרך קישור מהמייל) - סוגרים את המודל אם פתוח
  useEffect(() => {
    if (auth.user) setOpen(false);
  }, [auth.user]);

  if (!auth.enabled || !auth.ready) return null;

  if (auth.user) {
    const email = auth.user.email ?? '';
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset text-sm font-black text-cream shadow-sm ring-2 ring-sunset/25 transition hover:bg-sunset-deep"
          title={email}
        >
          {(email[0] ?? 'א').toUpperCase()}
        </button>
        {menuOpen && (
          <>
            <button
              aria-label="סגירה"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute end-0 top-11 z-50 w-64 rounded-2xl bg-shell p-3 shadow-lg ring-1 ring-night/10">
              <div className="flex items-center gap-2.5 px-2 py-1">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunset/15 text-sm font-black text-sunset-deep">
                  {(email[0] ?? 'א').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-night" dir="ltr">
                    {email}
                  </p>
                  <p className="text-[11px] font-medium text-[#007f76]">
                    ✓ הטיולים מסתנכרנים בין המכשירים
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  void auth.signOut();
                  setMenuOpen(false);
                }}
                className="mt-2 w-full rounded-xl bg-night/5 px-3 py-2 text-start text-sm font-semibold text-night/70 transition hover:bg-night/10"
              >
                התנתקות
              </button>
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

const RESEND_SECONDS = 30;

function LoginModal({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const submittingRef = useRef(false);

  // ספירה לאחור לשליחה חוזרת
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
      setStep('code');
      setCode('');
      setResendIn(RESEND_SECONDS);
    } else setError(res.error ?? 'משהו השתבש');
  }

  async function submitCode(value?: string) {
    const token = (value ?? code).trim();
    if (token.length !== 6 || busy || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    const res = await auth.verifyCode(email.trim(), token);
    setBusy(false);
    submittingRef.current = false;
    if (res.ok) onClose();
    else {
      setError(res.error ?? 'משהו השתבש');
      setCode('');
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button aria-label="סגירה" onClick={onClose} className="absolute inset-0 bg-night/50 backdrop-blur-[2px]" />
      <div className="rise-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-shell shadow-2xl ring-1 ring-night/10">
        {/* פס מותג עליון */}
        <div className="h-1.5 w-full bg-gradient-to-l from-sunset via-sunset to-zest" aria-hidden />
        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-lg font-bold text-night">
              טיול<span className="text-sunset">+</span>
            </span>
            <button
              onClick={onClose}
              aria-label="סגירה"
              className="ms-auto flex h-8 w-8 items-center justify-center rounded-full text-night/40 transition hover:bg-night/5 hover:text-night"
            >
              ✕
            </button>
          </div>

          {step === 'email' ? (
            <>
              <h2 className="display mt-5 text-2xl text-night">מתחברים בקליק</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-night/60">
                בלי סיסמאות. מזינים מייל, מקבלים קוד בן 6 ספרות - והטיולים שלכם
                נשמרים ועוברים איתכם לכל מכשיר.
              </p>
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
                autoFocus
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/30 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
              />
              <button
                onClick={sendCode}
                disabled={busy || !emailValid}
                className="mt-4 w-full rounded-xl bg-sunset px-4 py-3 font-bold text-cream shadow-sm transition hover:bg-sunset-deep disabled:opacity-40"
              >
                {busy ? 'שולח…' : 'שליחת קוד התחברות'}
              </button>
            </>
          ) : (
            <>
              <h2 className="display mt-5 text-2xl text-night">הקוד בדרך אליך</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-night/60">
                שלחנו קוד בן 6 ספרות אל{' '}
                <span className="font-semibold text-night" dir="ltr">
                  {email.trim()}
                </span>
                . לא רואים? שווה להציץ בספאם.
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (v.length === 6) void submitCode(v); // שליחה אוטומטית
                }}
                placeholder="● ● ● ● ● ●"
                aria-label="קוד אימות בן 6 ספרות"
                dir="ltr"
                autoFocus
                className="mt-5 w-full rounded-xl border border-night/15 bg-cream px-4 py-3.5 text-center text-2xl font-black tracking-[0.45em] text-night outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-widest placeholder:text-night/25 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
              />
              <button
                onClick={() => submitCode()}
                disabled={busy || code.length !== 6}
                className="mt-4 w-full rounded-xl bg-sunset px-4 py-3 font-bold text-cream shadow-sm transition hover:bg-sunset-deep disabled:opacity-40"
              >
                {busy ? 'מאמת…' : 'התחברות'}
              </button>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold">
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
                  <span className="text-night/40">שליחה חוזרת בעוד {resendIn} שניות</span>
                ) : (
                  <button onClick={sendCode} disabled={busy} className="text-sunset-deep transition hover:underline">
                    שליחת קוד חדש
                  </button>
                )}
              </div>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-sunset/10 px-3 py-2.5 text-sm font-semibold text-sunset-deep">
              {error}
            </p>
          )}
          <p className="mt-5 border-t border-night/10 pt-3 text-center text-[11px] leading-relaxed text-night/40">
            ההתחברות יוצרת חשבון אם עוד אין לך אחד · אנחנו שומרים רק את המייל ואת
            הטיולים שלך
          </p>
        </div>
      </div>
    </div>
  );
}
