import type { ReactNode } from 'react';

/**
 * הכותרת של בלוק בתחתית מסך הטיול - **אובייקט אחד, לא חמישה דומים**.
 *
 * ## למה זה קיים
 *
 * חמישה בלוקים יושבים אחד מתחת לשני שם: מה קורה בתאריכים, מה עוד חסר,
 * כמה מוציאים ביום, הסיכות שלכם, וכל הימים. הם נכתבו בחמישה סשנים
 * שונים, וכל אחד המציא לעצמו כותרת - ולכן אחד מהם קיבל אימוג׳י והשאר
 * לא, אחד קיבל רקע אפור בלי מסגרת והשאר לבן עם מסגרת, ואותו חץ ▾ הופיע
 * בשלושה גדלים. בצילום מסך זה נראה כמו שלוש מערכות עיצוב על מסך אחד.
 *
 * העיצוב לא היה שגוי באף אחד מהם בנפרד. **ההבדל בין אחים הוא הבאג**,
 * ולכן התיקון הוא לא ליישר את שלושתם ביד - זה מחזיק עד הבלוק הבא
 * שמישהו יוסיף - אלא להוציא את הכותרת לרכיב אחד שאי אפשר לסטות ממנו
 * בלי לערוך אותו.
 *
 * ## מה קבוע ומה לא
 *
 * **הפס העליון קבוע לחלוטין**: מסגרת, רקע, רדיוס, ריפוד, גודל האייקון,
 * משקל הטקסט וגודל החץ. הוא הדבר שהעין משווה כשהבלוקים סגורים, וזה
 * בדיוק המצב שבו הבעיה נראתה.
 *
 * **הגוף נשאר של כל בלוק**, ויושב מתחת לפס ולא בתוכו - `bg-shell` על
 * `bg-shell` הוא הבדל של שלושה ערכי צבע ולא נראה בעין, כך שכרטיסים
 * מקוננים היו נמרחים לגוש אחד. `PanelBody` הוא העטיפה לגוף שהוא טקסט
 * רציף; בלוק שהגוף שלו כבר רשימת כרטיסים לא צריך אותה.
 *
 * ## אייקון הוא חובה ולא אופציה
 *
 * `icon` הוא פרמטר נדרש בכוונה. אימוג׳י אחד מתוך חמישה הוא בדיוק
 * המצב שנתנאל צילם, ושדה אופציונלי היה מזמין אותו בחזרה.
 */

/** מסומן `aria-hidden` - האימוג׳י הוא קישוט, השם הנגיש הוא הכותרת */
function Head({
  icon,
  title,
  meta,
  badge,
  caret,
  open,
}: {
  icon: string;
  title: string;
  meta?: ReactNode;
  badge?: ReactNode;
  caret: boolean;
  open?: boolean;
}) {
  return (
    <>
      <span data-panel-icon aria-hidden className="text-base leading-none">
        {icon}
      </span>
      <span data-panel-label className="text-sm font-bold text-night">
        {title}
      </span>
      {badge}
      {meta && (
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-night/45">{meta}</span>
      )}
      {caret && (
        <span
          data-panel-caret
          aria-hidden
          className={`ms-auto text-xs text-night/40 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      )}
    </>
  );
}

const BAR =
  'flex w-full items-center gap-2 rounded-2xl bg-shell px-4 py-3 text-start ring-1 ring-night/10';

export default function PanelSection({
  panelKey,
  icon,
  title,
  meta,
  badge,
  ariaLabel,
  open,
  onToggle,
  className = '',
  children,
}: {
  /** מזהה יציב לבדיקות - מאפשר להשוות אחים בדפדפן ולא במקור */
  panelKey: string;
  icon: string;
  title: string;
  /** שורת משנה שקטה לצד הכותרת (למשל טווח המחירים) */
  meta?: ReactNode;
  /** תג קטן אחרי הכותרת (למשל "1 פתוחים") */
  badge?: ReactNode;
  ariaLabel?: string;
  /** מוגדר = הבלוק מתקפל. לא מוגדר = הגוף תמיד גלוי ואין חץ */
  open?: boolean;
  onToggle?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const collapsible = typeof open === 'boolean' && !!onToggle;

  return (
    <section data-panel={panelKey} aria-label={ariaLabel} className={`mt-4 ${className}`}>
      {collapsible ? (
        <button
          type="button"
          data-panel-head
          onClick={onToggle}
          aria-expanded={open}
          className={`${BAR} transition hover:ring-night/20`}
        >
          <Head icon={icon} title={title} meta={meta} badge={badge} caret open={open} />
        </button>
      ) : (
        <div data-panel-head className={BAR}>
          <Head icon={icon} title={title} meta={meta} badge={badge} caret={false} />
        </div>
      )}

      <div className={collapsible && !open ? 'hidden' : 'mt-2 block'}>{children}</div>
    </section>
  );
}

/** גוף רגיל: כרטיס יחיד מתחת לפס, באותה שפה כמו הפס עצמו */
export function PanelBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-shell p-4 ring-1 ring-night/10 ${className}`}>{children}</div>
  );
}
