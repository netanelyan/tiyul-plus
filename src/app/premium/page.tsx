import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'טיול+ פרימיום - תכנון בלי מכסות',
  description:
    'שדרוג לטיול+ פרימיום: מכסה חודשית נדיבה, בדיקה לפני הנסיעה כלולה בלי הגבלה, ועוד בניות מסלול, ייבוא מפות ושיתופים.',
  // התשלום עדיין לא פעיל (ראו PremiumClient.tsx) והאתר עצמו עוד לא
  // מוכר לאף אחד - אין טעם שהעמוד הזה יצטבר בתוצאות חיפוש לפני שיש
  // בו מה לקנות בפועל. הסרה קלה: למחוק את השורה הזאת כשההרשמה תיפתח.
  robots: { index: false, follow: true },
};

export default function PremiumPage() {
  return <PremiumClient />;
}
