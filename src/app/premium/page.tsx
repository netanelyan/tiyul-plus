import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'מחירים | טיול+',
  description:
    'התכנון בטיול+ חינם. בדיקה לפני הנסיעה - 29.90 ₪ לטיול, ולמנויים: סיפור הטיול, טיול משותף עם חברים והבדיקה כלולה.',
  // האתר עצמו עוד לא הושק - אין טעם שהעמוד יצטבר בתוצאות חיפוש עד
  // שיש תנועה אמיתית. הסרה קלה: למחוק את השורה הזאת בהשקה.
  robots: { index: false, follow: true },
};

export default function PremiumPage() {
  return <PremiumClient />;
}
