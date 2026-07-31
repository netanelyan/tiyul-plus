import PageShell from '@/components/PageShell';

/*
 * TODO(Netanel): התוכן של העמוד הזה נכתב על ידך.
 * כשהוא ייכתב, יש גם:
 *   1. להוסיף `description` ל-metadata (כרגע נופל לתיאור הכללי של האתר).
 *   2. **להסיר את `robots.index: false`** - העמוד חסום מאינדוקס בכוונה
 *      כל עוד הוא ריק, כדי שגוגל לא יאנדקס עמוד מדיניות בלי מדיניות.
 */
export const metadata = {
  title: 'אודות | טיול+',
  robots: { index: false, follow: true },
};

export default function Page() {
  return <PageShell title="אודות" />;
}
