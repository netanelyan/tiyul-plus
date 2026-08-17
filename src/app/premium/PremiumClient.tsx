'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { PLAN_FEATURE_ROWS, PREMIUM_PRICE_ILS } from '@/lib/plans';
import { PRICE_ILS, priceLabel } from '@/lib/predeparture';

/**
 * The pricing page.
 *
 * **The one-off check leads the page** - Netanel's decision, and the arithmetic
 * behind it is shown openly rather than argued: anyone who works it out reaches
 * the same conclusion, so it reads as fair rather than as a sales trick. Every
 * figure is computed from the real constants, never typed, so a price change
 * updates the argument by itself.
 *
 * **The comparison the page must not hide.** A month of subscription
 * (PREMIUM_PRICE_ILS) currently costs LESS than a single check (PRICE_ILS), and
 * the check is included in it. So for a traveller with one trip who is willing to
 * cancel, the subscription is strictly the better buy - and a page that kept
 * recommending the one-off without saying so would be selling the more expensive
 * option to the people it claims to be advising. The comparison is rendered from
 * the two constants and is CONDITIONAL: if the prices ever cross, the sentence
 * disappears on its own instead of becoming a lie.
 *
 * **What the subscription actually contains, as of 2026-08-17**: the shared trip -
 * which is no longer "friends vote on stops" but a place to plan together
 * (comments per stop, friends suggesting catalog places, a date poll, RSVP) - and
 * the pre-departure check included. Creating the invite is premium; joining,
 * voting, commenting and suggesting are free on purpose, because the joiners are
 * the next users. Enforced on the server (/api/group), not in this page.
 *
 * The trip story was retired on 2026-08-17 - it rendered the itinerary on a public
 * URL and nothing on it came from the traveller. See the session log.
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
    a year of subscription against two checks, the break-even in trips per year,
    and whether one month is cheaper than one check. toFixed(2) - these are shekels.
  */
  const yearOfPremium = PREMIUM_PRICE_ILS * 12;
  const twoChecks = PRICE_ILS * 2;
  const breakEvenTripsPerYear = Math.ceil(yearOfPremium / PRICE_ILS);
  const monthBeatsOneCheck = PREMIUM_PRICE_ILS < PRICE_ILS;

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
          התכנון חינם. שני דברים עולים כסף.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-night/60">
          לתכנן עם הסוכן, לערוך, לשתף, להדפיס ולנווט - הכול בחינם, בלי כרטיס אשראי.
          בתשלום: בדיקה לפני היציאה לטיול מסוים, ומנוי חודשי למי שמתכנן עם עוד אנשים
          או מתכנן כל הזמן.
        </p>
      </div>

      {/* ---------- The lead product: the one-off check ---------- */}
      <div className="relative mt-8 rounded-3xl bg-night p-6 ring-1 ring-night">
        <span className="absolute -top-3 end-5 rounded-full bg-zest px-3 py-1 text-xs font-black text-night">
          🛫 לטיול אחד
        </span>
        <h2 className="font-bold text-cream">בדיקה לפני הנסיעה</h2>
        <p className="mt-1 text-2xl font-black text-cream">
          {priceLabel()}
          <span className="text-sm font-semibold text-cream/60"> / לטיול אחד</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-cream/70">
          תכננתם לפני חודשיים, והטיול בעוד שבועיים. מה השתנה מאז? זה מה שהבדיקה עונה
          עליו - בבת אחת, על כל הטיול.
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
          תשלום חד-פעמי מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי כרטיס.
        </p>
      </div>

      {/* ---------- The arithmetic, in the open ---------- */}
      <div className="mt-4 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        <p className="text-sm font-bold text-night">החשבון, בגלוי:</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-night/70">
          {monthBeatsOneCheck && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sunset-deep">←</span>
              <span>
                <b className="text-night">חודש מנוי עולה פחות מבדיקה אחת</b> (
                {PREMIUM_PRICE_ILS.toFixed(2)} ₪ מול {PRICE_ILS.toFixed(2)} ₪),
                והבדיקה כלולה בו. אז אם אתם עומדים לקנות בדיקה בודדת - שווה פשוט
                להירשם לחודש, ולבטל אחר כך אם לא צריך יותר. אנחנו אומרים את זה
                למרות שזה פחות כסף בשבילנו.{' '}
                <a href="#premium-plan" className="font-bold text-sunset-deep underline">
                  לפרטי המנוי ↓
                </a>
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-night/35">•</span>
            <span>
              שתי בדיקות בשנה, בלי מנוי: <b className="text-night">{twoChecks.toFixed(2)} ₪</b>.
              שנה שלמה של מנוי: <b className="text-night">{yearOfPremium.toFixed(2)} ₪</b>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-night/35">•</span>
            <span>
              מנוי שנתי מצדיק את עצמו סביב <b className="text-night">{breakEvenTripsPerYear} טיולים בשנה</b>{' '}
              - או מהטיול הראשון, אם אתם מתכננים אותו עם עוד אנשים.
            </span>
          </li>
        </ul>
      </div>

      {/* ---------- The subscription ---------- */}
      <div id="premium-plan" className="mt-10 scroll-mt-24 text-center">
        <h2 className="display text-2xl text-night">מתכננים עם עוד אנשים? בשביל זה המנוי</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-night/60">
          משפחה, חברים או קבוצה - הרגע שבו התכנון נשבר הוא בדרך כלל לא התכנון עצמו,
          אלא הניסיון לתאם אותו: צילומי מסך בקבוצה, שלושה תאריכים שאף אחד לא זוכר,
          ומישהו שאמר &quot;יש רעיון יותר טוב&quot; ואיש לא מצא איפה זה נכתב.
        </p>
      </div>

      {/*
        The shared trip is the reason to subscribe, so it gets the whole width and
        the concrete list - "friends vote" undersold it badly. Joining is free on
        purpose: the joiners are the next users.
      */}
      <div className="mt-6 rounded-3xl bg-shell p-6 ring-1 ring-night/15">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl" aria-hidden>
            🤝
          </span>
          <h3 className="text-lg font-black text-night">טיול משותף - מתכננים ביחד, במקום אחד</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-night/70">
          שולחים קישור אחד. כל מי שנכנס רואה את הטיול חי - עם התמונות, התיאורים
          והמפה - וגם אחרי שתערכו אותו. ואז, במקום ויכוח בוואטסאפ:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="rounded-2xl bg-cream/70 p-3 ring-1 ring-night/10">
            <p className="text-sm font-bold text-night">👍 מצביעים על כל עצירה</p>
            <p className="mt-0.5 text-xs leading-relaxed text-night/60">
              אתם רואים בדיוק מה עבר ומה לא - לפני שסוגרים כרטיסים.
            </p>
          </li>
          <li className="rounded-2xl bg-cream/70 p-3 ring-1 ring-night/10">
            <p className="text-sm font-bold text-night">💬 כותבים למה</p>
            <p className="mt-0.5 text-xs leading-relaxed text-night/60">
              תגובה על כל עצירה, ושיחה כללית לצד - &quot;היינו שם, לכו מוקדם&quot;
              נשמר על העצירה עצמה.
            </p>
          </li>
          <li className="rounded-2xl bg-cream/70 p-3 ring-1 ring-night/10">
            <p className="text-sm font-bold text-night">💡 מציעים מקומות</p>
            <p className="mt-0.5 text-xs leading-relaxed text-night/60">
              חבר בוחר מקום מהקטלוג ומסביר למה. אישור אחד שלכם - והוא נכנס לטיול.
            </p>
          </li>
          <li className="rounded-2xl bg-cream/70 p-3 ring-1 ring-night/10">
            <p className="text-sm font-bold text-night">📅 מסכמים תאריכים ומי מגיע</p>
            <p className="mt-0.5 text-xs leading-relaxed text-night/60">
              מציעים כמה תאריכים, כל אחד מסמן מה מתאים, ורואים את החפיפה ומי חסום.
            </p>
          </li>
        </ul>
        <p className="mt-4 rounded-xl bg-lagoon/10 px-3 py-2 text-xs font-semibold text-night/75">
          לחברים זה חינם לגמרי - הם לא נרשמים למנוי ולא משלמים כלום. רק מי שיוצר
          את הקישור צריך מנוי.
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-shell p-5 ring-1 ring-night/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl" aria-hidden>
            🛫
          </span>
          <h3 className="font-bold text-night">והבדיקה לפני הנסיעה - כלולה</h3>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-night/60">
          {priceLabel()} לטיול לכל אחד אחר, כלולה במנוי בלי הגבלה - לכל טיול שתתכננו,
          כל חודש.
        </p>
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
        <div className="rounded-3xl bg-shell p-6 ring-2 ring-sunset/40">
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
            <>
              <button
                onClick={upgrade}
                disabled={busy}
                className="mt-5 w-full rounded-xl bg-sunset px-6 py-3 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-60"
              >
                {busy ? 'רגע…' : `התחלת מנוי · ${PREMIUM_PRICE_ILS.toFixed(2)} ₪ לחודש`}
              </button>
              <p className="mt-2 text-center text-[11px] font-medium text-night/50">
                ביטול בלחיצה, בכל רגע · בלי התחייבות
              </p>
            </>
          )}
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-zest/15 px-4 py-3 text-center text-sm font-semibold text-night">
          {notice}
        </p>
      )}

      {/* ---------- The questions people actually ask before paying ---------- */}
      <div className="mt-10">
        <h2 className="display text-center text-xl text-night">שאלות שנשאלות לפני שמשלמים</h2>
        <div className="mt-4 space-y-3">
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              מה בעצם נשאר חינם?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              כמעט הכול: שיחה עם הסוכן, בניית מסלול, עריכה, המפה, קטלוג היעדים ושכבת
              הכשרות, קישור שיתוף לצפייה, הדפסה ו-PDF, וניווט לכל יום. גם להצטרף לטיול
              משותף של מישהו אחר, להצביע, להגיב ולהציע מקומות - הכול חינם. בתשלום: יצירת
              הטיול המשותף, והבדיקה לפני הנסיעה.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              החברים שלי צריכים לשלם או להירשם?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              לא לשלם. הם כן מתחברים עם המייל שלהם (קוד חד-פעמי, בלי סיסמה) - רק כדי
              שנדע מי הצביע מה, ושכל אחד יצביע פעם אחת.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              מה קורה לטיולים שלי אם אבטל?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              כלום. הטיולים נשארים, ממשיכים להיערך ולהישלח כרגיל, והחשבון חוזר לתוכנית
              החינמית. מה שנסגר הוא יצירת טיול משותף חדש והבדיקה הכלולה.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              המכסות במנוי חודשיות - זה יספיק לי?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              הן מחושבות סביב שני טיולים אמיתיים בחודש, כולל הרבה מקום לעריכות ושאלות
              באמצע. הן קיימות כדי למנוע שימוש לרעה, לא כדי לעצור מישהו באמצע תכנון -
              ואם נתקלתם בקיר בתכנון אמיתי, כתבו לנו וזה ייפתר.
            </p>
          </details>
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-night/45">
        התשלום מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי אשראי. את המנוי אפשר
        לבטל בכל רגע והתוכנית החינמית חוזרת לפעול כרגיל.{' '}
        <Link href="/refunds" className="underline hover:text-night/70">
          ביטולים והחזרים
        </Link>
        .
      </p>
    </div>
  );
}
