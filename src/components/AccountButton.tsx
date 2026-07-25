'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * כפתור החשבון בניווט: התחברות בקוד למייל (בלי סיסמה), ותפריט קטן
 * למחובר. כשהחשבונות לא מוגדרים בסביבה - לא מרונדר כלום.
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
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/15 text-sm font-black text-sunset-deep ring-1 ring-sunset/30 transition hover:bg-sunset/25"
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
            <div className="absolute end-0 top-11 z-50 w-56 rounded-2xl bg-shell p-3 shadow-lg ring-1 ring-night/10">
              <p className="truncate px-2 text-xs font-semibold text-night/50">{email}</p>
              <p className="mt-1 px-2 text-xs leading-relaxed text-night/60">
                הטיולים שלך נשמרים בחשבון ומסתנכרנים בין מכשירים.
              </p>
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
        className="rounded-xl bg-night/5 px-3.5 py-2 text-sm font-semibold text-night/70 ring-1 ring-night/10 transition hover:bg-night/10"
      >
        התחברות
      </button>
      {open && <LoginModal onClose={() => setOpen(false)} />}
    </>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail() {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed) || busy) return;
    setBusy(true);
    setError(null);
    const res = await auth.sendCode(trimmed);
    setBusy(false);
    if (res.ok) setStep('code');
    else setError(res.error ?? 'משהו השתבש');
  }

  async function submitCode() {
    if (code.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    const res = await auth.verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (res.ok) onClose();
    else setError(res.error ?? 'משהו השתבש');
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button aria-label="סגירה" onClick={onClose} className="absolute inset-0 bg-night/45" />
      <div className="relative w-full max-w-sm rounded-3xl bg-shell p-6 shadow-xl ring-1 ring-night/10">
        <h2 className="display text-xl text-night">התחברות לטיול+</h2>
        {step === 'email' ? (
          <>
            <p className="mt-1.5 text-sm leading-relaxed text-night/60">
              בלי סיסמאות: מזינים מייל, מקבלים קוד חד-פעמי, והטיולים שלכם נשמרים
              ומסתנכרנים בין המכשירים.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
              placeholder="you@example.com"
              aria-label="כתובת מייל"
              dir="ltr"
              autoFocus
              className="mt-4 w-full rounded-xl border border-night/15 bg-cream px-4 py-3 text-night outline-none transition placeholder:text-night/35 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
            />
            <button
              onClick={submitEmail}
              disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
              className="mt-3 w-full rounded-xl bg-sunset px-4 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
            >
              {busy ? 'שולח קוד…' : 'שליחת קוד למייל'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-sm leading-relaxed text-night/60">
              שלחנו קוד בן 6 ספרות אל <span className="font-semibold" dir="ltr">{email.trim()}</span> - הזינו אותו כאן.
            </p>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={(e) => e.key === 'Enter' && submitCode()}
              placeholder="123456"
              aria-label="קוד אימות"
              dir="ltr"
              autoFocus
              className="mt-4 w-full rounded-xl border border-night/15 bg-cream px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-night outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-night/35 focus:border-sunset/50 focus:ring-4 focus:ring-sunset/15"
            />
            <button
              onClick={submitCode}
              disabled={busy || code.trim().length < 4}
              className="mt-3 w-full rounded-xl bg-sunset px-4 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-40"
            >
              {busy ? 'מאמת…' : 'התחברות'}
            </button>
            <button
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              className="mt-2 w-full text-center text-xs font-semibold text-night/50 transition hover:text-night"
            >
              → החלפת מייל או שליחת קוד חדש
            </button>
          </>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-sunset/10 px-3 py-2 text-sm font-semibold text-sunset-deep">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
