/**
 * אבני הבניין של עמודי המדיניות (פרטיות, תנאים, עוגיות, שותפים...).
 *
 * ## למה יש כאן רכיב `Gap` ולמה הוא צועק
 *
 * העמודים האלה נכתבו מתוך ביקורת קוד, ובכמה מקומות הביקורת הגיעה לגבול
 * שלה: מה ספק שלישי עושה עם מידע, כמה זמן ספק אחסון שומר לוגים, מה
 * הוחלט על תקופת שמירה. הפיתוי הוא לכתוב שם משפט סביר.
 *
 * **משפט סביר במדיניות פרטיות הוא הצהרה משפטית, ומשפט סביר שאינו נכון
 * הוא הפרה.** לכן פער מסומן ונראה כמו פער - צהוב, ממוסגר, עם השאלה
 * המדויקת בתוכו - ולא מתחזה לתוכן. מי שקורא את העמוד רואה מיד מה עוד
 * לא הוכרע, וקל למצוא את כל אלה לפני פרסום.
 */

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-night">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed text-night/75">{children}</div>
    </section>
  );
}

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-bold text-night/90">{title}</h3>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}

/** רשימה - `list-inside` כדי שהתבליט יישאר בצד הנכון ב-RTL */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 ps-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * פער ידוע. `kind` קובע מי צריך לסגור אותו:
 * - `fill`   - נתנאל ממלא פרט (טלפון, כתובת, תאריך).
 * - `verify` - צריך לברר עובדה מחוץ לקוד לפני שאפשר לכתוב אותה.
 */
export function Gap({ kind = 'fill', children }: { kind?: 'fill' | 'verify'; children: React.ReactNode }) {
  const label = kind === 'fill' ? '[למילוי]' : '[לבירור]';
  return (
    <p className="rounded-xl bg-zest/10 p-3 text-sm leading-relaxed text-night/80 ring-1 ring-zest/40">
      <span className="font-bold text-night">{label}</span> {children}
    </p>
  );
}

/** תאריך העדכון בתחתית כל עמוד מדיניות */
export function Updated({ date }: { date: string }) {
  return <p className="mt-10 text-sm text-night/50">עודכן לאחרונה: {date}</p>;
}
