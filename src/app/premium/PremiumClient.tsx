'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authHeader } from '@/lib/auth/client';
import {
  PLAN_FEATURE_ROWS,
  PREMIUM_PRICE_ILS,
  PRO_PRICE_ILS,
  PRO_TRIPS_PER_MONTH,
  planAtLeast,
  type PaidPlan,
  type Plan,
} from '@/lib/plans';
import { PRICE_ILS, priceLabel } from '@/lib/predeparture';
import AgentEnquiryForm from './AgentEnquiryForm';

/**
 * Shekels, printed the way people write them: 19.90 keeps its agorot, 89 does
 * not grow a ".00". Without this the pro card headed "89 ₪" carried a button
 * saying "89.00 ₪" - the same price in two shapes, three centimetres apart.
 */
const ils = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/**
 * The pricing page. **Four options**, and the layout is the argument.
 *
 * ## Why four is a layout problem before it is a copy problem
 *
 * Three consumer plans plus a business card plus a one-off product is five
 * things to buy, and at 390px five full-width slabs is a page nobody reaches
 * the bottom of. So:
 *
 * 1. **A "which one is you" strip at the very top** - four one-line rows, each
 *    an anchor into its own section. On a phone that is one screen that lets
 *    somebody skip the two plans they were never going to buy. It is not a
 *    summary; every row states the price it links to, so it is also the
 *    fastest honest answer to "what does this cost".
 * 2. **The three consumer plans in one grid**, and on a phone the recommended
 *    one is ordered FIRST (`order-first sm:order-none`). On desktop the middle
 *    column is the privileged position; on a phone "middle" means nothing and
 *    first means everything. Nothing is hidden - free is immediately below.
 * 3. **The agent card is its own section below them**, because it is not a
 *    fourth column: it has no price, no button that charges anything, and it
 *    is aimed at a different reader entirely.
 * 4. **The full row-by-row comparison is a `<details>`.** Each plan card
 *    already carries what distinguishes it; ten rows times three columns is
 *    supplementary, and on a phone it is roughly a thousand pixels of it.
 *
 * ## The check is not buried, and that is a deliberate refusal
 *
 * Netanel: "for someone travelling once or twice a year it is genuinely the
 * best value, and the page should not bury it to push subscriptions." So it
 * keeps a full-width card of its own with the same visual weight as a plan,
 * and the open arithmetic below it states plainly which option wins at which
 * travel frequency - including the case where the answer costs us money (a
 * month of subscription is cheaper than one check AND contains it, so somebody
 * who wants only a check should subscribe for a month and cancel).
 *
 * Every figure on this page is computed from `PREMIUM_PRICE_ILS`,
 * `PRO_PRICE_ILS` and `PRICE_ILS`. None is typed, and the comparison that
 * depends on their ordering renders conditionally, so a price change cannot
 * leave a false sentence behind.
 *
 * ## What is deliberately NOT claimed for the agent card
 *
 * No white-label, no client billing, no CRM, no multi-seat accounts, no
 * branded export, no screenshots of an agent dashboard - none of those exist.
 * The card lists what the product does today and says plainly that the rest is
 * built to fit and priced per business.
 */
export default function PremiumClient() {
  const auth = useAuth();
  const plan: Plan = auth.profile?.plan ?? 'free';
  const [busy, setBusy] = useState<PaidPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [agentFormOpen, setAgentFormOpen] = useState(false);

  /*
    The arithmetic a buyer does in their head, from the constants themselves.
    Formatted through `ils` so a round price does not grow agorot it does not have.
  */
  const yearOfPremium = PREMIUM_PRICE_ILS * 12;
  const yearOfPro = PRO_PRICE_ILS * 12;
  const twoChecks = PRICE_ILS * 2;
  const breakEvenTripsPerYear = Math.ceil(yearOfPremium / PRICE_ILS);
  const monthBeatsOneCheck = PREMIUM_PRICE_ILS < PRICE_ILS;
  const proPerTrip = PRO_PRICE_ILS / PRO_TRIPS_PER_MONTH;

  async function upgrade(wanted: PaidPlan) {
    if (busy) return;
    setBusy(wanted);
    setNotice(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ plan: wanted }),
      });
      const data = (await res.json()) as { url: string | null; error?: string };
      if (data.url) {
        // assign() rather than writing location.href - same navigation, and it is
        // a method call rather than a mutation of a value defined outside the
        // component, which the react-hooks immutability rule (correctly) refuses.
        window.location.assign(data.url);
        return;
      }
      if (data.error === 'auth-required')
        setNotice('צריך להתחבר קודם - כפתור ההתחברות למעלה בניווט.');
      else if (data.error === 'already-premium') setNotice('אתם כבר בתוכנית הזאת 🎉');
      else if (data.error === 'switch-requires-support')
        // Not a failure and not a fob-off: creating a second PayPal subscription
        // would charge them twice, so the switch is done by hand until the
        // revise flow exists. Saying that is better than taking the money.
        setNotice(
          'מעבר בין מנוי קיים למנוי אחר אנחנו עושים ידנית, כדי שלא תחויבו פעמיים בטעות. כתבו לנו בדף יצירת הקשר ונעביר אתכם - בלי חיוב כפול ובלי לאבד ימים ששילמתם עליהם.',
        );
      else if (data.error === 'sandbox-blocked')
        setNotice('ההרשמה כבויה כרגע באתר החי (מצב בדיקה) - ממש בקרוב.');
      else if (data.error === 'not-configured')
        setNotice('ההרשמה נפתחת ממש בקרוב - התשלומים בשלבי חיבור אחרונים.');
      else setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } catch {
      setNotice('משהו השתבש בדרך לתשלום - נסו שוב עוד רגע.');
    } finally {
      setBusy(null);
    }
  }

  /**
   * The subscribe button for one plan. Three states, and the third is the one
   * worth having: somebody already ON a higher plan must not be invited to
   * "upgrade" downwards, so that button says what is true instead.
   */
  const cta = (wanted: PaidPlan, extraClass = '') => {
    if (plan === wanted)
      return (
        <p
          className={`rounded-xl bg-zest/25 px-3 py-2.5 text-center text-xs font-bold text-night ${extraClass}`}
        >
          ★ זו התוכנית שלכם - תודה שאתם איתנו
        </p>
      );
    if (planAtLeast(plan, wanted))
      return (
        <p
          className={`rounded-xl bg-night/5 px-3 py-2.5 text-center text-xs font-bold text-night/55 ${extraClass}`}
        >
          כבר כלול בתוכנית שלכם
        </p>
      );
    const price = wanted === 'pro' ? PRO_PRICE_ILS : PREMIUM_PRICE_ILS;
    const dark = wanted === 'pro';
    return (
      <div className={extraClass}>
        <button
          onClick={() => void upgrade(wanted)}
          disabled={busy !== null}
          className={`w-full rounded-xl px-5 py-3.5 font-bold text-cream transition disabled:opacity-60 ${
            dark ? 'bg-night hover:bg-night/85' : 'bg-sunset hover:bg-sunset-deep'
          }`}
        >
          {busy === wanted
            ? 'רגע…'
            : plan === 'free'
              ? `התחלת מנוי · ${ils(price)} ₪ לחודש`
              : `מעבר לפרו · ${ils(price)} ₪ לחודש`}
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-night/50">
          ביטול בלחיצה, בכל רגע · בלי התחייבות · התשלום דרך PayPal
        </p>
      </div>
    );
  };

  return (
    <div className="rise-in mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-xs font-bold text-sunset-deep">מחירים</p>
        <h1 className="display mt-1 text-3xl text-night sm:text-4xl">
          התכנון חינם. משלמים רק על מה שבאמת צריך.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-night/60">
          הסוכן, המסלול, המפה, הקטלוג, השיתוף לצפייה, ההדפסה והניווט - חינם, בלי כרטיס אשראי. מה
          שכן עולה כסף: לתכנן ביחד עם כל מי שנוסע איתכם, ובדיקה של הטיול לפני היציאה.
        </p>
      </div>

      {/* ---------- Which one is you: four rows, four anchors ----------
          The whole point of this block is the phone. Four options is a lot of
          scrolling before you know which one is yours, and every row here
          carries its own price so the strip also answers "what does it cost"
          without anybody scrolling at all. */}
      <nav aria-label="בחירה מהירה" className="mt-7 grid gap-2 sm:grid-cols-2">
        {[
          {
            href: '#plan-free',
            emoji: '🧭',
            title: 'מתכננים לבד',
            price: 'חינם',
            who: 'הסוכן, המפה והמסלול - בלי לשלם כלום',
          },
          {
            href: '#plan-premium',
            emoji: '🤝',
            title: 'מתכננים עם עוד אנשים',
            price: `${ils(PREMIUM_PRICE_ILS)} ₪ לחודש`,
            who: 'פרימיום - הכי מתאים לרוב האנשים',
            highlight: true,
          },
          {
            href: '#plan-pro',
            emoji: '⚡',
            title: 'מתכננים כל הזמן',
            price: `${ils(PRO_PRICE_ILS)} ₪ לחודש`,
            who: `פרו - עד ${PRO_TRIPS_PER_MONTH} טיולים מלאים בחודש`,
          },
          {
            href: '#agents',
            emoji: '🧳',
            title: 'מתכננים לאחרים',
            price: 'לפי העסק',
            who: 'סוכני נסיעות ומארגני טיולים',
          },
        ].map((r) => (
          <a
            key={r.href}
            href={r.href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition ${
              r.highlight
                ? 'bg-sunset/10 ring-sunset/40 hover:bg-sunset/15'
                : 'bg-shell ring-night/10 hover:bg-cream'
            }`}
          >
            <span aria-hidden className="text-xl">
              {r.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-night">{r.title}</span>
              <span className="block text-xs font-medium text-night/55">{r.who}</span>
            </span>
            <span className="shrink-0 text-xs font-black text-sunset-deep">{r.price}</span>
          </a>
        ))}
      </nav>

      {/* ---------- The three consumer plans ---------- */}
      <div className="mt-8 grid items-start gap-4 sm:grid-cols-3">
        {/* Free */}
        <section
          id="plan-free"
          className="order-2 h-full scroll-mt-24 rounded-3xl bg-shell p-5 ring-1 ring-night/10 sm:order-none"
        >
          <h2 className="text-sm font-bold text-night/60">חינם</h2>
          <p className="mt-1 text-3xl font-black text-night">
            0 ₪<span className="text-sm font-semibold text-night/50"> / לתמיד</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-night/65">
            כל התכנון עצמו. בלי כרטיס אשראי ובלי הגבלת זמן.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-night/70">
            {[
              'שיחה עם הסוכן ובניית מסלול מלא',
              'המפה, קטלוג היעדים ושכבת הכשרות',
              'קישור שיתוף לצפייה, הדפסה ו-PDF',
              'ניווט לכל יום, וייבוא מפה מ-Google My Maps',
              'להצטרף לטיול משותף של מישהו אחר, להצביע ולהציע',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-0.5 text-night/35">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          {plan === 'free' && (
            <p className="mt-5 rounded-xl bg-night/5 px-3 py-2.5 text-center text-xs font-bold text-night/55">
              התוכנית הנוכחית שלכם
            </p>
          )}
        </section>

        {/* Premium - the recommended one. order-first on a phone. */}
        <section
          id="plan-premium"
          className="relative order-1 h-full scroll-mt-24 rounded-3xl bg-night p-5 ring-2 ring-sunset sm:order-none sm:-mt-3 sm:pb-7"
        >
          <span className="absolute -top-3 end-5 rounded-full bg-zest px-3 py-1 text-xs font-black text-night">
            ★ הכי מתאים לרוב האנשים
          </span>
          <h2 className="mt-1 text-sm font-bold text-cream/70">פרימיום</h2>
          <p className="mt-1 text-3xl font-black text-cream">
            {ils(PREMIUM_PRICE_ILS)} ₪
            <span className="text-sm font-semibold text-cream/60"> / לחודש</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cream/75">
            כל מה שבחינם, ועוד הדבר האחד שאי אפשר לעשות לבד: לתכנן את הטיול עם כל מי שנוסע איתכם.
            מספיק לתכנן <b className="text-cream">טיול מלא בחודש</b>, כמה שתערכו ותשנו אותו.
          </p>
          <ul className="mt-4 space-y-2.5">
            <li className="rounded-xl bg-cream/10 p-3">
              <p className="text-sm font-bold text-cream">🤝 טיול משותף - קישור אחד</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/65">
                מצביעים על כל עצירה, כותבים למה, מציעים מקומות מהקטלוג, ומסכמים תאריכים ומי מגיע.
                לחברים זה חינם לגמרי - הם לא משלמים ולא נרשמים למנוי.
              </p>
            </li>
            <li className="rounded-xl bg-cream/10 p-3">
              <p className="text-sm font-bold text-cream">🛫 הבדיקה לפני הנסיעה כלולה</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/65">
                לכל טיול, בלי הגבלה - {priceLabel()} לטיול לכל מי שלא במנוי.
              </p>
            </li>
            <li className="rounded-xl bg-cream/10 p-3">
              <p className="text-sm font-bold text-cream">⚡ מסלול אישי מובטח לסוכן</p>
              <p className="mt-0.5 text-xs leading-relaxed text-cream/65">
                מכסות יומיות גדולות בהרבה מהחינמיות, ובלי תלות בעומס של אף אחד אחר באתר.
              </p>
            </li>
          </ul>
          {cta('premium', 'mt-5')}
        </section>

        {/* Pro */}
        <section
          id="plan-pro"
          className="order-3 h-full scroll-mt-24 rounded-3xl bg-shell p-5 ring-1 ring-night/15 sm:order-none"
        >
          <h2 className="text-sm font-bold text-night/60">פרו</h2>
          <p className="mt-1 text-3xl font-black text-night">
            {ils(PRO_PRICE_ILS)} ₪<span className="text-sm font-semibold text-night/50"> / לחודש</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-night/65">
            <b className="text-night">בדיוק מה שיש בפרימיום, עם הרבה יותר מקום לתכנן.</b> לא פיצ׳ר
            נוסף - נפח.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-night/70">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sunset-deep">✓</span>
              <span>
                <b className="text-night">
                  עד {PRO_TRIPS_PER_MONTH} טיולים מלאים בחודש
                </b>{' '}
                - עם כל השיחות והעריכות סביב כל אחד
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sunset-deep">✓</span>
              <span>
                פי 3 מהמכסות היומיות של פרימיום - שיחות, בניות מהירות, תמונות ובדיקות חיות
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sunset-deep">✓</span>
              <span>הטיול המשותף והבדיקה לפני הנסיעה - כלולים, כמו בפרימיום</span>
            </li>
          </ul>
          <p className="mt-3 rounded-xl bg-night/[0.04] px-3 py-2 text-xs leading-relaxed text-night/60">
            מי זה: מי שמארגן טיולים למשפחה ולחברים כל הזמן, מי שמתכנן מסע ארוך על פני כמה חודשים,
            או מי שפשוט נתקל בקיר בפרימיום. <b className="text-night/75">אם לא נתקלתם - אל תשדרגו.</b>
          </p>
          {cta('pro', 'mt-4')}
        </section>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-zest/15 px-4 py-3 text-center text-sm font-semibold text-night">
          {notice}
        </p>
      )}

      {/* ---------- The one-off check, kept prominent ---------- */}
      <section id="check" className="mt-10 scroll-mt-24 rounded-3xl bg-shell p-5 ring-2 ring-night/20 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="display text-2xl text-night">🛫 בדיקה לפני הנסיעה</h2>
          <p className="text-2xl font-black text-night">
            {priceLabel()}
            <span className="text-sm font-semibold text-night/50"> / לטיול אחד</span>
          </p>
          <span className="rounded-full bg-lagoon/20 px-3 py-1 text-xs font-bold text-night">
            בלי מנוי, בלי התחייבות
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-night/70">
          תכננתם לפני חודשיים, והטיול בעוד שבועיים. מה השתנה מאז? הבדיקה עונה על זה בבת אחת, על כל
          הטיול. <b className="text-night">אם אתם טסים פעם-פעמיים בשנה, זו כנראה האפשרות הנכונה
          לכם</b> - וזה בסדר גמור מבחינתנו.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ul className="space-y-1.5 text-sm text-night/70">
            {[
              'כל עצירה נבדקת מחדש מול הקטלוג',
              'רשומות הכשרות נקראות שוב',
              'סגירות, חגים ואירועים מול התאריכים שלכם',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-0.5 text-sunset-deep">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-1.5 text-sm text-night/70">
            {['בדיקת סדר הימים והמסלול', 'מסמך אחד נקי לשמור, להדפיס או לשלוח'].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-0.5 text-sunset-deep">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/chat"
            className="rounded-xl bg-night px-6 py-3 text-center font-bold text-cream transition hover:bg-night/85"
          >
            למסך הטיול שלי
          </Link>
          <p className="text-[11px] font-medium leading-relaxed text-night/50">
            נקנית מתוך מסך הטיול, החל מ-21 יום לפני היציאה
          </p>
        </div>
      </section>

      {/* ---------- The arithmetic, in the open ---------- */}
      <div className="mt-4 rounded-2xl bg-cream p-4 ring-1 ring-night/10">
        <p className="text-sm font-bold text-night">החשבון, בגלוי - מה משתלם למי:</p>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-night/70">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-night/35">•</span>
            <span>
              <b className="text-night">טסים פעם-פעמיים בשנה:</b> שתי בדיקות בודדות ={' '}
              {ils(twoChecks)} ₪ בשנה. שנה שלמה של פרימיום = {ils(yearOfPremium)} ₪.
              הבדיקות זולות בהרבה.
            </span>
          </li>
          {monthBeatsOneCheck && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sunset-deep">←</span>
              <span>
                <b className="text-night">ואפילו זול מזה:</b> חודש פרימיום עולה{' '}
                {ils(PREMIUM_PRICE_ILS)} ₪ - פחות מבדיקה אחת - והבדיקה כלולה בו. אז מי שרוצה
                רק בדיקה יכול להירשם לחודש סביב הטיול ולבטל. אנחנו אומרים את זה למרות שזה פחות כסף
                בשבילנו.
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-night/35">•</span>
            <span>
              <b className="text-night">מתכננים עם עוד אנשים:</b> פרימיום מצדיק את עצמו כבר מהטיול
              הראשון, ובחישוב בדיקות בלבד - סביב {breakEvenTripsPerYear} טיולים בשנה.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-night/35">•</span>
            <span>
              <b className="text-night">מתכננים כל הזמן:</b> פרו הוא {yearOfPro.toLocaleString('he-IL')} ₪
              בשנה, כלומר כ-{proPerTrip.toFixed(0)} ₪ לטיול מלא אם אתם באמת מנצלים אותו.{' '}
              <b className="text-night">אם אתם לא - פרימיום עדיף, והוא פי {(PRO_PRICE_ILS / PREMIUM_PRICE_ILS).toFixed(1)} יותר זול.</b>
            </span>
          </li>
        </ul>
      </div>

      {/* ---------- Travel agents: no price, a form ---------- */}
      <section
        id="agents"
        className="mt-10 scroll-mt-24 overflow-hidden rounded-3xl bg-night p-5 ring-1 ring-night sm:p-7"
      >
        <p className="text-xs font-bold text-zest">לעסקים</p>
        <h2 className="display mt-1 text-2xl text-cream sm:text-3xl">
          🧳 סוכני נסיעות ומארגני טיולים
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream/75">
          אתם מתכננים לאנשים אחרים - קבוצות, משפחות, לקוחות. זה עבודה אחרת מלתכנן טיול אחד לעצמכם,
          והתמחור אצלנו הוא <b className="text-cream">מותאם ומתומחר לפי העסק</b>: לפי כמה טיולים
          אתם מתכננים, כמה אנשים אצלכם עובדים על זה, ומה בדיוק אתם צריכים לקבל בסוף.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/15">
            <p className="text-sm font-black text-cream">🕯️ כשרות ושבת לקבוצות</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/65">
              שכבת הכשרות בקטלוג מציינת את ההשגחה כפי שדווחה, לכל מקום. זמני כניסת שבת וצאתה
              מחושבים לכל יום ולכל עיר בטיול לפי השעון המקומי, ונכנסים גם לייצוא המודפס כנספח נפרד.
              קצב שומר-שבת הוא העדפה שהסוכן מכבד בתכנון.
            </p>
          </div>
          <div className="rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/15">
            <p className="text-sm font-black text-cream">🗂️ כמה טיולי לקוחות במקביל</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/65">
              כל טיול הוא עולם משלו - מסלול, מפה, תאריכים והשיחה עם הסוכן נשמרים בנפרד לכל אחד,
              ועוברים בין הטיולים בלחיצה. אפשר גם לשכפל טיול קיים כבסיס ללקוח הבא.
            </p>
          </div>
          <div className="rounded-2xl bg-cream/10 p-4 ring-1 ring-cream/15">
            <p className="text-sm font-black text-cream">📄 משהו לשלוח ללקוח</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/65">
              ספר טיול מודפס או PDF עם תיאור לכל עצירה ונספחי שבת וכשרות, קישור צפייה שנשלח
              בוואטסאפ ונשאר מעודכן, וניווט מוכן לכל יום. ואם צריך לאסוף העדפות מהמשתתפים - קישור
              הזמנה עם הצבעות, תגובות וסקר תאריכים.
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-cream/5 px-4 py-3 text-xs leading-relaxed text-cream/70">
          <b className="text-cream">מה שכתוב כאן זה מה שקיים היום</b>, ואפשר להתחיל להשתמש בו
          מיד. מה שאין עדיין - מיתוג משלכם על הייצוא, חשבון עם כמה משתמשים, חיבור למערכות שלכם -
          זה בדיוק מה שנבנה לפי מה שתגידו לנו שאתם צריכים. בלי הבטחות למסכים שעוד לא קיימים.
        </p>

        {agentFormOpen ? (
          <div className="mt-1 rounded-2xl bg-shell p-1">
            <AgentEnquiryForm onClose={() => setAgentFormOpen(false)} />
          </div>
        ) : (
          <button
            onClick={() => setAgentFormOpen(true)}
            className="mt-5 w-full rounded-xl bg-zest px-6 py-3.5 font-black text-night transition hover:bg-zest/85 sm:w-auto sm:px-10"
          >
            דברו איתנו · נחזור אליכם עם הצעה
          </button>
        )}
      </section>

      {/* ---------- The full comparison, one tap away ----------
          A `details` and not an open grid: each plan card above already carries
          what distinguishes it, and ten rows across three columns is about a
          thousand pixels on a phone for information that is supplementary. */}
      <details className="mt-10 rounded-2xl bg-shell ring-1 ring-night/10">
        {/* No caret glyph: the shared PanelSection owns that mark, and a guard
            test enforces it. The native summary marker is what the FAQ items
            below already use. */}
        <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-night">
          השוואה מלאה בין התוכניות, שורה מול שורה
        </summary>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
          {(
            [
              { key: 'free', title: 'חינם', price: '0 ₪' },
              { key: 'premium', title: '★ פרימיום', price: `${ils(PREMIUM_PRICE_ILS)} ₪` },
              { key: 'pro', title: 'פרו', price: `${ils(PRO_PRICE_ILS)} ₪` },
            ] as const
          ).map((col) => (
            <div
              key={col.key}
              className={`rounded-2xl p-4 ring-1 ${
                col.key === 'premium' ? 'bg-cream ring-sunset/40' : 'bg-cream ring-night/10'
              }`}
            >
              <h3 className="font-bold text-night">{col.title}</h3>
              <p className="text-xs font-semibold text-night/50">{col.price}</p>
              <ul className="mt-3 space-y-2 text-xs text-night/70">
                {PLAN_FEATURE_ROWS.map((row) => (
                  <li key={row.label} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-night/30">•</span>
                    <span>
                      {row.label}: <b className="text-night/85">{row[col.key]}</b>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* ---------- The questions people actually ask before paying ---------- */}
      <div className="mt-10">
        <h2 className="display text-center text-xl text-night">שאלות שנשאלות לפני שמשלמים</h2>
        <div className="mt-4 space-y-3">
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              מה בעצם נשאר חינם?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              כמעט הכול: שיחה עם הסוכן, בניית מסלול, עריכה, המפה, קטלוג היעדים ושכבת הכשרות, קישור
              שיתוף לצפייה, הדפסה ו-PDF, וניווט לכל יום. גם להצטרף לטיול משותף של מישהו אחר,
              להצביע, להגיב ולהציע מקומות - הכול חינם. בתשלום: יצירת הטיול המשותף, והבדיקה לפני
              הנסיעה.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              מה ההבדל האמיתי בין פרימיום לפרו?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              נפח, וזהו. אין בפרו אף פיצ׳ר שאין בפרימיום - יש בו מקום לתכנן עד{' '}
              {PRO_TRIPS_PER_MONTH} טיולים מלאים בחודש במקום אחד, ומכסות יומיות גדולות פי שלושה.
              אם אתם מתכננים טיול או שניים בשנה, פרימיום הוא התוכנית שלכם ופרו הוא בזבוז כסף.
              אנחנו מעדיפים לומר את זה כאן מאשר שתגלו אחרי חודש.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              החברים שלי צריכים לשלם או להירשם?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              לא לשלם. הם כן מתחברים עם המייל שלהם (קוד חד-פעמי, בלי סיסמה) - רק כדי שנדע מי הצביע
              מה, ושכל אחד יצביע פעם אחת.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              מה קורה לטיולים שלי אם אבטל?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              כלום. הטיולים נשארים, ממשיכים להיערך ולהישלח כרגיל, והחשבון חוזר לתוכנית החינמית. מה
              שנסגר הוא יצירת טיול משותף חדש והבדיקה הכלולה.
            </p>
          </details>
          <details className="rounded-2xl bg-shell p-4 ring-1 ring-night/10">
            <summary className="cursor-pointer text-sm font-bold text-night">
              המכסות יספיקו לי?
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-night/65">
              המכסות של המנויים הן יומיות, כמו בחינם - פשוט גדולות בהרבה, ומובטחות לכם בלי תלות
              בעומס באתר. הן קיימות כדי למנוע שימוש לרעה, לא כדי לעצור מישהו באמצע תכנון - ואם
              נתקלתם בקיר בתכנון אמיתי,{' '}
              <Link href="/contact" className="font-bold text-sunset-deep underline">
                כתבו לנו
              </Link>{' '}
              וזה ייפתר.
            </p>
          </details>
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-night/45">
        התשלום מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי אשראי. את המנוי אפשר לבטל בכל רגע
        והתוכנית החינמית חוזרת לפעול כרגיל.{' '}
        <Link href="/refunds" className="underline hover:text-night/70">
          ביטולים והחזרים
        </Link>
        .
      </p>
    </div>
  );
}
