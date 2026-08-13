import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'מחירים | טיול+',
  description:
    'התכנון בטיול+ חינם. בדיקה לפני הנסיעה - 29.90 ₪ לטיול, ולמי שמתכנן כל הזמן יש מנוי חודשי עם הבדיקה כלולה.',
  // ההרשמה למנוי עדיין לא פעילה (ראו PremiumClient.tsx) והאתר עצמו
  // עוד לא מוכר לאף אחד - אין טעם שהעמוד יצטבר בתוצאות חיפוש עד שיש
  // בו מה לקנות במלואו. הסרה קלה: למחוק את השורה הזאת בהשקה.
  robots: { index: false, follow: true },
};

export default function PremiumPage() {
  return <PremiumClient />;
}
