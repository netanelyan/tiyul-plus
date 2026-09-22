import type { Metadata } from 'next';
import Link from 'next/link';
import { List, Section, Sub, Updated } from '@/components/PolicySection';
import { CONTACT_EMAIL, pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = pageMetadata({
  path: '/accessibility',
  title: 'הצהרת נגישות | טיול+',
  description:
    'הצהרת הנגישות של אתר טיול+: מה הונגש, מה עדיין לא, ואיך לפנות אלינו.',
});

/*
 * This statement was written from a review of the code, not from a template.
 *
 * **The rule that decided the wording: do not claim conformance to a standard that was not
 * actually tested.** An accessibility statement is a legal document, and claiming conformance
 * to the Israeli standard without having tested it is a false declaration - more serious than
 * saying honestly that the testing has not been done yet. That is why the "what is still not
 * accessible" section exists, and why it is detailed: whatever is measurable was measured and
 * written down as numbers.
 *
 * The three details left as placeholders are declarations by a person - an accessibility
 * coordinator's name and contact details. They cannot be derived from code, and must not be
 * invented.
 */

export default function AccessibilityStatementPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-3xl text-night sm:text-4xl">הצהרת נגישות</h1>
      <p className="mt-3 leading-relaxed text-night/70">
        אנחנו בטיול+ רואים בהנגשת האתר לכלל המשתמשים והמשתמשות, לרבות אנשים עם מוגבלות, ערך חשוב.
        ההצהרה הזאת מתארת את המצב כפי שהוא היום - כולל מה שעדיין לא נגיש - ולא כפי שהיינו רוצים
        שיהיה.
      </p>

      <Section title="מה כבר קיים">
        <p>
          בפינת המסך יש <strong>כפתור נגישות</strong> שפותח לוח הגדרות. ההגדרות נשמרות בדפדפן,
          ממשיכות בין העמודים, ונטענות לפני שהעמוד מצויר כדי שלא יהיה הבהוב:
        </p>
        <List
          items={[
            <>הגדלה והקטנה של הטקסט בשבע רמות.</>,
            <>
              <strong>מצב ניגודיות גבוהה</strong> - שחור על לבן, יחס ניגודיות 21:1.
            </>,
            <>גווני אפור.</>,
            <>קו תחתון לקישורים, והדגשת קישורים.</>,
            <>ריווח שורות ואותיות מוגדל.</>,
            <>סמן עכבר מוגדל.</>,
            <>עצירת אנימציות.</>,
            <>כפתור איפוס לכל ההגדרות.</>,
          ]}
        />
        <p>
          בנוסף: האתר בנוי עברית עם כיווניות RTL מלאה, מכבד את העדפת מערכת ההפעלה להפחתת תנועה
          (<span dir="ltr">prefers-reduced-motion</span>), שדות הקלט בנויים כך שהמסך לא מזנק בטלפון
          בעת הקלדה, ולתמונות התוכן יש טקסט חלופי. כשאין תמונה למקום, מוצג ריבוע קטגוריה שהטקסט
          החלופי שלו הוא <strong>שם הקטגוריה ולא שם המקום</strong> - כדי שלא יתחזה לתצלום שאינו קיים.
        </p>

        <Sub title="מה תוקן בספטמבר 2026">
          <p>
            שלושה מהליקויים שהופיעו כאן קודם נסגרו, ושלושתם נבדקים מעכשיו אוטומטית בכל שינוי בקוד -
            כדי שלא יחזרו בעמוד הבא שייכתב:
          </p>
          <List
            items={[
              <>
                <strong>ניגודיות הטקסטים המשניים.</strong> כל דרגות העמעום נמדדו מול הרקע האמיתי:
                הן נעו בין 2.1:1 ל-4.2:1, מתחת ל-4.5 הנדרש. כולן הועלו לרצפה של{' '}
                <strong>4.88:1 לפחות</strong>, בכ-516 מקומות באתר. מי שאינו מפעיל מצב ניגודיות
                גבוהה מקבל עכשיו טקסט שעומד בדרישה בעצמו.
              </>,
              <>
                <strong>סימון מיקוד למקלדת.</strong> היה כלל לכל רכיב בנפרד, ולכן לא עקבי. עכשיו יש
                סימון אחיד לכל האתר - מסגרת בולטת סביב כל אלמנט שמקבל מיקוד מהמקלדת, בגוון שנבחר
                בנפרד לרקע הבהיר ולרקע הכהה.
              </>,
              <>
                <strong>שדות בלי תווית.</strong> עשרה שדות הסתמכו על טקסט העזר שבתוכם, שנעלם ברגע
                שמתחילים להקליד ואינו נקרא על ידי קורא מסך כתווית. לכולם נוספה תווית של ממש.
              </>,
              <>
                <strong>צבע ההדגשה הכתום.</strong> הוא עמד על 2.9:1 בשני התפקידים שלו - טקסט קרם
                על כפתור כתום, וכתום כצבע קישור - וגם כסימון המיקוד, מתחת ל-3.0 הנדרש שם. הגוון
                הועמק ל-4.99:1 בשני התפקידים. <strong>בפסי הרקע הכהים היחס מתהפך</strong>, ולכן שם
                נשאר הכתום הבהיר, שעומד מולם על 5.05:1.
              </>,
            ]}
          />
        </Sub>
      </Section>

      <Section title="מה עדיין לא נגיש">
        <p>
          זה החלק שחשוב לנו לומר במפורש. נכון להיום ידועות לנו המגבלות האלה, והן בטיפול:
        </p>
        <List
          items={[
            <>
              <strong>סמל המותג נשאר בגוון המקורי.</strong> קווי המטוס והסימן + בלוגו הם חלק מסמל
              המותג, ותקני הנגישות פוטרים לוגו מדרישת הניגודיות במפורש. לכן הם נשארו בכתום הבהיר
              ולא הועמקו - החלטה, לא פספוס. אין בהם מידע שאינו מופיע גם בטקסט שלצידם.
            </>,
            <>
              <strong>הסיכות שעל המפה אינן נגישות במקלדת.</strong> כל המידע שבסיכה מופיע גם ברשימת
              המקומות ובכרטיסי הימים, שהם כן נגישים, אבל המפה עצמה אינה תחליף.
            </>,
            <>
              <strong>לא נערכה בדיקת נגישות פורמלית.</strong> האתר לא נבדק על ידי מורשה נגישות ולא
              נבדק מקצה לקצה עם קורא מסך.
            </>,
          ]}
        />
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          <strong>לכן איננו מצהירים על עמידה בתקן.</strong> תקנות שוויון זכויות לאנשים עם מוגבלות
          מפנות לתקן הישראלי ת״י 5568, המבוסס על <span dir="ltr">WCAG 2.0</span> ברמה AA. אנחנו
          פועלים לכיוון הזה, וכשתיערך בדיקה מסודרת נכתוב זאת כאן עם תאריך. הצהרת עמידה בתקן בלי
          בדיקה היא הצהרה לא נכונה, ולא ניתן אותה.
        </p>
      </Section>

      <Section title="יצירת קשר בנושא נגישות">
        <p>נתקלתם בבעיה, או יש לכם הצעה לשיפור? נשמח לשמוע, וזה באמת עוזר לנו לתקן.</p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          רכז/ת הנגישות: <strong>נתנאל יאנצ&rsquo;בסקי</strong>. מייל:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            dir="ltr"
            className="inline-block font-bold text-sunset-deep hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          . טלפון:{' '}
          <a href="tel:+972515310498" dir="ltr" className="inline-block font-bold text-sunset-deep hover:underline">
            +972-51-531-0498
          </a>
          . אנחנו משתדלים לענות תוך <strong>עד 7 ימי עסקים</strong>.
        </p>
        <p className="text-sm text-night/70">
          פניות בנושאים אחרים - בעמוד{' '}
          <Link href="/contact" className="font-bold text-sunset-deep hover:underline">
            יצירת קשר
          </Link>
          .
        </p>
      </Section>

      <Section title="פרטי ההצהרה">
        <p className="text-sm text-night/70">
          ההצהרה נכתבה על סמך בדיקה של רכיבי האתר, ותעודכן ככל שנרחיב את הנגישות. לא נערכה עדיין
          בדיקת נגישות פורמלית, ולכן לא מצוין כאן תאריך בדיקה - כשתיערך, יופיע כאן התאריך ושם מי
          שערך אותה.
        </p>
      </Section>

      <Updated date="22 בספטמבר 2026" />

      <Link href="/" className="mt-6 inline-block font-bold text-sunset-deep hover:underline">
        ← חזרה לדף הבית
      </Link>
    </div>
  );
}
