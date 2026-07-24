import Link from 'next/link';

export const metadata = {
  title: 'הצהרת נגישות | טיול+',
  description: 'הצהרת הנגישות של אתר טיול+ ופרטי יצירת קשר לפניות בנושא נגישות.',
};

// TODO(Netanel): למלא פרטים אמיתיים לפני פרסום רשמי - שם רכז/ת נגישות,
// כתובת אימייל/טלפון אמיתית, ותאריך בדיקה/עדכון אחרון. הניסוח כאן הוא
// שלד כן בלבד; אין לטעון עמידה בתקן שלא נבדקה בפועל.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-night">{title}</h2>
      <div className="mt-2 space-y-2 leading-relaxed text-night/75">{children}</div>
    </section>
  );
}

export default function AccessibilityStatementPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl text-night sm:text-4xl">הצהרת נגישות</h1>
      <p className="mt-3 leading-relaxed text-night/60">
        אנחנו בטיול+ רואים בהנגשת האתר לכלל המשתמשים והמשתמשות, לרבות אנשים עם
        מוגבלות, ערך חשוב. אנו פועלים לשיפור מתמשך של הנגישות באתר.
      </p>

      <Section title="מה עשינו עד כה">
        <p>
          האתר כולל ווידג'ט נגישות (הכפתור בפינת המסך) המאפשר: הגדלת והקטנת טקסט,
          מצב ניגודיות גבוהה, גווני אפור, קו תחתון והדגשה לקישורים, ריווח שורות
          ואותיות מוגדל, סמן עכבר מוגדל ועצירת אנימציות. ההעדפות נשמרות בדפדפן
          וממשיכות בין העמודים.
        </p>
        <p>
          האתר בנוי בעברית עם כיווניות RTL מלאה, ומכבד גם את העדפת מערכת ההפעלה
          להפחתת תנועה (prefers-reduced-motion).
        </p>
      </Section>

      <Section title="בהמשך הדרך">
        <p>
          הנגשת האתר היא תהליך מתמשך. אנו ממשיכים לבדוק ולשפר רכיבים כמו ניווט
          מקלדת מלא, טקסט חלופי לכל התמונות, ותאימות לקוראי מסך. ייתכן שחלקים
          מסוימים באתר עדיין אינם נגישים במלואם - נשמח לשמוע על כל תקלה.
        </p>
      </Section>

      <Section title="יצירת קשר בנושא נגישות">
        <p>
          נתקלתם בבעיה, או יש לכם הצעה לשיפור הנגישות? נשמח שתעדכנו אותנו:
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          {/* TODO(Netanel): להחליף בפרטים אמיתיים */}
          רכז/ת נגישות: <span className="font-semibold">[למילוי]</span>
          <br />
          אימייל: <span className="font-semibold">[למילוי]</span>
          <br />
          טלפון: <span className="font-semibold">[למילוי]</span>
        </p>
      </Section>

      <Section title="פרטי ההצהרה">
        <p className="text-sm text-night/60">
          {/* TODO(Netanel): לעדכן בתאריך בדיקה אמיתי */}
          תאריך עדכון אחרון של ההצהרה: <span className="font-semibold">[למילוי]</span>. הצהרה זו
          תעודכן ככל שנרחיב ונבדוק את נגישות האתר.
        </p>
      </Section>

      <Link href="/" className="mt-10 inline-block font-bold text-sunset-deep hover:underline">
        ← חזרה לדף הבית
      </Link>
    </div>
  );
}
