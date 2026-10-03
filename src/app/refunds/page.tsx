import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { Gap, Section, Updated } from '@/components/PolicySection';
import { pageMetadata } from '@/lib/seo/site';
import { ils } from '@/lib/plans';
import { priceLabel as checkPriceLabel } from '@/lib/predeparture';
import { TRIP_PASS_DAYS, TRIP_PASS_PRICE_ILS } from '@/lib/tripPass';

/**
 * Cancellations and refunds.
 *
 * **Every price and duration here is computed from the same constants the
 * product is sold from** - `TRIP_PASS_PRICE_ILS`, `TRIP_PASS_DAYS` and the
 * pre-departure check's own `priceLabel`. A refunds page that quotes a price by
 * hand is a legal document that goes stale silently, which is precisely how the
 * homepage ended up advertising a retired plan for six days.
 *
 * The trip pass was missing from this page entirely until 2026-10-03: it has
 * been on sale since the monthly plan was retired, and a consumer page that
 * omits a product we actively sell is a real gap rather than a tidiness one.
 */
export const metadata: Metadata = pageMetadata({
  path: '/refunds',
  title: 'ביטולים והחזרים | טיול+',
  description:
    'מה אפשר לרכוש בטיול+ היום - בדיקה לפני הנסיעה, כרטיס טיול חד-פעמי ומנוי פרו - תנאי הביטול וההחזר של כל אחד, ומה קורה בהזמנות אצל ספקים חיצוניים.',
});

export default function Page() {
  return (
    <PageShell title="ביטולים והחזרים">
      <p className="rounded-2xl bg-shell p-4 text-lg leading-relaxed ring-1 ring-night/10">
        <strong>שלושה דברים נמכרים באתר</strong>: ״בדיקה לפני הנסיעה״ ({checkPriceLabel()}),
        ״כרטיס טיול״ ({ils(TRIP_PASS_PRICE_ILS)} ₪) - שתיהן רכישות חד-פעמיות לטיול ספציפי,
        בלי חיוב חוזר - ומנוי פרו, שהוא חיוב חודשי מתמשך. הכול נסלק דרך PayPal, ואנחנו לא
        רואים ולא מחזיקים פרטי אמצעי תשלום. כל שאר השימוש בטיול+ חינמי.
      </p>

      <Section title="בדיקה לפני הנסיעה - מה קורה אחרי שמשלמים">
        <p>
          תשלום חד-פעמי לטיול ספציפי, מאובטח דרך PayPal - אנחנו לא רואים ולא שומרים פרטי כרטיס.
          הגישה לדוח נפתחת ברגע שהתשלום מאומת אצלנו, לרוב תוך כמה שניות.{' '}
          <strong>אותה בדיקה בדיוק כלולה בכרטיס טיול ובמנוי פרו</strong>, בלי תשלום נוסף - כך
          שאם כבר יש לכם אחד מהם, אין סיבה לקנות אותה בנפרד.
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          <strong>הדוח נוצר ונפתח לצפייה מיד עם אישור התשלום</strong> - בפועל תוך כמה שניות. ברגע
          שהדוח נוצר, השירות סופק במלואו, ואיננו מציעים החזר עבורו. אם התשלום נכשל, לא הושלם, או
          שנגבה בטעות פעמיים עבור אותה בדיקה - נחזיר את הסכום במלואו.
        </p>
        <p className="text-sm text-night/70">
          המדיניות הזאת חלה <strong>רק ככל שהדין המחייב מתיר זאת</strong>. חוק הגנת הצרכן מקנה
          לצרכנים זכות ביטול בעסקאות מכר מרחוק שאי אפשר להתנות עליה בחוזה - ובמידה שהחוק מקנה לכם
          זכות ביטול או החזר שאינה תלויה באמור למעלה, הזכות הזאת עומדת לכם במלואה.
        </p>
      </Section>

      {/*
        Between the check and the subscription, so the page follows the same
        ladder the pricing page does: check -> pass -> pro. The pass is legally
        the same shape as the check (a one-off distance purchase, not a
        continuing transaction), which is why its section mirrors that one and
        not the subscription's.
      */}
      <Section title="כרטיס טיול - מה קורה אחרי שמשלמים">
        <p>
          תשלום <strong>חד-פעמי</strong> לטיול אחד, {ils(TRIP_PASS_PRICE_ILS)} ₪, שפותח את
          הטיול המשותף ואת הבדיקה לפני הנסיעה לאותו טיול, ופעיל {TRIP_PASS_DAYS} יום.
          הגישה נפתחת ברגע שהתשלום מאומת אצלנו.
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          <strong>אין מה לבטל, וזה לא ניסוח יפה - זאת העובדה.</strong> הכרטיס אינו מנוי: הוא לא
          מתחדש, לא ייגבה ממנו תשלום נוסף, והוא נגמר מעצמו בתום {TRIP_PASS_DAYS} הימים. לכן גם
          אין עליו כפתור ״ביטול״ באזור האישי - אין חיוב חוזר שאפשר לעצור, ולא שכחנו אותו שם.
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          <strong>מתי לא מגיע החזר:</strong> הגישה נפתחת מיד עם אישור התשלום, וברגע שהשתמשתם
          בה - נפתח טיול משותף או נלקחה הבדיקה - השירות סופק. <strong>מתי כן:</strong> אם
          התשלום נכשל או לא הושלם והגישה לא נפתחה, אם נגבה חיוב כפול על אותו טיול, או אם משהו
          מצדנו מנע מכם להשתמש בכרטיס - נחזיר את הסכום במלואו. קניתם בטעות ולא השתמשתם בכלום?{' '}
          <Link href="/contact" className="font-bold text-sunset-deep hover:underline">
            כתבו לנו
          </Link>{' '}
          ונסתכל על זה לגופו.
        </p>
        <p>
          קניתם כרטיס שני בזמן שהראשון עדיין פעיל - <strong>הימים מצטברים ולא מתאפסים</strong>,
          כך שלא נעלם לכם זמן ששילמתם עליו. ואם כבר יש לכם מנוי פעיל שכולל את הכול, המערכת
          מסרבת למכור לכם כרטיס מלכתחילה, במקום לקחת כסף על משהו שכבר יש לכם.
        </p>
        <p className="text-sm text-night/70">
          המדיניות הזאת חלה <strong>רק ככל שהדין המחייב מתיר זאת</strong>. כרטיס טיול הוא עסקת
          מכר מרחוק לפי חוק הגנת הצרכן, ולחוק יש הוראות ביטול והחזר שאי אפשר להתנות עליהן
          בחוזה - כולל, במקרים מסוימים, הסדרים מיוחדים לאזרחים ותיקים ולאנשים עם מוגבלות. כל
          זכות כזאת עומדת לכם במלואה, ללא קשר לאמור למעלה.
        </p>
      </Section>

      <Section title="הזמנות שביצעתם דרך קישור מהאתר">
        <p>
          זה החלק שכן רלוונטי היום. כשאתם לוחצים על כפתור הזמנה, אתם עוברים לאתר של ספק חיצוני -
          לינה, טיסות, סיורים, eSIM.
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          <strong>ההזמנה היא מולם בלבד, ואנחנו לא צד לה.</strong> מדיניות הביטול, ההחזר ודמי הביטול
          הם שלהם. אנחנו לא יכולים לבטל, לשנות או להחזיר כסף על הזמנה כזאת, וגם לא לראות אותה.
          לבירור או לביטול - יש לפנות ישירות לספק, עם מספר ההזמנה שקיבלתם ממנו.
        </p>
        <p className="text-sm text-night/70">
          כדאי לקרוא את תנאי הביטול אצל הספק <strong>לפני</strong> שמזמינים, ובמיוחד בתעריפים
          מוזלים שאינם ניתנים לביטול.
        </p>
      </Section>

      <Section title="מנוי פרו - ביטול והחזר">
        <p>
          <strong>פרו הוא המנוי החודשי היחיד שנמכר היום.</strong> המנוי החודשי הקודם
          (״פרימיום״) כבר אינו נמכר, אבל מי שרכש אותו בעבר ועדיין מחויב - הסעיף הזה חל עליו
          בדיוק באותה מידה.
        </p>
        <p>
          המנוי נמכר ונגבה דרך PayPal, כחיוב חוזר חודשי.{' '}
          <strong>אפשר לבטל בכל רגע</strong>, והביטול עוצר את החיוב הבא.
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          <strong>איפה מבטלים:</strong> ב
          <Link href="/account" className="font-bold text-sunset-deep hover:underline">
            אזור האישי
          </Link>
          , בכרטיס ״הגדרות״, מתחת לתוכנית שלכם - כפתור ״ביטול המנוי״. שאלה אחת לאישור, ובזה זה
          נגמר: <strong>בלי לדבר עם נציג, בלי לנמק ובלי הצעות שכנוע</strong>. אפשר גם לבטל ישירות
          מחשבון ה-PayPal שלכם, ושתי הדרכים מובילות לאותה תוצאה.
        </p>
        <p className="rounded-xl bg-shell p-4 ring-1 ring-night/10">
          ביטול <strong>אינו מזכה בהחזר על התקופה הנוכחית</strong> שכבר שולמה ושבה השירות היה זמין
          לשימוש. עד סוף אותה תקופה המנוי ממשיך לעבוד במלואו. אם נגבה חיוב אחרי שביטלתם, או שנגבה
          חיוב כפול על אותו חודש - נחזיר אותו במלואו.
        </p>
        <p>
          הטיולים שלכם נשארים שלכם גם אחרי ביטול. מה שנסגר הוא הכלים שבתשלום - ראו את דף{' '}
          <Link href="/premium" className="font-bold text-sunset-deep hover:underline">
            המחירים
          </Link>
          .
        </p>
        <Gap>
          מעבר בין מנויים (פרימיום לפרו) נעשה אצלנו ידנית כדי למנוע חיוב כפול, ולכן צריך להחליט מה
          קורה לימים ששולמו במנוי הקודם - זיכוי יחסי, הארכה של המנוי החדש, או כלום. עד שתוכרע, אנחנו
          עושים את זה פרטנית מול כל מי שפונה.
        </Gap>
        <p className="text-sm text-night/70">
          המדיניות הזאת חלה <strong>רק ככל שהדין המחייב מתיר זאת</strong>. חוק הגנת הצרכן קובע
          הוראות מיוחדות לעסקה מתמשכת (מנוי חוזר), ובהן זכויות ביטול והחזר שאי אפשר להתנות עליהן -
          כולל, במקרים מסוימים, הסדרים מיוחדים לאזרחים ותיקים ולאנשים עם מוגבלות. כל זכות כזאת
          עומדת לכם במלואה, ללא קשר לאמור למעלה.
        </p>
      </Section>

      <Section title="שאלות">
        <p>
          כל שאלה בנושא - דרך עמוד{' '}
          <Link href="/contact" className="font-bold text-sunset-deep hover:underline">
            יצירת קשר
          </Link>
          .
        </p>
      </Section>

      <Updated date="3 באוקטובר 2026" />
    </PageShell>
  );
}
