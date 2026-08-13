import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'טיול+ פרימיום - מסלול אישי לסוכן החכם',
  description:
    'שדרוג לטיול+ פרימיום: מסלול אישי מובטח לסוכן החכם, חבילה חודשית לטיול-שניים מלאים, ובדיקה לפני הנסיעה כלולה בלי הגבלה.',
  // התשלום עדיין לא פעיל (ראו PremiumClient.tsx) והאתר עצמו עוד לא
  // מוכר לאף אחד - אין טעם שהעמוד הזה יצטבר בתוצאות חיפוש לפני שיש
  // בו מה לקנות בפועל. הסרה קלה: למחוק את השורה הזאת כשההרשמה תיפתח.
  robots: { index: false, follow: true },
};

export default function PremiumPage() {
  return <PremiumClient />;
}
