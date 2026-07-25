'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { PLAN_FEATURE_ROWS, PREMIUM_PRICE_ILS } from '@/lib/plans';

/**
 * עמוד הפרימיום: השוואת תוכניות + שדרוג דרך Stripe Checkout.
 * שלושת המצבים הכנים:
 *  - לא מחוברים → קודם מתחברים (הכפתור בניווט).
 *  - מחוברים והתשלומים מחוברים → מעבר ל-Checkout.
 *  - התשלומים עוד לא מוגדרים → "ממש בקרוב", בלי כפתור מזויף.
 */
export default function PremiumClient() {
  const auth = useAuth();
  const isPremium = auth.profile?.plan === 'premium';
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function upgrade() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { ...(await authHeader()) },
      });
      const data = (await res.json()) as { url: string | null; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error === 'auth-required') setNotice('צריך להתחבר קודם - כפתור ההתחברות למעלה בניווט.');
      else if (data.error === 'already-premium') setNotice('אתם כבר בפרימיום 🎉');
      else if (data.error === 'not-configured')
        setNotice('ההרשמה לפרימיום נפתחת ממש בקרוב - התשלומים בשלבי חיבור אחרונים.');
      else setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } catch {
      setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise-in mx-auto max-w-3xl">
      <div className="text-center">
        <p className="text-xs font-bold text-sunset-deep">טיול+ פרימיום</p>
        <h1 className="display mt-1 text-3xl text-night sm:text-4xl">מתכננים בגדול? תכננו בלי מכסות</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-night/60">
          התוכנית החינמית מספיקה לטיול מלא ועשרות עריכות ביום. פרימיום נועד למי שמתכנן הרבה -
          משפחות שמתכננות כמה טיולים, מדריכים, וחובבי &quot;עוד שינוי אחד קטן&quot;.
        </p>
      </div>

      {/* השוואת התוכניות */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* חינם */}
        <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/10">
          <h2 className="font-bold text-night">חינם</h2>
          <p className="mt-1 text-2xl font-black text-night">
            0 ₪<span className="text-sm font-semibold text-night/50"> / לתמיד</span>
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-night/70">
            {PLAN_FEATURE_ROWS.map((row) => (
              <li key={row.label} className="flex items-start gap-2">
                <span className="mt-0.5 text-night/35">•</span>
                <span>
                  {row.label}: <b className="text-night/85">{row.free}</b>
                </span>
              </li>
            ))}
          </ul>
          {!isPremium && (
            <p className="mt-5 rounded-xl bg-night/5 px-3 py-2 text-center text-xs font-bold text-night/55">
              התוכנית הנוכחית שלכם
            </p>
          )}
        </div>

        {/* פרימיום */}
        <div className="relative rounded-3xl bg-night p-6 ring-1 ring-night">
          <span className="absolute -top-3 end-5 rounded-full bg-zest px-3 py-1 text-xs font-black text-night">
            ★ פרימיום
          </span>
          <h2 className="font-bold text-cream">פרימיום</h2>
          <p className="mt-1 text-2xl font-black text-cream">
            {PREMIUM_PRICE_ILS.toFixed(2)} ₪
            <span className="text-sm font-semibold text-cream/60"> / לחודש</span>
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
            {PLAN_FEATURE_ROWS.map((row) => (
              <li key={row.label} className="flex items-start gap-2">
                <span className="mt-0.5 text-zest">✓</span>
                <span>
                  {row.label}: <b className="text-cream">{row.premium}</b>
                </span>
              </li>
            ))}
          </ul>
          {isPremium ? (
            <p className="mt-5 rounded-xl bg-cream/10 px-3 py-2 text-center text-xs font-bold text-zest">
              ★ אתם בפרימיום - תודה שאתם איתנו
            </p>
          ) : (
            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-60"
            >
              {busy ? 'רגע…' : 'שדרוג לפרימיום'}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-zest/15 px-4 py-3 text-center text-sm font-semibold text-night">
          {notice}
        </p>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-night/45">
        התשלום מאובטח דרך Stripe - אנחנו לא שומרים פרטי אשראי. אפשר לבטל בכל רגע,
        והמכסה החינמית חוזרת לפעול כרגיל. המכסות נועדו למנוע שימוש לרעה - לא נעצור
        אף אחד באמצע תכנון טיול אמיתי.
      </p>
    </div>
  );
}
