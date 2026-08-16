'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import { PLAN_FEATURE_ROWS, PREMIUM_PRICE_ILS } from '@/lib/plans';
import { PRICE_ILS, priceLabel } from '@/lib/predeparture';

/**
 * עמוד המחירים. **המוצר המוביל הוא הבדיקה החד-פעמית, לא המנוי** -
 * החלטת נתנאל, והחשבון שמאחוריה מוצג בעמוד עצמו בגלוי: מי שנוסע
 * פעם-פעמיים בשנה משלם על שתי בדיקות ~רבע ממחיר שנת מנוי, ויעשה נכון
 * אם יבחר בהן. המנוי הוא אופציה משנית, ממוענת במילים מפורשות למי
 * שמתכנן כל הזמן - משפחות עם כמה טיולים בשנה, מדריכים, מארגני קבוצות.
 * "המסלול המובטח" אמיתי אבל לא מוביל את העמוד: הערך שלו בלתי-נראה עד
 * שיש מספיק תנועה שממצה את התקציב היומי, ולפני השקה זה אף אחד.
 *
 * הצגת החשבון בגלוי היא הפואנטה: מי שיעשה את החשבון לבד יגיע לאותה
 * מסקנה, אז עדיף שנציג אותו אנחנו - זה קורא כהוגן ולא כתרגיל מכירה.
 * המספרים מחושבים מהקבועים האמיתיים, לא מוקלדים - שינוי מחיר מעדכן
 * את החשבון מעצמו.
 *
 * ## מצב התשלומים, נכון ל-2026-08-16
 * גם הבדיקה החד-פעמית וגם המנוי עוברים דרך PayPal: `/api/billing/checkout`
 * יוצר PayPal Subscription (`server/paypalSubs.ts`) ומחזיר קישור אישור;
 * ההפעלה בפועל קורית רק ב-webhook המאומת. Stripe נשאר בקוד כמסלול
 * ירושה למקרה שיחובר אי פעם - PayPal קודם.
 */
export default function PremiumClient() {
  const auth = useAuth();
  const isPremium = auth.profile?.plan === 'premium';
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /*
    החשבון שקונה עושה בראש, עשוי מהקבועים עצמם: שנת מנוי מול שתי
    בדיקות, ונקודת האיזון בטיולים-לשנה. toFixed(2) כי אלה שקלים.
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

      {/* ---------- המוצר המוביל: הבדיקה החד-פעמית ---------- */}
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

      {/* ---------- החשבון, בגלוי ---------- */}
      <div className="mt-4 rounded-2xl bg-shell p-4 ring-1 ring-night/10">
        <p className="text-sm leading-relaxed text-night/70">
          <b className="text-night">החשבון, בגלוי:</b> נוסעים פעם-פעמיים בשנה? שתי בדיקות עולות{' '}
          <b className="text-night">{twoChecks.toFixed(2)} ₪</b>. שנה של מנוי עולה{' '}
          <b className="text-night">{yearOfPremium.toFixed(2)} ₪</b>. לרוב המטיילים הבדיקה
          החד-פעמית משתלמת בהרבה - וזו גם ההמלצה שלנו. המנוי מתחיל להצדיק את עצמו סביב{' '}
          {breakEvenTripsPerYear} טיולים בשנה, או כשצריכים את חבילת הסוכן החודשית שלו.
        </p>
      </div>

      {/* ---------- המנוי: אופציה משנית, למי שמתכנן כל הזמן ---------- */}
      <div className="mt-10 text-center">
        <h2 className="display text-2xl text-night">מתכננים כל הזמן? בשביל זה המנוי</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-night/60">
          טיול+ פרימיום מיועד למי שהתכנון אצלו שוטף: משפחות שמתכננות כמה טיולים בשנה, מדריכים
          ומלווי קבוצות, מארגני טיולים. הבדיקה כלולה בלי הגבלה, ויש חבילת סוכן חודשית משלכם.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* חינם */}
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

        {/* פרימיום */}
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
