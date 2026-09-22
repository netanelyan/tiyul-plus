import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import NewsletterAction from '@/components/NewsletterAction';
import { pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = {
  ...pageMetadata({
    path: '/newsletter/unsubscribe',
    title: 'הסרה מרשימת התפוצה | טיול+',
    description: 'הסרת כתובת המייל מרשימת העדכונים של טיול+.',
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <PageShell title="הסרה מרשימת התפוצה">
      <NewsletterAction mode="unsubscribe" />
      <p className="mt-4 text-sm text-night/65">
        אין צורך בחשבון ואין צורך להסביר. אם הקישור לא עובד מסיבה כלשהי -{' '}
        <Link href="/contact" className="font-bold text-sunset-deep hover:underline">
          כתבו לנו
        </Link>{' '}
        ונסיר את הכתובת ידנית.
      </p>
    </PageShell>
  );
}
