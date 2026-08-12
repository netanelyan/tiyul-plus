import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { Gap, Section, Updated } from '@/components/PolicySection';

export const metadata = {
  title: 'יצירת קשר | טיול+',
  description: 'איך ליצור איתנו קשר - שאלות, תקלות, פניות בנושא פרטיות ונגישות.',
};

export default function Page() {
  return (
    <PageShell title="יצירת קשר">
      <p>
        נשמח לשמוע - שאלה, תקלה, מקום שחסר בקטלוג, או משהו שלא נראה לכם נכון. אנחנו קוראים הכול.
      </p>

      <Section title="פרטים">
        <Gap kind="fill">
          כאן צריכים להיכנס הפרטים האמיתיים, ורצוי לפני פרסום העמודים המשפטיים - כמה מהם מפנים
          לכאן: כתובת אימייל כללית, כתובת נפרדת לפניות פרטיות ומחיקת מידע (או ציון שהיא אותה
          כתובת), הזהות המשפטית שמאחורי השירות ומספר העוסק או החברה, וכתובת למשלוח דואר אם נדרשת.
        </Gap>
      </Section>

      <Section title="נושאים שמגיעים לכאן">
        <p>
          <strong>פרטיות ומחיקת מידע.</strong> בקשה לעיין במידע שנשמר עליכם, לתקן אותו או למחוק
          אותו, וכן מחיקת חשבון - הכול דרך הכתובת שלמעלה. הפירוט המלא ב
          <Link href="/privacy" className="font-bold text-sunset-deep hover:underline">
            מדיניות הפרטיות
          </Link>
          .
        </p>
        <p>
          <strong>נגישות.</strong> נתקלתם בקושי להשתמש באתר - זה חשוב לנו לדעת. פרטי רכז הנגישות
          נמצאים ב
          <Link href="/accessibility" className="font-bold text-sunset-deep hover:underline">
            הצהרת הנגישות
          </Link>
          .
        </p>
        <p>
          <strong>תוכן בקטלוג.</strong> מקום שנסגר, השגחת כשרות שהשתנתה, פרט שגוי. תיקונים כאלה
          נכנסים ישירות לקטלוג ומשפרים את התכנון לכולם.
        </p>
      </Section>

      <Section title="למה לא לפנות אלינו">
        <p>
          <strong>להזמנות.</strong> איננו סוכנות נסיעות ואיננו מוכרים או מזמינים דבר. הזמנה שביצעתם
          אצל ספק חיצוני נמצאת אצלו בלבד, ואנחנו לא יכולים לראות אותה, לשנות אותה או לבטל אותה.
        </p>
      </Section>

      <Updated date="11 באוגוסט 2026" />
    </PageShell>
  );
}
