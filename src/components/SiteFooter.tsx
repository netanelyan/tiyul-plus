import Link from 'next/link';
import Logo from '@/components/Logo';
import NewsletterSignup from '@/components/NewsletterSignup';
import {
  coverageCountsLine,
  footerCountries,
  footerDestinations,
  type FooterLink,
} from '@/lib/server/footerLinks';

/**
 * הפוטר. **רכיב שרת** - וזה לא פרט טכני:
 *
 * קישורי היעדים והמדינות כאן הם קישורים פנימיים אמיתיים, והם צריכים
 * להיות ב-HTML שהשרת מגיש כדי שיהיה להם ערך. רכיב לקוח היה גם מסתיר
 * אותם עד להידרציה וגם גורר את הקטלוג כולו לחבילת הדפדפן - בדיוק
 * המסלול שהוריד פעם 492kB לכל עמוד באתר דרך `SiteNav`.
 *
 * ## למה עמודות ולא שורות
 *
 * הגרסה הקודמת הייתה שורת קישורים ממורכזת: זה נראה כמו רשימה שנוצרה
 * מעצמה, וכל קישור נוסף החמיר את זה. עמודות עם כותרת שקטה אומרות שמישהו
 * החליט מה שייך לאן. הכותרות בגודל הכתב הקטן ובצבע דהוי - הפוטר נשאר
 * החלק השקט של העמוד, לא ניווט שני.
 *
 * ## יישור
 *
 * `text-right` על המכולה, כולל במובייל. RTL לבדו מיישר טקסט לימין, אבל
 * `text-center` שהיה כאן קודם גבר עליו - ולכן היישור נקבע במפורש ונבדק
 * בדפדפן ב-390 מול הקצה הימני האמיתי של העמודה.
 */

/** קבוצת קישורים אחת = עמודה אחת */
function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[11px] font-bold uppercase tracking-wide text-cream/40">{title}</h2>
      <ul className="mt-2 space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-xs font-semibold text-cream/70 underline-offset-2 transition hover:text-cream hover:underline"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const SITE: FooterLink[] = [
  { href: '/chat', label: 'תכנון טיול' },
  { href: '/countries', label: 'קטלוג היעדים' },
  { href: '/kosher', label: 'כשרות' },
  { href: '/about', label: 'אודות' },
  { href: '/contact', label: 'יצירת קשר' },
];

const POLICY: FooterLink[] = [
  { href: '/terms', label: 'תנאי שימוש' },
  { href: '/privacy', label: 'מדיניות פרטיות' },
  { href: '/cookies', label: 'עוגיות ונתוני שימוש' },
  { href: '/affiliate-disclosure', label: 'קישורי שותפים' },
  { href: '/refunds', label: 'ביטולים והחזרים' },
  { href: '/accessibility', label: 'הצהרת נגישות' },
];

/**
 * רשתות חברתיות. `href` ריק = מוצג כטקסט דהוי ולא כקישור שבור.
 * TODO(Netanel): למלא כתובות אמיתיות (או להסיר רשת שלא תהיה).
 */
const SOCIAL: FooterLink[] = [
  { href: '', label: 'אינסטגרם' },
  { href: '', label: 'פייסבוק' },
  { href: '', label: 'טיקטוק' },
];

export default function SiteFooter() {
  // נגזר ולא קבוע. בעמודים סטטיים זה נקבע בזמן הבילד, וכל דיפלוי מעדכן.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-night pb-8 pt-12 print:hidden">
      <div className="mx-auto max-w-6xl px-5 text-right">
        {/*
          שתי עמודות כבר בטלפון ולא רק מ-sm. ארבע רשימות בעמודה אחת הן
          31 קישורים בטור, כלומר פוטר גבוה מהמסך - "קיר" בדיוק במובן
          שביקשנו להימנע ממנו. נמדד בצילום מסך ב-390.
        */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-12">
          {/* מותג + הסתייגות הנסיעה (נשארת כאן) + הרשמה לדיוור */}
          <div className="col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2 text-lg font-bold text-cream">
              <Logo reversed className="h-6 w-6" />
              <span>
                טיול<span className="text-sunset">+</span>
              </span>
            </div>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-cream/50">
              טיול+ הוא סוכן AI שבונה מסלולים אוטומטית. תמיד כדאי לאמת שעות פתיחה, מחירים,
              זמינות וכשרות מול המקומות עצמם לפני הנסיעה.
            </p>
            <div className="max-w-sm">
              <NewsletterSignup />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Column title="האתר" links={SITE} />
          </div>
          <div className="lg:col-span-2">
            <Column title="מדיניות" links={POLICY} />
          </div>
          <div className="lg:col-span-2">
            <Column title="יעדים מובילים" links={footerDestinations} />
          </div>
          <div className="lg:col-span-2">
            <Column title="מדינות" links={footerCountries} />
          </div>
        </div>

        {/* ---------- השורה התחתונה ---------- */}
        <div className="mt-10 border-t border-cream/10 pt-5">
          {/* היקף הקטלוג, נספר מהדאטה בכל בילד */}
          <p className="text-xs font-semibold text-cream/45">{coverageCountsLine()}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream/45">
            <span>© {year} טיול+</span>
            <span aria-hidden className="text-cream/20">
              ·
            </span>
            {SOCIAL.map((s) =>
              s.href ? (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline-offset-2 transition hover:text-cream hover:underline"
                >
                  {s.label}
                </a>
              ) : (
                // בלי כתובת אמיתית: טקסט, לא קישור שמוביל לשום מקום
                <span key={s.label} className="text-cream/25" title="בקרוב">
                  {s.label}
                </span>
              ),
            )}
          </div>

          {/*
            גילוי נאות - למטה וקטן, כפי שביקש נתנאל. הוא עדיין בכל עמוד:
            מי שלוחץ על כפתור הזמנה לא בהכרח מגיע לעמוד הייעודי.
            TODO(Netanel): הנוסח הוא שלך - זה מציין מקום.
          */}
          <p className="mt-3 text-[11px] leading-relaxed text-cream/30">
            [למילוי] משפט גילוי נאות: חלק מהקישורים באתר הם קישורי שותפים, ואנחנו עשויים לקבל
            עמלה.
          </p>

          {/* BlackZ - חתימת הרשת (טריידמארק, מופיע בכל עמוד) */}
          <div className="mt-5">
            <blackz-signature></blackz-signature>
          </div>
        </div>
      </div>
    </footer>
  );
}
