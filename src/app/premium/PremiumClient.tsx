'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { PLAN_FEATURE_ROWS, PREMIUM_PRICE_ILS } from '@/lib/plans';
import { PRICE_ILS, priceLabel } from '@/lib/predeparture';

/**
 * The pricing page. **The lead product is the one-off check, not the
 * subscription** - Netanel's decision, and the arithmetic behind it is shown
 * openly on the page itself: someone who travels once or twice a year pays about
 * a quarter of a year's subscription for two checks, and would be right to choose
 * them. The subscription is a secondary option, addressed in explicit words to
 * people who plan all the time - families with several trips a year, guides,
 * group organisers. "The guaranteed lane" is real but does not lead the page: its
 * value is invisible until there is enough traffic to exhaust the daily budget,
 * and before launch that is nobody.
 *
 * Since 2026-08-17 the subscription also has **content of its own**, not just
 * quotas: the trip story (the trip becomes a public page with the itinerary and
 * photos) and the group trip (friends join by link, see the trip live and vote on
 * stops). Creating is premium; viewing and joining are free on purpose - the
 * viewers and joiners are the next users. Both features are enforced on the
 * server (/api/story, /api/group).
 *
 * Showing the arithmetic openly is the point: anyone who works it out themselves
 * reaches the same conclusion, so it is better that we present it - that reads as
 * fair rather than as a sales trick. The numbers are computed from the real
 * constants, not typed in - a price change updates the arithmetic by itself.
 *
 * ## Payment status, as of 2026-08-16
 * Both the one-off check and the subscription go through PayPal:
 * `/api/billing/checkout` creates a PayPal Subscription (`server/paypalSubs.ts`)
 * and returns an approval link; activation itself happens only in the verified
 * webhook. Stripe stays in the code as a legacy path in case it is ever connected
 * - PayPal comes first.
 */
export default function PremiumClient() {
  const auth = useAuth();
  const isPremium = auth.profile?.plan === 'premium';
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /*
    The arithmetic a buyer does in their head, made from the constants themselves:
    a year of subscription against two checks, and the break-even in trips per
    year. toFixed(2) because these are shekels.
  */
  const yearOfPremium = PREMIUM_PRICE_ILS * 12;
  const twoChecks = PRICE_ILS * 2;
  const breakEvenTripsPerYear = Math.ceil(yearOfPremium / PRICE_ILS);

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
      else if (data.error === 'sandbox-blocked')
        setNotice('ההרשמה כבויה כרגע באתר החי (מצב בדיקה) - ממש בקרוב.');
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
        <p className="text-xs font-bold text-sunset-deep">מחירים</p>
        <h1 className="display mt-1 text-3xl text-night sm:text-4xl">
          התכנון חינם. לפני היציאה - בדיקה אחת.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-night/60">
          לתכנן עם הסוכן, לערוך, לשתף ולהדפיס - הכול בחינם. מה שכן עולה כסף: בדיקה לפני
          הנסיעה לטיול ספציפי, ומנוי חודשי למי שמתכנן כל הזמן.
        </p>
      </div>

      {/* ---------- The lead product: the one-off check ---------- */}
      <div className="relative mt-8 rounded-3xl bg-night p-6 ring-1 ring-night">
        <span className="absolute -top-3 end-5 rounded-full bg-zest px-3 py-1 text-xs font-black text-night">
          🛫 לרוב המטיילים
        </span>
        <h2 className="font-bold text-cream">בדיקה לפני הנסיעה</h2>
        <p className="mt-1 text-2xl font-black text-cream">
          {priceLabel()}
          <span className="text-sm font-semibold text-cream/60"> / לטיול אחד</span>
        </p>
        <ul className="mt-4 space-y-2.5 text-sm text-cream/80">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-zest">✓</span>
            <span>כל עצירה בטיול נבדקת מחדש מול הקטלוג - מה שהשתנה או ירד מסומן</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-zest">✓</span>
            <span>רשומות הכשרות נקראות שוב, עם הפרטים העדכניים</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-zest">✓</span>
            <span>סגירות, חגים ואירועים - מול התאריכים המדויקים שלכם</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-zest">✓</span>
            <span>בדיקת סדר הימים והמסלול</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-zest">✓</span>
            <span>מסמך אחד נקי לשמור, להדפיס או לשלוח</span>
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/chat"
            className="rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep"
          >
            למסך הטיול שלי
          </Link>
          <span className="text-xs font-medium text-cream/55">
            נקנית מתוך מסך הטיול, החל מ-21 יום לפני היציאה
          </span>
        </div>
        <p className="mt-3 text-[11px] font-medium leading-relaxed text-cream/45">
          תשלום חד-פעמי מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי כרטיס. למנויי
          פרימיום הבדיקה כלולה בלי תשלום נוסף.
        </p>
      </div>

      {/* ---------- The arithmetic, in the open ---------- */}
      <div className="mt-4 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        <p className="text-sm leading-relaxed text-night/70">
          <b className="text-night">החשבון, בגלוי:</b> נוסעים פעם-פעמיים בשנה? שתי בדיקות עולות{' '}
          <b className="text-night">{twoChecks.toFixed(2)} ₪</b>. שנה של מנוי עולה{' '}
          <b className="text-night">{yearOfPremium.toFixed(2)} ₪</b>. לרוב המטיילים הבדיקה
          החד-פעמית משתלמת בהרבה - וזו גם ההמלצה שלנו. המנוי מתחיל להצדיק את עצמו סביב{' '}
          {breakEvenTripsPerYear} טיולים בשנה - או כשרוצים את מה שיש רק בו: סיפור הטיול, טיול
          משותף עם חברים, וחבילת סוכן חודשית משלכם.
        </p>
      </div>

      {/* ---------- The subscription: a secondary option, for people who plan all the time ---------- */}
      <div className="mt-10 text-center">
        <h2 className="display text-2xl text-night">מתכננים כל הזמן? בשביל זה המנוי</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-night/60">
          טיול+ פרימיום מיועד למי שהתכנון אצלו שוטף: משפחות שמתכננות כמה טיולים בשנה, מדריכים
          ומלווי קבוצות, מארגני טיולים. חוץ מהמכסות - יש בו דברים שקיימים רק למנויים.
        </p>
      </div>

      {/*
        The three features that exist only in the subscription - content, not
        quotas. Viewing and joining are free on purpose (the distribution channel);
        what is bought is the creating.
      */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
          <p className="text-2xl" aria-hidden>
            📖
          </p>
          <h3 className="mt-2 font-bold text-night">סיפור הטיול</h3>
          <p className="mt-1 text-sm leading-relaxed text-night/60">
            הטיול הופך לעמוד ציבורי יפה עם המסלול, הימים והתמונות שלכם - קישור אחד לשלוח
            למשפחה ולחברים. כל אחד יכול לצפות; רק מנויים יוצרים.
          </p>
        </div>
        <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
          <p className="text-2xl" aria-hidden>
            🤝
          </p>
          <h3 className="mt-2 font-bold text-night">טיול משותף</h3>
          <p className="mt-1 text-sm leading-relaxed text-night/60">
            שולחים קישור הזמנה, החברים מצטרפים בחינם, רואים את הטיול חי ומצביעים על כל עצירה
            - ואתם רואים מה עבר ומה לא לפני שסוגרים.
          </p>
        </div>
        <div className="rounded-2xl bg-shell p-5 ring-1 ring-night/10">
          <p className="text-2xl" aria-hidden>
            🛫
          </p>
          <h3 className="mt-2 font-bold text-night">הבדיקה כלולה</h3>
          <p className="mt-1 text-sm leading-relaxed text-night/60">
            הבדיקה לפני הנסיעה - {priceLabel()} לטיול לכל אחד אחר - כלולה במנוי בלי הגבלה,
            לכל טיול שתתכננו.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/10">
          <h3 className="font-bold text-night">חינם</h3>
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

        {/* Premium */}
        <div className="rounded-3xl bg-shell p-6 ring-1 ring-night/15">
          <h3 className="font-bold text-night">★ פרימיום</h3>
          <p className="mt-1 text-2xl font-black text-night">
            {PREMIUM_PRICE_ILS.toFixed(2)} ₪
            <span className="text-sm font-semibold text-night/50"> / לחודש</span>
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-night/70">
            {PLAN_FEATURE_ROWS.map((row) => (
              <li key={row.label} className="flex items-start gap-2">
                <span className="mt-0.5 text-sunset-deep">✓</span>
                <span>
                  {row.label}: <b className="text-night/85">{row.premium}</b>
                </span>
              </li>
            ))}
          </ul>
          {isPremium ? (
            <p className="mt-5 rounded-xl bg-zest/20 px-3 py-2 text-center text-xs font-bold text-night">
              ★ אתם בפרימיום - תודה שאתם איתנו
            </p>
          ) : (
            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-night px-6 py-3 font-bold text-cream transition hover:bg-night/85 disabled:opacity-60"
            >
              {busy ? 'רגע…' : 'הרשמה לפרימיום'}
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
        התשלום מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי אשראי. את המנוי אפשר לבטל
        בכל רגע, והתוכנית החינמית חוזרת לפעול כרגיל. המכסות נועדו למנוע שימוש לרעה - לא נעצור
        אף אחד באמצע תכנון טיול אמיתי.
      </p>
    </div>
  );
}
