import Link from 'next/link';

/**
 * שלד לעמודי התוכן של האתר (תנאים, פרטיות, אודות, צור קשר...).
 *
 * **הוא מכיל כותרת ומבנה בלבד, ובכוונה אין בו שום תוכן.** נתנאל כותב את
 * הטקסט של כל אחד מהעמודים האלה בעצמו; שלד שמגיע עם נוסח "לדוגמה" הוא
 * בדיוק הדבר שגורם לטקסט משפטי גנרי להישאר באתר עד שמישהו נתבע.
 *
 * מה שכן מובטח כאן: הכיווניות, הטיפוגרפיה, הרוחב, הקישור חזרה, ושהעמוד
 * ייראה כמו שאר האתר ברגע שיהיה בו תוכן.
 */
export default function PageShell({
  title,
  children,
}: {
  title: string;
  /** התוכן שנתנאל יכתוב. ריק = מוצג מצב "עדיין לא נכתב". */
  children?: React.ReactNode;
}) {
  const empty = children === undefined || children === null || children === false;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl text-night sm:text-4xl">{title}</h1>

      {empty ? (
        /*
          מצב "עדיין לא נכתב", מסומן בבירור.
          הוא נראה כמו מציין מקום ולא כמו תוכן - אף אחד לא יטעה לחשוב
          שזו המדיניות, וקל לראות מרשימת העמודים מה עוד חסר.
        */
        <p className="mt-6 rounded-2xl bg-shell p-5 text-sm font-semibold leading-relaxed text-night/45 ring-1 ring-dashed ring-night/15">
          [למילוי] תוכן העמוד הזה עדיין לא נכתב.
        </p>
      ) : (
        <div className="mt-4 space-y-3 leading-relaxed text-night/75">{children}</div>
      )}

      <Link href="/" className="mt-10 inline-block font-bold text-sunset-deep hover:underline">
        ← חזרה לדף הבית
      </Link>
    </div>
  );
}
