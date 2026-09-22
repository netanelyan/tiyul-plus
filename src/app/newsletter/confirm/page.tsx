import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import NewsletterAction from '@/components/NewsletterAction';
import { pageMetadata } from '@/lib/seo/site';

/**
 * `robots: noindex` - this page is only ever reached from a link in an email,
 * it says nothing to anybody who has not been sent one, and a search result
 * leading here would be a dead end.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    path: '/newsletter/confirm',
    title: 'אישור הרשמה לעדכונים | טיול+',
    description: 'אישור ההרשמה לרשימת העדכונים של טיול+.',
  }),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <PageShell title="אישור ההרשמה">
      <NewsletterAction mode="confirm" />
    </PageShell>
  );
}
