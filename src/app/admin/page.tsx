import type { Metadata } from 'next';
import AdminClient from './AdminClient';

/**
 * אזור הניהול. אין כאן שום גייט בצד השרת של Next בכוונה - העמוד הזה
 * סטטי ולא נושא שום מידע: הכל נטען מנתיבי /api/admin/*, וכל אחד מהם
 * מאמת את התפקיד מול הדאטהבייס בעצמו. מי שאין לו הרשאה יראה מסך
 * "לא נמצא" ולא יקבל אף בייט של דאטה.
 */
export const metadata: Metadata = {
  title: 'ניהול | טיול+',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
