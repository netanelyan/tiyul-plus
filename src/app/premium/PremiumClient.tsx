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
 * **The subscription leads and the shared trip is its star** - Netanel,
 * 2026-08-17, reversing the earlier "the one-off check leads" arrangement. The
 * reversal is not a change of mind about honesty, it follows a change in the
 * product: the shared trip stopped being "friends vote on stops" and became the
 * place a group plans together (comments per stop, friends suggesting catalog
 * places, a date poll, RSVP). That is the only thing here nobody gets for free,
 * and it is the reason to subscribe - so it sits inside the lead card rather than
 * in a row of a comparison table. The one-off check keeps its own card below, for
 * people who want exactly one thing and no subscription.
 *
 * **The arithmetic stays open, and it now argues FOR the lead product**, which is
 * a coincidence rather than a design: a month of subscription (PREMIUM_PRICE_ILS)
 * costs less than a single check (PRICE_ILS) and the check is included in it. That
 * comparison was worth printing when the check led the page and it is still worth
 * printing now. It renders from the two constants and is CONDITIONAL - if the
 * prices ever cross it removes itself instead of becoming a lie. Every other
 * figure (the year total, two checks, the break-even in trips) is computed too,
 * never typed.
 *
 * **Free is stated loudly and repeatedly on purpose.** Planning, editing, the map,
 * the catalog, sharing to view, print and navigation are all free, and so is
 * *taking part* in somebody else's shared trip - joining, voting, commenting and
 * suggesting. Only creating the invite is paid. Saying that plainly removes the
 * objection ("so I would be asking five people to pay?") that would otherwise kill
 * the feature at the moment somebody considers using it, and the joiners are the
 * next users.
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

  /** The subscription CTA, rendered twice - under the star card and under the table. */
  const cta = (extraClass = '') =>
    isPremium ? (
      <p
        className={`rounded-xl bg-zest/20 px-3 py-2 text-center text-xs font-bold text-night ${extraClass}`}
      >
        ★ אתם בפרימיום - תודה שאתם איתנו
      </p>
    ) : (
      <div className={extraClass}>
        <button
          onClick={upgrade}
          disabled={busy}
          className="w-full rounded-xl bg-sunset px-6 py-3.5 font-bold text-cream transition hover:bg-sunset-deep disabled:opacity-60"
        >
          {busy ? 'רגע…' : `התחלת מנוי · ${PREMIUM_PRICE_ILS.toFixed(2)} ₪ לחודש`}
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-night/50">
          ביטול בלחיצה, בכל רגע · בלי התחייבות · התשלום דרך PayPal
        </p>
      </div>
    );

  return (
    <div className="rise-in mx-auto max-w-3xl">
      <div className="text-center">
        <p className="text-xs font-bold text-sunset-deep">מחירים</p>
        <h1 className="display mt-1 text-3xl text-night sm:text-4xl">
          לתכנן לבד זה חינם. לתכנן ביחד - זה המנוי.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-night/60">
          הסוכן, המסלול, המפה, השיתוף, ההדפסה והניווט - חינם, בלי כרטיס אשראי.
          המנוי פותח את הדבר האחד שאי אפשר לעשות לבד: לתכנן את הטיול עם כל מי
          שנוסע איתכם, במקום אחד.
        </p>
      </div>

      {/* ---------- The star: the subscription, built around the shared trip ---------- */}
      <div id="premium-plan" className="relative mt-9 scroll-mt-24 rounded-3xl bg-night p-6 ring-1 ring-night sm:p-7">
        <span className="absolute -top-3 end-5 rounded-full bg-zest px-3 py-1 text-xs font-black text-night">
          ★ המנוי
        </span>

        <h2 className="font-bold text-cream">טיול+ פרימיום</h2>
        <p className="mt-1 text-3xl font-black text-cream">
          {PREMIUM_PRICE_ILS.toFixed(2)} ₪
          <span className="text-sm font-semibold text-cream/60"> / לחודש</span>
        </p>

        {/* The shared trip IS the subscription's argument, so it lives inside the
            card rather than as a row in a table further down. */}
        <div className="mt-6 rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/15">
          <p className="text-xs font-bold text-zest">הכוכב של המנוי</p>
          <h3 className="mt-1 text-lg font-black text-cream">
            🤝 טיול משותף - מתכננים ביחד, במקום אחד
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-cream/75">
            שולחים קישור אחד. כל מי שנכנס רואה את הטיול חי - התמונות, התיאורים והמפה -
            וגם אחרי שתערכו אותו. ואז, במקום צילומי מסך בקבוצה:
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <li className="rounded-xl bg-night/40 p-3 ring-1 ring-cream/10">
              <p className="text-sm font-bold text-cream">👍 מצביעים על כל עצירה</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/60">
                אתם רואים בדיוק מה עבר ומה לא - לפני שסוגרים כרטיסים.
              </p>
            </li>
            <li className="rounded-xl bg-night/40 p-3 ring-1 ring-cream/10">
              <p className="text-sm font-bold text-cream">💬 כותבים למה</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/60">
                תגובה על כל עצירה ושיחה כללית לצד - &quot;היינו שם, לכו מוקדם&quot;
                נשמר על העצירה עצמה.
              </p>
            </li>
            <li className="rounded-xl bg-night/40 p-3 ring-1 ring-cream/10">
              <p className="text-sm font-bold text-cream">💡 מציעים מקומות</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/60">
                חבר בוחר מקום מהקטלוג ומסביר למה. אישור אחד שלכם - והוא נכנס לטיול.
              </p>
            </li>
            <li className="rounded-xl bg-night/40 p-3 ring-1 ring-cream/10">
              <p className="text-sm font-bold text-cream">📅 מסכמים תאריכים ומי מגיע</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/60">
                מציעים כמה תאריכים, כל אחד מסמן מה מתאים, ורואים את החפיפה ומי חסום.
              </p>
            </li>
          </ul>
          <p className="mt-3.5 rounded-lg bg-lagoon/20 px-3 py-2 text-xs font-semibold text-cream/90">
            לחברים זה חינם לגמרי - הם לא נרשמים למנוי ולא משלמים כלום. רק מי שיוצר את
            הקישור צריך מנוי.
          </p>
        </div>

        {/* The second paid feature, given the SAME treatment as the shared trip
            rather than a one-line tick: the subscription contains two products,
            and a reader should see both before the price sinks in. */}
        <div className="mt-4 rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/15">
          <p className="text-xs font-bold text-zest">וגם, כלול</p>
          <h3 className="mt-1 text-lg font-black text-cream">
            🛫 הבדיקה לפני הנסיעה - בלי הגבלה
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-cream/75">
            תכננתם לפני חודשיים, והטיול בעוד שבועיים. מה השתנה מאז? הבדיקה עונה על זה
            בבת אחת, על כל הטיול - {priceLabel()} לטיול לכל אחד אחר, וכאן לכל טיול
            שתתכננו:
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm text-cream/80 sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-zest">✓</span>
              <span>כל עצירה נבדקת מחדש מול הקטלוג</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-zest">✓</span>
              <span>רשומות הכשרות נקראות שוב</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-zest">✓</span>
              <span>סגירות וחגים מול התאריכים שלכם</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-zest">✓</span>
              <span>מסמך אחד לשמור, להדפיס או לשלוח</span>
            </li>
          </ul>
        </div>

        {/* The third thing is real but is not a product, so it stays a line */}
        <p className="mt-4 flex items-start gap-2 text-sm text-cream/80">
          <span className="mt-0.5 text-zest">✓</span>
          <span>
            <b className="text-cream">ומסלול אישי מובטח לסוכן</b> - מכסות יומיות גדולות
            בהרבה מהחינמיות, ובלי תלות בעומס של אף אחד אחר באתר
          </span>
        </p>

        {cta('mt-6')}
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
                והבדיקה כלולה בו. אז גם מי שרוצה רק את הבדיקה - עדיף לו להירשם לחודש
                ולבטל אחר כך. אנחנו אומרים את זה למרות שזה פחות כסף בשבילנו.
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
              - או כבר מהטיול הראשון, אם מתכננים אותו עם עוד אנשים.
            </span>
          </li>
        </ul>
      </div>

      {/*
        Below the subscription: what can be bought on its own. Today that is the
        check and only the check - the shared trip has no standalone price, and
        the section says so rather than leaving the reader to wonder. Inventing a
        price for it would be a business decision, not a page edit.
      */}
      <div className="mt-10 text-center">
        <h2 className="display text-2xl text-night">רוצים רק אחד מהם?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-night/60">
          אפשר גם בלי מנוי: הבדיקה לפני הנסיעה נמכרת בנפרד, לטיול אחד, בלי חשבון
          מתמשך ובלי התחייבות. הטיול המשותף קיים רק במנוי.
        </p>
      </div>

      <div className="mt-5 rounded-3xl bg-shell p-6 ring-1 ring-night/15">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-black text-night">🛫 בדיקה לפני הנסיעה, בנפרד</h3>
          <p className="text-2xl font-black text-night">
            {priceLabel()}
            <span className="text-sm font-semibold text-night/50"> / לטיול אחד</span>
          </p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-night/70">
          אותה בדיקה בדיוק שכלולה במנוי, לטיול אחד ובתשלום חד-פעמי:
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-night/70 sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sunset-deep">✓</span>
            <span>כל עצירה נבדקת מחדש מול הקטלוג - מה שהשתנה או ירד מסומן</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sunset-deep">✓</span>
            <span>רשומות הכשרות נקראות שוב, עם הפרטים העדכניים</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sunset-deep">✓</span>
            <span>סגירות, חגים ואירועים - מול התאריכים המדויקים שלכם</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sunset-deep">✓</span>
            <span>בדיקת סדר הימים והמסלול</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-sunset-deep">✓</span>
            <span>מסמך אחד נקי לשמור, להדפיס או לשלוח</span>
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/chat"
            className="rounded-xl bg-night px-6 py-3 font-bold text-cream transition hover:bg-night/85"
          >
            למסך הטיול שלי
          </Link>
          <span className="text-xs font-medium text-night/50">
            נקנית מתוך מסך הטיול, החל מ-21 יום לפני היציאה
          </span>
        </div>
      </div>

      {/* ---------- What free actually is, next to what the subscription adds ---------- */}
      <h2 className="display mt-10 text-center text-2xl text-night">מה יש בכל תוכנית</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
          {cta('mt-5')}
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
              המכסות של המנוי - זה יספיק לי?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              המכסות של המנוי הן יומיות, כמו בחינם - פשוט גדולות בהרבה, ומובטחות לכם
              בלי תלות בעומס באתר. הן קיימות כדי למנוע שימוש לרעה, לא כדי לעצור מישהו
              באמצע תכנון - ואם נתקלתם בקיר בתכנון אמיתי, כתבו לנו וזה ייפתר.
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
